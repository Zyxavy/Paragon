-- Widen widget_entries.entry_type CHECK to include 'journal_entry'
-- (D1 fallback storage for journal entries when MongoDB is unreachable).
-- SQLite cannot ALTER CHECK constraints, so rebuild the table.

CREATE TABLE widget_entries_new (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  widget_id    TEXT NOT NULL,
  instance_id  TEXT REFERENCES instances(id) ON DELETE CASCADE,
  entry_type   TEXT NOT NULL CHECK (entry_type IN ('checklist_state', 'log_meta', 'link_list', 'notes', 'journal_entry')),
  data         TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

INSERT INTO widget_entries_new (id, workspace_id, widget_id, instance_id, entry_type, data, created_at)
  SELECT id, workspace_id, widget_id, instance_id, entry_type, data, created_at FROM widget_entries;

DROP TABLE widget_entries;

ALTER TABLE widget_entries_new RENAME TO widget_entries;

CREATE INDEX idx_widget_entries_instance_id        ON widget_entries(instance_id);
CREATE INDEX idx_widget_entries_workspace_widget    ON widget_entries(workspace_id, widget_id);
