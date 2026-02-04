-- Supabase RLS policy templates for key tables

-- Helper function
CREATE OR REPLACE FUNCTION can_access_org(p_user uuid, p_org uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = p_user AND om.organization_id = p_org AND om.deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE;

-- organizations: only members who are owners or super admins can update
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select orgs for members" ON organizations
  FOR SELECT USING (can_access_org(auth.uid()::uuid, id) OR EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()::uuid AND om.is_owner = true));

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can select customers" ON customers
  FOR SELECT USING (can_access_org(auth.uid()::uuid, organization_id));
CREATE POLICY "members insert customers" ON customers
  FOR INSERT WITH CHECK (can_access_org(auth.uid()::uuid, organization_id));

-- automations
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members select automations" ON automations
  FOR SELECT USING (can_access_org(auth.uid()::uuid, organization_id));
CREATE POLICY "members insert automations" ON automations
  FOR INSERT WITH CHECK (can_access_org(auth.uid()::uuid, organization_id));

-- automation_runs (append-only for most users)
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members select runs" ON automation_runs
  FOR SELECT USING (can_access_org(auth.uid()::uuid, organization_id));
CREATE POLICY "workers insert runs" ON automation_runs
  FOR INSERT WITH CHECK (can_access_org(auth.uid()::uuid, organization_id));

-- audit logs: allow insert by service role only (or specific users)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service insert audit" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "admins select audit" ON audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()::uuid AND om.role IN ('ORG_ADMIN','SUPER_ADMIN')));

-- allow super admin to select all cross-tenant dev tables
-- Example: event_logs
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev select event_logs" ON event_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()::uuid AND om.role = 'SUPER_ADMIN'));