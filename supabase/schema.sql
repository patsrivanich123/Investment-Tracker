-- Investment Tracker Schema
-- Run this in Supabase SQL Editor

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date            DATE    DEFAULT '2003-03-29',
  plan_start_date       DATE    DEFAULT '2026-05-15',
  goal_annual_return    NUMERIC DEFAULT 20,
  risk_free_rate        NUMERIC DEFAULT 2.5,
  usd_thb_rate          NUMERIC DEFAULT 35,
  starting_balance_thb  NUMERIC DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Accounts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color        TEXT DEFAULT '#3b82f6',
  is_active    BOOLEAN DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Weekly Snapshots ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID REFERENCES accounts(id) ON DELETE CASCADE,
  week_ending         DATE NOT NULL,
  ending_balance_thb  NUMERIC NOT NULL,
  deposit_thb         NUMERIC DEFAULT 0,
  withdrawal_thb      NUMERIC DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, week_ending)
);

-- ─── Goal Injections (future LP capital planning) ─────────────────────────────
CREATE TABLE IF NOT EXISTS goal_injections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  injection_date DATE NOT NULL,
  amount_thb    NUMERIC NOT NULL,
  label         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_injections  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- accounts
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- weekly_snapshots (access via account ownership)
CREATE POLICY "snapshots_select" ON weekly_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));
CREATE POLICY "snapshots_insert" ON weekly_snapshots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));
CREATE POLICY "snapshots_update" ON weekly_snapshots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));
CREATE POLICY "snapshots_delete" ON weekly_snapshots FOR DELETE
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));

-- goal_injections
CREATE POLICY "injections_select" ON goal_injections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "injections_insert" ON goal_injections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "injections_update" ON goal_injections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "injections_delete" ON goal_injections FOR DELETE USING (auth.uid() = user_id);

-- ─── Auto-create profile on signup ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
