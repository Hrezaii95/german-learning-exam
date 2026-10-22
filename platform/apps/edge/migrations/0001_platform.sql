-- L3-2: personal data is keyed by user; deletion cascades and audit actors anonymise.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL, email TEXT UNIQUE, email_verified_at TEXT,
  role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0,1)),
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0,1)),
  created_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('password','email_link','google')),
  provider_subject TEXT NOT NULL, password_hash TEXT, created_at TEXT NOT NULL,
  UNIQUE(provider,provider_subject)
);
CREATE INDEX IF NOT EXISTS identities_user ON identities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS identities_one_password_per_user ON identities(user_id) WHERE provider='password';
CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT, purpose TEXT NOT NULL CHECK(purpose IN ('verify_email','login_link','reset_password')),
  expires_at TEXT NOT NULL, used_at TEXT
);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Learning device', last_sync_at TEXT,
  PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS sync_events (
  server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store TEXT NOT NULL, event_id TEXT NOT NULL, device_id TEXT NOT NULL,
  created_at TEXT NOT NULL, payload_json TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '', schema_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id,store,event_id)
);
CREATE INDEX IF NOT EXISTS sync_events_pull ON sync_events(user_id,store,server_seq);
CREATE TABLE IF NOT EXISTS sync_docs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store TEXT NOT NULL, doc_key TEXT NOT NULL, value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL, device_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1, server_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,store,doc_key)
);
CREATE INDEX IF NOT EXISTS sync_docs_pull ON sync_docs(user_id,store,server_seq);
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL DEFAULT 'momente-a1', position_lesson INTEGER, position_page INTEGER,
  join_code TEXT NOT NULL UNIQUE, leaderboard_enabled INTEGER NOT NULL DEFAULT 0 CHECK(leaderboard_enabled IN (0,1)),
  created_at TEXT NOT NULL, archived_at TEXT
);
CREATE TABLE IF NOT EXISTS class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'student' CHECK(member_role IN ('student','co_teacher')),
  joined_at TEXT NOT NULL, left_at TEXT, PRIMARY KEY(class_id,user_id)
);
CREATE INDEX IF NOT EXISTS class_members_user ON class_members(user_id,left_at);
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL, scope_json TEXT NOT NULL, skills_json TEXT NOT NULL DEFAULT '[]',
  item_count INTEGER NOT NULL DEFAULT 20, due_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assignment_progress (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_json TEXT NOT NULL, completed_at TEXT, PRIMARY KEY(assignment_id,user_id)
);
CREATE TABLE IF NOT EXISTS teacher_extras (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  pack_json TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'pending', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_pack_status (
  pack_id TEXT PRIMARY KEY, review_status TEXT NOT NULL DEFAULT 'pending',
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_log_actor ON audit_log(actor_id,created_at);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO feature_flags(key,value_json,updated_at) VALUES
  ('email_login','false','2026-10-22T00:00:00.000Z'),
  ('google_login','false','2026-10-22T00:00:00.000Z'),
  ('class_leaderboard','false','2026-10-22T00:00:00.000Z'),
  ('live_game','false','2026-10-22T00:00:00.000Z'),
  ('bonus_rounds','false','2026-10-22T00:00:00.000Z');
