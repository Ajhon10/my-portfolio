CREATE TABLE content_undo (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 targets TEXT NOT NULL,
 state INTEGER NOT NULL DEFAULT 0 CHECK (state IN (0,1,2))
);
CREATE INDEX content_undo_expiry ON content_undo(expires_at);

CREATE TABLE content_undo_snapshot (
 undo_id TEXT NOT NULL REFERENCES content_undo(id) ON DELETE CASCADE,
 model TEXT NOT NULL,
 record_key TEXT NOT NULL,
 before_state TEXT NOT NULL,
 after_state TEXT,
 PRIMARY KEY (undo_id,model,record_key)
);
