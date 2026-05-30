-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select"    ON profiles;
DROP POLICY IF EXISTS "profiles_insert"    ON profiles;
DROP POLICY IF EXISTS "profiles_update"    ON profiles;
DROP POLICY IF EXISTS "accounts_select"    ON accounts;
DROP POLICY IF EXISTS "accounts_insert"    ON accounts;
DROP POLICY IF EXISTS "accounts_update"    ON accounts;
DROP POLICY IF EXISTS "accounts_delete"    ON accounts;
DROP POLICY IF EXISTS "snapshots_select"   ON weekly_snapshots;
DROP POLICY IF EXISTS "snapshots_insert"   ON weekly_snapshots;
DROP POLICY IF EXISTS "snapshots_update"   ON weekly_snapshots;
DROP POLICY IF EXISTS "snapshots_delete"   ON weekly_snapshots;
DROP POLICY IF EXISTS "injections_select"  ON goal_injections;
DROP POLICY IF EXISTS "injections_insert"  ON goal_injections;
DROP POLICY IF EXISTS "injections_update"  ON goal_injections;
DROP POLICY IF EXISTS "injections_delete"  ON goal_injections;

-- Re-enable RLS (safe to run again)
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_injections  ENABLE ROW LEVEL SECURITY;

-- Recreate all policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "snapshots_select" ON weekly_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));
CREATE POLICY "snapshots_insert" ON weekly_snapshots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));
CREATE POLICY "snapshots_update" ON weekly_snapshots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));
CREATE POLICY "snapshots_delete" ON weekly_snapshots FOR DELETE
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid()));

CREATE POLICY "injections_select" ON goal_injections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "injections_insert" ON goal_injections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "injections_update" ON goal_injections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "injections_delete" ON goal_injections FOR DELETE USING (auth.uid() = user_id);

-- Recreate signup trigger (safe to run again)
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
