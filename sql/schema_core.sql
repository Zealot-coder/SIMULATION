-- Core schema DDL (summary). Run in Supabase/Postgres to create required tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE,
  name text,
  avatar text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('SUPER_ADMIN','ORG_ADMIN','OPERATOR','VIEWER')),
  is_owner boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  source text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON events (organization_id, created_at DESC);
CREATE INDEX ON events (type, created_at DESC);

-- workflow runs
CREATE TABLE workflow_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id uuid,
  event_id uuid,
  status text,
  input jsonb,
  output jsonb,
  created_at timestamptz DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX ON workflow_runs (organization_id, created_at DESC);
CREATE INDEX ON workflow_runs (workflow_id, created_at DESC);
CREATE INDEX ON workflow_runs (status, created_at DESC);

-- run steps/logs
CREATE TABLE workflow_run_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id uuid REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_name text,
  status text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON workflow_run_logs (run_id, created_at DESC);

-- audit_logs
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id),
  action text,
  target text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ai_insights
CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  scope text,
  summary text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- indexes suggestion
CREATE INDEX ON ai_insights (organization_id, created_at DESC);
