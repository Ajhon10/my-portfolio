-- Copy both parent and child tables before replacing them, preserving every
-- legacy chunk and URL. Dropping a referenced parent directly would cascade.
CREATE TABLE media_files_next (
 id TEXT PRIMARY KEY,
 filename TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes>0 AND bytes<=CASE WHEN content_type IN ('video/mp4','video/webm') THEN 33554432 ELSE 12582912 END),
 sha256 TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES "user"(id),
 created_at TEXT NOT NULL,
 chunk_bytes INTEGER NOT NULL DEFAULT 524288 CHECK(chunk_bytes IN (524288,1048576))
);
INSERT INTO media_files_next(id,filename,content_type,bytes,sha256,owner_id,created_at)
 SELECT id,filename,content_type,bytes,sha256,owner_id,created_at FROM media_files;
CREATE TABLE media_chunks_next (
 file_id TEXT NOT NULL REFERENCES media_files_next(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position>=0),
 bytes BLOB NOT NULL,
 PRIMARY KEY(file_id,position)
);
INSERT INTO media_chunks_next SELECT file_id,position,bytes FROM media_chunks;
DROP TABLE media_chunks;
DROP TABLE media_files;
ALTER TABLE media_files_next RENAME TO media_files;
ALTER TABLE media_chunks_next RENAME TO media_chunks;
CREATE TRIGGER media_budget BEFORE INSERT ON media_files BEGIN
 SELECT CASE WHEN (SELECT COALESCE(SUM(bytes),0) FROM media_files)+NEW.bytes>268435456 THEN RAISE(ABORT,'MEDIA_STORAGE_LIMIT') END;
END;
CREATE TRIGGER project_gallery_limit BEFORE INSERT ON project_image BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM project_image WHERE project_id=NEW.project_id)>=50 THEN RAISE(ABORT,'PROJECT_GALLERY_LIMIT') END;
END;
