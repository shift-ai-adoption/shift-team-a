-- PostgreSQL is a development substitute, not the production database.
CREATE TABLE incidents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_type text NOT NULL DEFAULT 'incident' CHECK (record_type IN ('incident','faq')),
  node text NOT NULL DEFAULT '',
  output_at timestamptz,
  message text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  pattern text NOT NULL DEFAULT '未分類',
  log_line_count integer CHECK (log_line_count >= 0),
  grep_result text NOT NULL DEFAULT '',
  occurred_at timestamptz,
  occurrence_type text NOT NULL DEFAULT '',
  business_type text NOT NULL DEFAULT '',
  cause text NOT NULL DEFAULT '',
  response_action text NOT NULL DEFAULT '',
  assignee text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '未着手' CHECK (status IN ('未着手','対応中','保留','完了')),
  completed_on date,
  operation_minutes integer CHECK (operation_minutes >= 0),
  received_at timestamptz,
  first_response_at timestamptz,
  novelty text NOT NULL DEFAULT '未判定' CHECK (novelty IN ('未判定','新規','既出・再発')),
  defect text NOT NULL DEFAULT '未判定' CHECK (defect IN ('未判定','有','無')),
  related_id bigint REFERENCES incidents(id),
  source_message_id text NOT NULL DEFAULT '',
  source_text text NOT NULL DEFAULT '',
  request_key uuid NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (record_type <> 'faq' OR cause = ''),
  CHECK (first_response_at IS NULL OR (received_at IS NOT NULL AND first_response_at >= received_at)),
  CHECK (status <> '完了' OR completed_on IS NOT NULL),
  CHECK (related_id IS NULL OR related_id <> id)
);
-- No unique constraint on message contents, source message ID or occurrence time.
CREATE INDEX incidents_occurred_idx ON incidents(occurred_at);
CREATE INDEX incidents_status_idx ON incidents(status) WHERE deleted_at IS NULL;
CREATE TABLE incident_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id bigint NOT NULL REFERENCES incidents(id),
  action text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE report_drafts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id bigint NOT NULL REFERENCES incidents(id),
  incident_version integer NOT NULL,
  method text NOT NULL DEFAULT 'template',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  external_send_allowed boolean NOT NULL DEFAULT false,
  llm_log_allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_settings(id) VALUES (1);
CREATE TABLE settings_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_send_allowed boolean NOT NULL,
  llm_log_allowed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
