-- Seed Data for NomaWork

-- 타임존 데이터
INSERT OR IGNORE INTO timezones (name, offset_hours, utc_label, region, major_cities) VALUES
  ('Pacific Time', -8, 'UTC-8', 'Americas', 'Los Angeles, Vancouver, Seattle'),
  ('Mountain Time', -7, 'UTC-7', 'Americas', 'Denver, Phoenix, Calgary'),
  ('Central Time', -6, 'UTC-6', 'Americas', 'Chicago, Dallas, Mexico City'),
  ('Eastern Time', -5, 'UTC-5', 'Americas', 'New York, Toronto, Miami'),
  ('Brazil Time', -3, 'UTC-3', 'Americas', 'São Paulo, Rio de Janeiro, Buenos Aires'),
  ('UTC', 0, 'UTC+0', 'Europe', 'London, Dublin, Lisbon'),
  ('Central European Time', 1, 'UTC+1', 'Europe', 'Paris, Berlin, Madrid, Rome'),
  ('Eastern European Time', 2, 'UTC+2', 'Europe', 'Athens, Helsinki, Bucharest'),
  ('Moscow Time', 3, 'UTC+3', 'Europe', 'Moscow, Istanbul, Riyadh'),
  ('UAE Time', 4, 'UTC+4', 'Asia', 'Dubai, Abu Dhabi'),
  ('Pakistan Time', 5, 'UTC+5', 'Asia', 'Karachi, Lahore, Islamabad'),
  ('India Time', 5.5, 'UTC+5:30', 'Asia', 'Mumbai, Delhi, Bangalore, Chennai'),
  ('Bangladesh Time', 6, 'UTC+6', 'Asia', 'Dhaka, Chittagong'),
  ('Indochina Time', 7, 'UTC+7', 'Asia', 'Bangkok, Ho Chi Minh, Hanoi, Jakarta'),
  ('China Standard Time', 8, 'UTC+8', 'Asia', 'Beijing, Shanghai, Singapore, Taipei, Kuala Lumpur'),
  ('Korea Standard Time', 9, 'UTC+9', 'Asia', 'Seoul, Tokyo, Osaka, Fukuoka'),
  ('Australian Eastern Time', 10, 'UTC+10', 'Oceania', 'Sydney, Melbourne, Brisbane'),
  ('New Zealand Time', 12, 'UTC+12', 'Oceania', 'Auckland, Wellington');

-- 생활비 지수
INSERT OR IGNORE INTO cost_of_living (country, city, index_value, rent_index, monthly_budget_usd) VALUES
  ('United States', 'New York', 100, 100, 4500),
  ('United States', 'San Francisco', 105, 115, 4800),
  ('United States', 'Austin', 75, 72, 3200),
  ('United Kingdom', 'London', 88, 85, 3800),
  ('Germany', 'Berlin', 68, 55, 2800),
  ('Netherlands', 'Amsterdam', 78, 80, 3200),
  ('Portugal', 'Lisbon', 55, 48, 2200),
  ('Spain', 'Barcelona', 60, 52, 2400),
  ('Thailand', 'Bangkok', 38, 25, 1500),
  ('Thailand', 'Chiang Mai', 32, 20, 1200),
  ('Vietnam', 'Ho Chi Minh City', 30, 18, 1100),
  ('Indonesia', 'Bali', 35, 22, 1300),
  ('Mexico', 'Mexico City', 42, 28, 1600),
  ('Colombia', 'Medellin', 35, 22, 1300),
  ('South Korea', 'Seoul', 80, 72, 3000),
  ('Japan', 'Tokyo', 82, 68, 3200),
  ('Singapore', 'Singapore', 95, 110, 4000),
  ('Australia', 'Sydney', 90, 88, 3800),
  ('Canada', 'Toronto', 82, 78, 3400),
  ('Poland', 'Warsaw', 48, 38, 1900),
  ('Georgia', 'Tbilisi', 38, 25, 1400),
  ('Estonia', 'Tallinn', 55, 50, 2200);

