-- 워케이션 도시 기본 데이터
INSERT OR REPLACE INTO spot_cities (key, name, flag, timezone, monthly_cost_usd, avg_wifi_mbps, note, sort_order) VALUES
  ('jeju',    '제주',        '🇰🇷', 'UTC+9', 2000, 120, '국내 워케이션 · 시차 없음',        1),
  ('busan',   '부산',        '🇰🇷', 'UTC+9', 1800, 130, '바다와 도시가 함께 · 국내',        2),
  ('bali',    '발리 (창구)', '🇮🇩', 'UTC+8', 1300,  35, '노마드 성지 · 저렴한 물가',        3),
  ('bangkok', '방콕',        '🇹🇭', 'UTC+7', 1500,  65, '한국과 시차 2시간 · 편리한 도시',  4),
  ('chiangmai','치앙마이',   '🇹🇭', 'UTC+7', 1200,  60, '조용하고 저렴 · 장기 체류 인기',    5),
  ('lisbon',  '리스본',      '🇵🇹', 'UTC+1', 2200,  88, '유럽 노마드 허브 · 좋은 날씨',     6),
  ('tokyo',   '도쿄',        '🇯🇵', 'UTC+9', 3200, 150, '시차 없음 · 인프라 최고',          7);

-- 시작용 장소 (직접 확인/보완 필요)
INSERT OR IGNORE INTO spots (name, slug, city, city_name, type, area, price_note, hours, wifi_mbps, tags) VALUES
  ('제주 워케이션 센터', 'jeju-workation-center', 'jeju', '제주', 'cowork', '제주시 노형동', '1일 15,000원 / 월 12만원', '09:00-21:00', 300, '["바다뷰","주차 가능","회의실"]'),
  ('Dojo Bali', 'dojo-bali', 'bali', '발리 (창구)', 'cowork', '창구 비치 근처', '1일 $18 / 월 $180', '24시간', 120, '["풀 있음","전화부스","24시간"]'),
  ('The Hive Thonglor', 'hive-thonglor', 'bangkok', '방콕', 'cowork', '통러', '1일 ฿400 / 월 ฿5,500', '08:00-22:00', 150, '["루프탑","샤워실","BTS 5분"]'),
  ('Second Home Lisboa', 'second-home-lisboa', 'lisbon', '리스본', 'cowork', '메르카두 다 히베이라', '1일 €25 / 월 €250', '08:00-20:00', 200, '["식물 가득","회의실","전화부스"]'),
  ('Copenhagen Coffee Lab', 'copenhagen-coffee-lisbon', 'lisbon', '리스본', 'cafe', '프린시페 헤알', '커피 €2.5~', '08:00-19:00', 45, '["빵 맛집","콘센트 적음"]'),
  ('Yellow Coworking', 'yellow-coworking-chiangmai', 'chiangmai', '치앙마이', 'cowork', '님만해민', '1일 ฿250 / 월 ฿3,500', '08:00-20:00', 90, '["조용함","정원"]');
