export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  // Allow GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token   = process.env.IBKR_FLEX_TOKEN
  const queryId = process.env.IBKR_FLEX_QUERY_ID

  if (!token || !queryId) {
    return res.status(500).json({ error: 'IBKR credentials not configured on server' })
  }

  try {
    // ── Step 1: Kick off the Flex query ──────────────────────────────────────
    const initRes  = await fetch(
      `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${token}&q=${queryId}&v=3`
    )
    const initXml  = await initRes.text()

    const status   = initXml.match(/<Status>([^<]+)<\/Status>/)?.[1]
    const refCode  = initXml.match(/<ReferenceCode>([^<]+)<\/ReferenceCode>/)?.[1]
    const fetchUrl = initXml.match(/<Url>([^<]+)<\/Url>/)?.[1]

    if (status !== 'Success' || !refCode || !fetchUrl) {
      return res.status(502).json({
        error: 'IBKR did not accept the query',
        detail: initXml.slice(0, 400),
      })
    }

    // ── Step 2: Poll for results (IBKR needs 1-3 s to generate) ─────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const delays = [2000, 1500, 1500, 1500, 1500]

    for (const delay of delays) {
      await sleep(delay)

      const dataRes = await fetch(`${fetchUrl}?q=${refCode}&t=${token}&v=3`)
      const dataXml = await dataRes.text()

      if (dataXml.includes('Processing') || dataXml.includes('<Status>Processing</Status>')) {
        continue
      }

      // ── Parse NAV ─────────────────────────────────────────────────────────
      // ChangeInNAV section → endingValue attribute
      const endingVal = dataXml.match(/endingValue="([\d.\-]+)"/)?.[1]
      // NetAssetValue section → net attribute (fallback)
      const netVal    = dataXml.match(/\bnet="([\d.\-]+)"/)?.[1]
      // Account base currency
      const currency  = dataXml.match(/\bcurrency="([A-Z]{3})"/)?.[1] ?? 'USD'

      const raw = endingVal ?? netVal
      if (!raw) {
        return res.status(502).json({
          error: 'NAV not found in IBKR response — check your Flex Query includes Change in NAV',
          snippet: dataXml.slice(0, 800),
        })
      }

      return res.status(200).json({
        nav: parseFloat(raw),
        currency,
        queriedAt: new Date().toISOString(),
      })
    }

    return res.status(504).json({ error: 'Timed out waiting for IBKR to generate the report' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