-- 기업 데이터
INSERT OR IGNORE INTO companies (name, logo_url, website, size, industry, description, headquarters_country, headquarters_city, timezone, remote_policy, rating, review_count, founded_year) VALUES
  ('GitLab', NULL, 'https://gitlab.com', '501+', 'Software Development', '100% 원격 근무를 선도하는 DevOps 플랫폼 회사. 전 세계 65개국에 직원 보유.', 'United States', 'San Francisco (Remote-First)', 'UTC-8', 'fully_remote', 4.8, 1842, 2011),
  ('Automattic', NULL, 'https://automattic.com', '1001+', 'Technology', 'WordPress.com, WooCommerce 등을 운영하는 완전 원격 회사. 직원 100% 원격 근무.', 'United States', 'San Francisco (Remote)', 'UTC-8', 'fully_remote', 4.7, 923, 2005),
  ('Basecamp', NULL, 'https://basecamp.com', '51-200', 'Software Development', '원격 근무 문화의 선구자. "Remote" 저자 Jason Fried의 회사.', 'United States', 'Chicago', 'UTC-6', 'fully_remote', 4.6, 456, 1999),
  ('Doist', NULL, 'https://doist.com', '51-200', 'Productivity Software', 'Todoist, Twist를 만드는 비동기 원격 팀. 전 세계 35개국 팀원.', 'Portugal', 'Lisbon (Remote)', 'UTC+0', 'fully_remote', 4.9, 312, 2007),
  ('Hotjar', NULL, 'https://hotjar.com', '201-500', 'Analytics', '사용자 행동 분석 툴을 만드는 Malta 기반의 완전 원격 회사.', 'Malta', 'St Julian''s', 'UTC+1', 'fully_remote', 4.5, 678, 2014),
  ('Remote', NULL, 'https://remote.com', '501+', 'HR Technology', '글로벌 인력 관리 플랫폼. 100개국 이상에서 채용 가능한 EOR 서비스.', 'United States', 'San Francisco', 'UTC-8', 'fully_remote', 4.6, 534, 2019),
  ('Deel', NULL, 'https://deel.com', '1001+', 'Fintech / HR', '글로벌 급여 및 인력 관리 플랫폼. 150개국 계약 지원.', 'United States', 'San Francisco', 'UTC-8', 'fully_remote', 4.4, 891, 2019),
  ('Toptal', NULL, 'https://toptal.com', '201-500', 'Talent Marketplace', '상위 3% 프리랜서 네트워크. 완전 원격 운영.', 'United States', 'Wilmington', 'UTC-5', 'fully_remote', 4.3, 1205, 2010),
  ('Stripe', NULL, 'https://stripe.com', '5000+', 'Fintech', '글로벌 결제 인프라 회사. 원격 친화적 문화.', 'United States', 'San Francisco', 'UTC-8', 'remote_first', 4.7, 3421, 2010),
  ('Shopify', NULL, 'https://shopify.com', '10000+', 'E-commerce', '이커머스 플랫폼 선두 주자. "Digital by default" 정책.', 'Canada', 'Ottawa', 'UTC-5', 'remote_first', 4.5, 5678, 2006),
  ('Buffer', NULL, 'https://buffer.com', '51-200', 'Social Media Tools', '소셜 미디어 관리 툴. 완전 투명한 급여 공개 원격 회사.', 'United States', 'San Francisco (Remote)', 'UTC-8', 'fully_remote', 4.8, 289, 2010),
  ('ConvertKit', NULL, 'https://convertkit.com', '51-200', 'Email Marketing', '크리에이터를 위한 이메일 마케팅 플랫폼. 완전 원격.', 'United States', 'Boise (Remote)', 'UTC-7', 'fully_remote', 4.6, 178, 2013),
  ('Zapier', NULL, 'https://zapier.com', '501+', 'Automation', '앱 자동화 플랫폼. 설립 초기부터 완전 원격 운영.', 'United States', 'Sunnyvale (Remote)', 'UTC-8', 'fully_remote', 4.7, 1023, 2011),
  ('HubSpot', NULL, 'https://hubspot.com', '5000+', 'CRM / Marketing', 'CRM 및 마케팅 자동화 플랫폼. 유연한 원격 정책.', 'United States', 'Cambridge, MA', 'UTC-5', 'remote_first', 4.4, 7892, 2006),
  ('Figma', NULL, 'https://figma.com', '1001+', 'Design Tools', '콜라보레이션 디자인 툴. 원격 팀을 위한 도구를 만드는 원격 친화 회사.', 'United States', 'San Francisco', 'UTC-8', 'remote_first', 4.6, 2341, 2012);

-- 공고 데이터
