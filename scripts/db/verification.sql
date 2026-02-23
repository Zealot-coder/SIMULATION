-- 1) Prisma migrations exist
SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS migrations_ok
FROM "_prisma_migrations";

-- 2) Key tables non-empty
SELECT 'Organization' AS table_name, COUNT(*) AS row_count FROM "Organization"
UNION ALL
SELECT 'Event', COUNT(*) FROM "Event"
UNION ALL
SELECT 'Workflow', COUNT(*) FROM "Workflow"
UNION ALL
SELECT 'User', COUNT(*) FROM "User";

-- 3) RLS enabled on key tables
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('Organization', 'Event', 'Workflow', 'WorkflowExecution', 'WorkflowStep')
  AND c.relkind = 'r';

-- 4) Policies present
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('Organization', 'Event', 'Workflow', 'WorkflowExecution', 'WorkflowStep')
GROUP BY tablename;

-- 5) Org-scoped join sanity
SELECT CASE WHEN COUNT(*) >= 0 THEN 1 ELSE 0 END AS org_scope_query_ok
FROM "OrganizationMember" om
JOIN "Organization" o ON o.id = om."organizationId"
WHERE om."isActive" = true;
