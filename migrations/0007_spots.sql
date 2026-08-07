-- 워케이션 장소 (코워킹 / 카페)

CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,                 -- 도시 키 (bali, lisbon, bangkok, jeju ...)
  city_name TEXT,                     -- 표시용 도시명
  type TEXT DEFAULT 'cafe' CHECK(type IN ('cowork', 'cafe')),
  area TEXT,                          -- 세부 지역 (예: 창구 비치 근처)
  address TEXT,
  price_note TEXT,                    -- 가격 안내 (예: 1일 $18 / 월 $180)
  hours TEXT,                         -- 영업시간
  wifi_mbps INTEGER,                  -- 실측 속도
  tags TEXT,                          -- JSON array (예: ["24시간","전화부스"])
  map_url TEXT,
  created_by INTEGER,                 -- 등록한 사용자
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_spots_city ON spots(city);

-- 장소 후기 (항목별 1~5점)
CREATE TABLE IF NOT EXISTS spot_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  r_wifi INTEGER CHECK(r_wifi BETWEEN 1 AND 5),
  r_quiet INTEGER CHECK(r_quiet BETWEEN 1 AND 5),
  r_seat INTEGER CHECK(r_seat BETWEEN 1 AND 5),
  r_toilet INTEGER CHECK(r_toilet BETWEEN 1 AND 5),
  r_clean INTEGER CHECK(r_clean BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(spot_id, user_id)            -- 한 사람당 장소별 후기 1개
);
CREATE INDEX IF NOT EXISTS idx_reviews_spot ON spot_reviews(spot_id);

-- 도시 정보 (요약 카드용)
CREATE TABLE IF NOT EXISTS spot_cities (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  timezone TEXT,
  monthly_cost_usd INTEGER,
  avg_wifi_mbps INTEGER,
  note TEXT,
  sort_order INTEGER DEFAULT 0
);
