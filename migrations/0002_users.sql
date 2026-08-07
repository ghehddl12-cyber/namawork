-- 사용자 테이블 (회원가입/로그인)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  current_timezone TEXT,          -- 사용자 현재 타임존 (예: UTC+9)
  preferred_timezones TEXT,       -- JSON array
  skills TEXT,                    -- JSON array
  experience_level TEXT,
  preferred_salary_min INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
