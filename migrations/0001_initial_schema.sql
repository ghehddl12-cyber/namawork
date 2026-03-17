-- NomaWork Database Schema

-- 기업 테이블
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  size TEXT CHECK(size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  industry TEXT NOT NULL,
  description TEXT,
  headquarters_country TEXT NOT NULL,
  headquarters_city TEXT,
  timezone TEXT NOT NULL,
  remote_policy TEXT CHECK(remote_policy IN ('fully_remote', 'remote_first', 'hybrid', 'office_first')),
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  founded_year INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 공고 테이블
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  nice_to_have TEXT,
  remote_type TEXT NOT NULL CHECK(remote_type IN ('fully_remote', 'timezone_limited', 'hybrid')),
  contract_type TEXT NOT NULL CHECK(contract_type IN ('full_time', 'part_time', 'contract', 'freelance', 'project')),
  duration TEXT CHECK(duration IN ('short_term', 'mid_term', 'long_term', 'permanent')),
  experience_level TEXT CHECK(experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'any')),
  -- 급여 정보
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  salary_period TEXT DEFAULT 'yearly' CHECK(salary_period IN ('hourly', 'monthly', 'yearly')),
  -- 타임존 정보
  required_timezone TEXT,
  timezone_overlap_hours INTEGER DEFAULT 0,
  preferred_timezones TEXT, -- JSON array
  -- 노마드 특화 정보
  async_work_percentage INTEGER DEFAULT 50,
  monthly_meeting_count INTEGER DEFAULT 8,
  equipment_provided INTEGER DEFAULT 0,
  coworking_budget INTEGER DEFAULT 0,
  tools TEXT, -- JSON array (Slack, Notion, etc.)
  -- 기술 스택
  skills_required TEXT NOT NULL, -- JSON array
  skills_preferred TEXT, -- JSON array
  languages_required TEXT DEFAULT '["English"]', -- JSON array
  -- 상태
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  applicant_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- 타임존 마스터 테이블
CREATE TABLE IF NOT EXISTS timezones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  offset_hours REAL NOT NULL,
  utc_label TEXT NOT NULL,
  region TEXT,
  major_cities TEXT
);

-- 생활비 지수 테이블 (Numbeo 기준)
CREATE TABLE IF NOT EXISTS cost_of_living (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT NOT NULL,
  city TEXT,
  index_value REAL NOT NULL, -- 뉴욕=100 기준
  rent_index REAL,
  monthly_budget_usd INTEGER, -- 편안한 생활 예상 월 비용
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_contract_type ON jobs(contract_type);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);
