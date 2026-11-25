CREATE UNIQUE INDEX auth_email_canonical ON auth(lower(email));
CREATE UNIQUE INDEX chatbot_session_active ON chatbot_conversation(session_id) WHERE deleted=0;
ALTER TABLE auth ADD COLUMN password_reset_required INTEGER NOT NULL DEFAULT 0 CHECK(password_reset_required IN (0,1));
ALTER TABLE "user" ADD COLUMN last_totp_step INTEGER;
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE auth_challenges (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, encrypted_secret TEXT NOT NULL, credential_fingerprint TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used_at TEXT);
CREATE INDEX challenge_expiry ON auth_challenges(expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
CREATE INDEX rate_window ON rate_limits(window);
CREATE TABLE media_files (id TEXT PRIMARY KEY, filename TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL, bytes INTEGER NOT NULL CHECK(bytes>0 AND bytes<=12582912), sha256 TEXT NOT NULL, owner_id TEXT NOT NULL REFERENCES "user"(id), created_at TEXT NOT NULL);
CREATE TABLE media_chunks (file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE, position INTEGER NOT NULL CHECK(position>=0), bytes BLOB NOT NULL, PRIMARY KEY(file_id,position));
CREATE TRIGGER media_budget BEFORE INSERT ON media_files BEGIN
 SELECT CASE WHEN (SELECT COALESCE(SUM(bytes),0) FROM media_files)+NEW.bytes>268435456 THEN RAISE(ABORT,'MEDIA_STORAGE_LIMIT') END;
END;
CREATE TABLE mail_outbox (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, available_at TEXT NOT NULL, delivered_at TEXT, lease_until TEXT, failed_at TEXT);
CREATE INDEX mail_pending ON mail_outbox(delivered_at,failed_at,available_at);
