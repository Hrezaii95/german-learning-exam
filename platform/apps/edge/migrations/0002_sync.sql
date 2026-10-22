-- L3-4: one monotonic cursor covers event inserts AND document updates.
CREATE TABLE IF NOT EXISTS sync_changes (
  server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('event','doc')),
  record_key TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_changes_pull ON sync_changes(user_id,store,server_seq);
INSERT INTO sync_changes(user_id,store,kind,record_key)
  SELECT user_id,store,'event',event_id FROM sync_events;
INSERT INTO sync_changes(user_id,store,kind,record_key)
  SELECT user_id,store,'doc',doc_key FROM sync_docs;
UPDATE sync_docs SET server_seq=(SELECT MAX(c.server_seq) FROM sync_changes c
  WHERE c.user_id=sync_docs.user_id AND c.store=sync_docs.store AND c.kind='doc' AND c.record_key=sync_docs.doc_key);
CREATE TRIGGER IF NOT EXISTS sync_event_change AFTER INSERT ON sync_events
BEGIN
  INSERT INTO sync_changes(user_id,store,kind,record_key) VALUES(NEW.user_id,NEW.store,'event',NEW.event_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_doc_insert_change AFTER INSERT ON sync_docs
BEGIN
  INSERT INTO sync_changes(user_id,store,kind,record_key) VALUES(NEW.user_id,NEW.store,'doc',NEW.doc_key);
  UPDATE sync_docs SET server_seq=last_insert_rowid() WHERE user_id=NEW.user_id AND store=NEW.store AND doc_key=NEW.doc_key;
END;
CREATE TRIGGER IF NOT EXISTS sync_doc_update_change AFTER UPDATE ON sync_docs
WHEN OLD.value_json<>NEW.value_json OR OLD.updated_at<>NEW.updated_at OR OLD.device_id<>NEW.device_id OR OLD.schema_version<>NEW.schema_version
BEGIN
  INSERT INTO sync_changes(user_id,store,kind,record_key) VALUES(NEW.user_id,NEW.store,'doc',NEW.doc_key);
  UPDATE sync_docs SET server_seq=last_insert_rowid() WHERE user_id=NEW.user_id AND store=NEW.store AND doc_key=NEW.doc_key;
END;

-- A duplicate event is immutable even when concurrent requests pass the preflight read.
CREATE TRIGGER IF NOT EXISTS sync_event_immutable BEFORE INSERT ON sync_events
WHEN EXISTS(SELECT 1 FROM sync_events e WHERE e.user_id=NEW.user_id AND e.store=NEW.store AND e.event_id=NEW.event_id AND e.payload_json<>NEW.payload_json)
BEGIN
  SELECT RAISE(ABORT,'conflicting_event_id');
END;
