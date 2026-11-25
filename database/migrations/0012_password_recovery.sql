CREATE TABLE password_reset_challenges (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES "user"(id),
 credential_fingerprint TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN ('email','temporary')),
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 used_at TEXT
);
CREATE INDEX password_reset_user ON password_reset_challenges(user_id,expires_at);
ALTER TABLE mail_outbox ADD COLUMN expires_at TEXT;
