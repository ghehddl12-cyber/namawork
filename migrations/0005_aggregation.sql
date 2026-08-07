-- 외부 공고 자동 수집(Aggregation)

-- 공고 출처 구분 및 원문 링크
ALTER TABLE jobs ADD COLUMN source TEXT DEFAULT 'direct';   -- direct | remoteok | wwr | himalayas
ALTER TABLE jobs ADD COLUMN source_url TEXT;                -- 원문 지원 링크
ALTER TABLE jobs ADD COLUMN external_id TEXT;               -- 출처 내 고유 ID (중복 방지)

-- 같은 출처의 같은 공고가 중복 저장되지 않도록
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_ext ON jobs(source, external_id);

-- 수집 실행 기록 (관리자 화면용)
CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  added INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ok',       -- ok | error
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_created ON sync_logs(created_at);
