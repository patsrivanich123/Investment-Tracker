export const config = { maxDuration: 15 }

async function fetchLiveRate(from, to) {
  // Yahoo Finance FX — no API key needed
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${from}${to}=X?interval=1d&range=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const json = await res.json()
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!price) throw new Error(`Could not fetch ${from}/${to} rate from Yahoo Finance`)
  return price
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token   = process.env.IBKR_FLEX_TOKEN
  const queryId = process.env.IBKR_FLEX_QUERY_ID

  if (!token || !queryId) {
    return res.status(500).json({ error: 'IBKR credentials not configured on server' })
  }

  try {
    // ── Kick off IBKR query + fetch FX rate in parallel ──────────────────────
    const [initRes, usdThbRate] = await Promise.all([
      fetch(`https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${token}&q=${queryId}&v=3`),
      fetchLiveRate('USD', 'THB').catch(() => null), // fallback gracefully
    ])

    const initXml = await initRes.text()
    const status   = initXml.match(/<Status>([^<]+)<\/Status>/)?.[1]
    const refCode  = initXml.match(/<ReferenceCode>([^<]+)<\/ReferenceCode>/)?.[1]
    const fetchUrl = initXml.match(/<Url>([^<]+)<\/Url>/)?.[1]

    if (status !== 'Success' || !refCode || !fetchUrl) {
      return res.status(502).json({
        error: 'IBKR did not accept the query',
        detail: initXml.slice(0, 400),
      })
    }

    // ── Poll for IBKR results ─────────────────────────────────────────────────
    const sleep  = ms => new Promise(r => setTimeout(r, ms))
    const delays = [2000, 1500, 1500, 1500, 1500]

    for (const delay of delays) {
      await sleep(delay)

      const dataRes = await fetch(`${fetchUrl}?q=${refCode}&t=${token}&v=3`)
      const dataXml = await dataRes.text()

      if (dataXml.includes('Processing')) continue

      const endingVal = dataXml.match(/endingValue="([\d.\-]+)"/)?.[1]
      const netVal    = dataXml.match(/\bnet="([\d.\-]+)"/)?.[1]
      const currency  = dataXml.match(/\bcurrency="([A-Z]{3})"/)?.[1] ?? 'USD'

      const raw = endingVal ?? netVal
      if (!raw) {
        return res.status(502).json({
          error: 'NAV not found in IBKR response — check your Flex Query includes Change in NAV',
          snippet: dataXml.slice(0, 800),
        })
      }

      const nav = parseFloat(raw)

      // ── Convert to THB using live rate ────────────────────────────────────
      const rate     = currency === 'THB' ? 1 : (usdThbRate ?? 35)
      const navTHB   = nav * rate

      return res.status(200).json({
        nav,
        currency,
        usdThbRate:  rate,
        navTHB,
        rateSource:  usdThbRate ? 'yahoo_live' : 'fallback_35',
        queriedAt:   new Date().toISOString(),
      })
    }

    return res.status(504).json({ error: 'Timed out waiting for IBKR to generate the report' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
