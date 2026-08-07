-- 공고 저장 / 지원 기능

-- 저장한 공고
CREATE TABLE IF NOT EXISTS saved_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_jobs(user_id);

-- 지원 내역
CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted', 'reviewing', 'accepted', 'rejected', 'withdrawn')),
  cover_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_appl_user ON job_applications(user_id);
