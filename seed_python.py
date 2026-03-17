#!/usr/bin/env python3
import sqlite3

DB = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/57f18ed104d346d2cc7b1ff313c47b75b18f86dd4b397623a09256bde60a69eb.sqlite'
conn = sqlite3.connect(DB)
conn.execute('PRAGMA foreign_keys=OFF')

# ---- 타임존 ----
timezones = [
  ('Pacific Time', -8, 'UTC-8', 'Americas', 'Los Angeles, Vancouver, Seattle'),
  ('Mountain Time', -7, 'UTC-7', 'Americas', 'Denver, Phoenix, Calgary'),
  ('Central Time', -6, 'UTC-6', 'Americas', 'Chicago, Dallas, Mexico City'),
  ('Eastern Time', -5, 'UTC-5', 'Americas', 'New York, Toronto, Miami'),
  ('Brazil Time', -3, 'UTC-3', 'Americas', 'São Paulo, Rio de Janeiro'),
  ('UTC', 0, 'UTC+0', 'Europe', 'London, Dublin, Lisbon'),
  ('Central European Time', 1, 'UTC+1', 'Europe', 'Paris, Berlin, Madrid, Rome'),
  ('Eastern European Time', 2, 'UTC+2', 'Europe', 'Athens, Helsinki, Bucharest'),
  ('Moscow Time', 3, 'UTC+3', 'Europe', 'Moscow, Istanbul, Riyadh'),
  ('UAE Time', 4, 'UTC+4', 'Asia', 'Dubai, Abu Dhabi'),
  ('India Time', 5.5, 'UTC+5:30', 'Asia', 'Mumbai, Delhi, Bangalore'),
  ('Indochina Time', 7, 'UTC+7', 'Asia', 'Bangkok, Ho Chi Minh, Jakarta'),
  ('China Standard Time', 8, 'UTC+8', 'Asia', 'Beijing, Shanghai, Singapore, Taipei'),
  ('Korea Standard Time', 9, 'UTC+9', 'Asia', 'Seoul, Tokyo, Osaka'),
  ('Australian Eastern Time', 10, 'UTC+10', 'Oceania', 'Sydney, Melbourne, Brisbane'),
  ('New Zealand Time', 12, 'UTC+12', 'Oceania', 'Auckland, Wellington'),
]
conn.executemany("INSERT OR IGNORE INTO timezones (name,offset_hours,utc_label,region,major_cities) VALUES(?,?,?,?,?)", timezones)

# ---- 생활비 ----
cost = [
  ('United States','New York',100,100,4500),
  ('United States','San Francisco',105,115,4800),
  ('United States','Austin',75,72,3200),
  ('United Kingdom','London',88,85,3800),
  ('Germany','Berlin',68,55,2800),
  ('Netherlands','Amsterdam',78,80,3200),
  ('Portugal','Lisbon',55,48,2200),
  ('Spain','Barcelona',60,52,2400),
  ('Thailand','Bangkok',38,25,1500),
  ('Thailand','Chiang Mai',32,20,1200),
  ('Vietnam','Ho Chi Minh City',30,18,1100),
  ('Indonesia','Bali',35,22,1300),
  ('Mexico','Mexico City',42,28,1600),
  ('Colombia','Medellin',35,22,1300),
  ('South Korea','Seoul',80,72,3000),
  ('Japan','Tokyo',82,68,3200),
  ('Singapore','Singapore',95,110,4000),
  ('Australia','Sydney',90,88,3800),
  ('Canada','Toronto',82,78,3400),
  ('Poland','Warsaw',48,38,1900),
  ('Georgia','Tbilisi',38,25,1400),
  ('Estonia','Tallinn',55,50,2200),
]
conn.executemany("INSERT OR IGNORE INTO cost_of_living (country,city,index_value,rent_index,monthly_budget_usd) VALUES(?,?,?,?,?)", cost)

# ---- 기업 (ID 고정) ----
companies = [
  (1,'GitLab','https://gitlab.com','501+','Software Development','100% 원격 근무를 선도하는 DevOps 플랫폼 회사. 전 세계 65개국에 직원 보유.','United States','San Francisco (Remote-First)','UTC-8','fully_remote',4.8,1842,2011),
  (2,'Automattic','https://automattic.com','1001+','Technology','WordPress.com, WooCommerce 등을 운영하는 완전 원격 회사.','United States','San Francisco (Remote)','UTC-8','fully_remote',4.7,923,2005),
  (3,'Basecamp','https://basecamp.com','51-200','Software Development','원격 근무 문화의 선구자. Remote 저자 Jason Fried의 회사.','United States','Chicago','UTC-6','fully_remote',4.6,456,1999),
  (4,'Doist','https://doist.com','51-200','Productivity Software','Todoist, Twist를 만드는 비동기 원격 팀. 전 세계 35개국 팀원.','Portugal','Lisbon (Remote)','UTC+0','fully_remote',4.9,312,2007),
  (5,'Hotjar','https://hotjar.com','201-500','Analytics','사용자 행동 분석 툴을 만드는 Malta 기반의 완전 원격 회사.','Malta','St Julians','UTC+1','fully_remote',4.5,678,2014),
  (6,'Remote','https://remote.com','501+','HR Technology','글로벌 인력 관리 플랫폼. 100개국 이상에서 채용 가능한 EOR 서비스.','United States','San Francisco','UTC-8','fully_remote',4.6,534,2019),
  (7,'Deel','https://deel.com','1001+','Fintech / HR','글로벌 급여 및 인력 관리 플랫폼. 150개국 계약 지원.','United States','San Francisco','UTC-8','fully_remote',4.4,891,2019),
  (8,'Toptal','https://toptal.com','201-500','Talent Marketplace','상위 3% 프리랜서 네트워크. 완전 원격 운영.','United States','Wilmington','UTC-5','fully_remote',4.3,1205,2010),
  (9,'Stripe','https://stripe.com','5000+','Fintech','글로벌 결제 인프라 회사. 원격 친화적 문화.','United States','San Francisco','UTC-8','remote_first',4.7,3421,2010),
  (10,'Shopify','https://shopify.com','10000+','E-commerce','이커머스 플랫폼 선두 주자. Digital by default 정책.','Canada','Ottawa','UTC-5','remote_first',4.5,5678,2006),
  (11,'Buffer','https://buffer.com','51-200','Social Media Tools','소셜 미디어 관리 툴. 완전 투명한 급여 공개 원격 회사.','United States','San Francisco (Remote)','UTC-8','fully_remote',4.8,289,2010),
  (12,'ConvertKit','https://convertkit.com','51-200','Email Marketing','크리에이터를 위한 이메일 마케팅 플랫폼. 완전 원격.','United States','Boise (Remote)','UTC-7','fully_remote',4.6,178,2013),
  (13,'Zapier','https://zapier.com','501+','Automation','앱 자동화 플랫폼. 설립 초기부터 완전 원격 운영.','United States','Sunnyvale (Remote)','UTC-8','fully_remote',4.7,1023,2011),
  (14,'HubSpot','https://hubspot.com','5000+','CRM / Marketing','CRM 및 마케팅 자동화 플랫폼. 유연한 원격 정책.','United States','Cambridge, MA','UTC-5','remote_first',4.4,7892,2006),
  (15,'Figma','https://figma.com','1001+','Design Tools','콜라보레이션 디자인 툴. 원격 팀을 위한 도구.','United States','San Francisco','UTC-8','remote_first',4.6,2341,2012),
]
conn.executemany("""
  INSERT OR IGNORE INTO companies (id,name,website,size,industry,description,headquarters_country,headquarters_city,timezone,remote_policy,rating,review_count,founded_year)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
""", companies)

# ---- 공고 ----
import json as js

jobs = [
  (1,'Senior Frontend Engineer (React)','senior-frontend-engineer-react-gitlab','Engineering','Frontend',
   'GitLab에서 수백만 개발자가 사용하는 웹 인터페이스를 개발할 Senior Frontend Engineer를 찾습니다. 완전 원격 환경에서 비동기적으로 협업하며 오픈소스 기여도 환영합니다.',
   js.dumps(["React/Vue.js 5년 이상","TypeScript 필수","GraphQL API 연동 경험","영어 비즈니스 레벨"]),
   js.dumps(["GitLab 오픈소스 기여 경험","Ruby on Rails 이해"]),
   'fully_remote','full_time','permanent','senior',
   120000,180000,'USD','yearly',None,0,js.dumps(["UTC-8","UTC-5","UTC+0","UTC+1","UTC+2"]),
   80,4,1,250,js.dumps(["GitLab","Slack","Zoom","Figma","Linear"]),
   js.dumps(["React","TypeScript","GraphQL","Jest"]),js.dumps(["Vue.js","Ruby","PostgreSQL"]),
   js.dumps(["English"]),1),

  (2,'Full Stack Engineer (WordPress/PHP)','fullstack-engineer-wordpress-automattic','Engineering','Full Stack',
   'WordPress.com을 수억 명의 사용자가 더 잘 사용할 수 있도록 돕는 Full Stack Engineer를 모집합니다.',
   js.dumps(["PHP 4년 이상","JavaScript/React 3년 이상","MySQL 경험","영어 유창"]),
   js.dumps(["Gutenberg 블록 에디터 경험","WooCommerce 플러그인 개발"]),
   'fully_remote','full_time','permanent','mid',
   90000,140000,'USD','yearly',None,0,None,
   90,2,1,200,js.dumps(["Slack","Zoom","Notion","GitHub"]),
   js.dumps(["PHP","JavaScript","React","MySQL","WordPress"]),js.dumps(["TypeScript","GraphQL","Redis"]),
   js.dumps(["English"]),0),

  (4,'Product Designer (Mobile & Web)','product-designer-doist','Design','Product Design',
   '수백만 명이 사용하는 Todoist의 모바일/웹 경험을 디자인합니다. 완전 비동기 팀에서 사용자 중심 디자인 프로세스를 이끌 디자이너를 찾습니다.',
   js.dumps(["Figma 전문가 수준","모바일 UI/UX 디자인 4년 이상","사용자 리서치 경험","영어 고급"]),
   js.dumps(["iOS/Android 네이티브 디자인 가이드라인","프로토타이핑 경험"]),
   'fully_remote','full_time','permanent','mid',
   80000,120000,'USD','yearly','UTC+0',4,js.dumps(["UTC-5","UTC+0","UTC+1","UTC+2","UTC+3"]),
   75,6,1,300,js.dumps(["Figma","Notion","Twist","Loom","Maze"]),
   js.dumps(["Figma","User Research","Design Systems","Mobile Design"]),js.dumps(["Framer","Principle"]),
   js.dumps(["English"]),1),

  (3,'Backend Engineer (Ruby on Rails)','backend-engineer-ruby-basecamp','Engineering','Backend',
   'Hey.com과 Basecamp 앱의 백엔드를 담당할 엔지니어를 찾습니다.',
   js.dumps(["Ruby on Rails 4년 이상","PostgreSQL 심화","RESTful API 설계","영어 비즈니스 레벨"]),
   js.dumps(["Redis/Memcached 캐싱","배포 자동화 경험"]),
   'fully_remote','full_time','permanent','senior',
   130000,170000,'USD','yearly','UTC-6',6,js.dumps(["UTC-8","UTC-7","UTC-6","UTC-5"]),
   70,5,1,150,js.dumps(["Basecamp","Hey","GitHub","Slack"]),
   js.dumps(["Ruby","Rails","PostgreSQL","Redis"]),js.dumps(["Docker","Kubernetes","AWS"]),
   js.dumps(["English"]),0),

  (5,'Growth Marketing Manager','growth-marketing-manager-hotjar','Marketing','Growth',
   'Hotjar의 Product-Led Growth 전략을 실행할 마케터를 찾습니다.',
   js.dumps(["PLG 또는 B2B SaaS 마케팅 3년 이상","Google Analytics, Mixpanel","A/B 테스팅 경험","영어 유창"]),
   js.dumps(["Hotjar/FullStory 사용 경험","이메일 자동화 경험"]),
   'fully_remote','full_time','permanent','mid',
   70000,100000,'USD','yearly','UTC+1',4,js.dumps(["UTC-5","UTC+0","UTC+1","UTC+2","UTC+3"]),
   65,8,1,200,js.dumps(["Hotjar","HubSpot","Slack","Notion"]),
   js.dumps(["Growth Marketing","SEO","SEM","Analytics","A/B Testing"]),js.dumps(["SQL","Python"]),
   js.dumps(["English"]),0),

  (6,'Senior Software Engineer (Payments)','senior-software-engineer-payments-remote','Engineering','Backend',
   '전 세계 기업들이 글로벌 인력에게 급여를 지급할 수 있는 결제 인프라를 구축합니다.',
   js.dumps(["Node.js 또는 Python 5년 이상","결제 시스템 구축 경험","Stripe/PayPal API 연동","영어 비즈니스 레벨"]),
   js.dumps(["국제 송금 서비스 경험","블록체인/암호화폐 이해"]),
   'fully_remote','full_time','permanent','senior',
   140000,200000,'USD','yearly',None,0,None,
   80,6,1,300,js.dumps(["Slack","Linear","GitHub","Notion"]),
   js.dumps(["Node.js","PostgreSQL","Redis","Stripe","Kubernetes","AWS"]),js.dumps(["Python","Go"]),
   js.dumps(["English"]),1),

  (13,'DevOps Engineer (Remote)','devops-engineer-zapier','Engineering','DevOps',
   'Zapier의 인프라를 관리하고 개발팀이 빠르게 배포할 수 있도록 지원합니다.',
   js.dumps(["AWS/GCP 3년 이상","Kubernetes 운영 경험","CI/CD 파이프라인 구축","영어 비즈니스 레벨"]),
   js.dumps(["Datadog 또는 유사 모니터링 도구","Python/Go 스크립팅"]),
   'fully_remote','full_time','permanent','mid',
   100000,150000,'USD','yearly',None,0,None,
   75,6,1,200,js.dumps(["Slack","GitHub","Datadog","Terraform"]),
   js.dumps(["AWS","Kubernetes","Terraform","Docker","CI/CD"]),js.dumps(["Go","Ansible"]),
   js.dumps(["English"]),0),

  (11,'Content Marketing Strategist','content-marketing-strategist-buffer','Marketing','Content',
   'Buffer의 블로그, SNS, 미디어 콘텐츠 전략을 이끌 콘텐츠 마케터를 찾습니다.',
   js.dumps(["콘텐츠 마케팅 3년 이상","SEO 최적화 경험","영어 원어민 수준 글쓰기","소셜 미디어 전략"]),
   js.dumps(["비디오/팟캐스트 콘텐츠 경험","원격 근무/노마드 관련 콘텐츠"]),
   'fully_remote','full_time','permanent','mid',
   65000,95000,'USD','yearly',None,0,js.dumps(["UTC-8","UTC-5","UTC+0","UTC+1"]),
   80,4,1,150,js.dumps(["Buffer","Slack","Notion","Loom"]),
   js.dumps(["Content Strategy","SEO","Social Media","Copywriting"]),js.dumps(["HubSpot","Webflow","Ahrefs"]),
   js.dumps(["English"]),0),

  (9,'Senior iOS Engineer','senior-ios-engineer-stripe','Engineering','Mobile',
   'Stripe의 모바일 결제 SDK와 앱을 개발하는 iOS 엔지니어를 찾습니다.',
   js.dumps(["Swift 5년 이상","iOS SDK 개발 경험","Core Data, URLSession 등","영어 유창"]),
   js.dumps(["결제 또는 금융 앱 경험","SwiftUI 경험"]),
   'remote_first','full_time','permanent','senior',
   150000,220000,'USD','yearly','UTC-8',6,js.dumps(["UTC-8","UTC-5","UTC+0","UTC+1"]),
   60,8,1,400,js.dumps(["Slack","GitHub","Figma","Linear","Zoom"]),
   js.dumps(["Swift","iOS","Xcode","Core Data","REST APIs"]),js.dumps(["SwiftUI","Objective-C"]),
   js.dumps(["English"]),0),

  (10,'UX Researcher (Remote)','ux-researcher-shopify','Design','Research',
   'Shopify 판매자 경험을 개선하기 위한 사용자 리서치를 이끌 UX Researcher를 찾습니다.',
   js.dumps(["UX 리서치 4년 이상","정성/정량 리서치 방법론","사용성 테스트 진행","영어 유창"]),
   js.dumps(["이커머스 도메인 경험","Figma 프로토타입 이해"]),
   'remote_first','full_time','permanent','mid',
   85000,125000,'USD','yearly','UTC-5',4,js.dumps(["UTC-8","UTC-7","UTC-6","UTC-5"]),
   65,6,1,200,js.dumps(["Figma","Notion","Zoom","UserTesting","Dovetail"]),
   js.dumps(["UX Research","Usability Testing","Surveys","Data Analysis"]),js.dumps(["SQL","Python"]),
   js.dumps(["English"]),0),

  (7,'Frontend Engineer (React/Next.js)','frontend-engineer-deel','Engineering','Frontend',
   'Deel의 HR 플랫폼 프론트엔드를 개발합니다. 150개국의 사용자가 매일 사용하는 복잡한 인터페이스를 구축합니다.',
   js.dumps(["React/Next.js 3년 이상","TypeScript 필수","REST API 연동 경험","영어 비즈니스 레벨"]),
   js.dumps(["국제화(i18n) 구현 경험","Storybook 사용 경험"]),
   'fully_remote','full_time','permanent','mid',
   80000,130000,'USD','yearly',None,0,None,
   70,8,1,200,js.dumps(["Slack","GitHub","Figma","Linear"]),
   js.dumps(["React","Next.js","TypeScript","CSS"]),js.dumps(["GraphQL","Docker","i18n"]),
   js.dumps(["English"]),0),

  (12,'Email Marketing Specialist','email-marketing-specialist-convertkit','Marketing','Email',
   'ConvertKit에서 크리에이터들이 더 효과적으로 이메일 마케팅을 할 수 있도록 플랫폼 마케팅을 담당합니다.',
   js.dumps(["이메일 마케팅 2년 이상","이메일 자동화 설계","카피라이팅 능력","영어 유창"]),
   js.dumps(["ConvertKit 사용 경험","크리에이터 이코노미 이해"]),
   'fully_remote','full_time','permanent','junior',
   55000,80000,'USD','yearly',None,0,js.dumps(["UTC-8","UTC-7","UTC-6","UTC-5"]),
   80,5,1,100,js.dumps(["ConvertKit","Slack","Notion","Loom"]),
   js.dumps(["Email Marketing","Copywriting","A/B Testing","Analytics"]),js.dumps(["SQL","HTML","CSS"]),
   js.dumps(["English"]),0),

  (8,'Senior Full Stack Developer (Contract)','senior-fullstack-developer-contract-toptal','Engineering','Full Stack',
   'Toptal 최상위 클라이언트를 위한 6개월 컨트랙 포지션. 핀테크 스타트업의 핵심 기능 개발을 리드합니다.',
   js.dumps(["풀스택 개발 7년 이상","React + Node.js 전문","PostgreSQL/MongoDB 심화","영어 유창"]),
   js.dumps(["AWS 아키텍처 경험","결제 시스템 통합","팀 리드 경험"]),
   'fully_remote','contract','mid_term','senior',
   100,150,'USD','hourly','UTC-5',4,js.dumps(["UTC-8","UTC-5","UTC+0","UTC+1"]),
   60,10,0,0,js.dumps(["GitHub","Slack","Zoom","Jira"]),
   js.dumps(["React","Node.js","PostgreSQL","AWS","Docker","TypeScript"]),js.dumps(["Kubernetes","GraphQL"]),
   js.dumps(["English"]),1),

  (15,'Product Manager - Collaboration','product-manager-collaboration-figma','Product','Product Management',
   'Figma의 실시간 협업 기능을 개선하는 PM을 찾습니다.',
   js.dumps(["B2B SaaS PM 경험 4년 이상","데이터 기반 의사결정","엔지니어/디자이너와의 협업","영어 유창"]),
   js.dumps(["디자인 도구 또는 협업 툴 PM 경험","SQL 기본 이해"]),
   'remote_first','full_time','permanent','senior',
   130000,190000,'USD','yearly','UTC-8',6,js.dumps(["UTC-8","UTC-5","UTC+0","UTC+1"]),
   60,10,1,400,js.dumps(["Figma","Slack","Notion","Linear","Amplitude"]),
   js.dumps(["Product Management","Roadmapping","User Research","Data Analysis"]),js.dumps(["SQL","Figma"]),
   js.dumps(["English"]),0),

  (14,'Customer Success Manager (APAC)','customer-success-manager-apac-hubspot','Operations','Customer Success',
   'HubSpot APAC 지역 주요 고객의 성공을 책임질 CSM. 한국어/일본어 가능자 우대.',
   js.dumps(["B2B SaaS CSM 경험 3년 이상","고객 포트폴리오 관리","한국어 또는 일본어 비즈니스 레벨","영어 유창"]),
   js.dumps(["HubSpot CRM 사용 경험","마케팅 자동화 이해"]),
   'remote_first','full_time','permanent','mid',
   70000,110000,'USD','yearly','UTC+9',6,js.dumps(["UTC+7","UTC+8","UTC+9","UTC+10"]),
   50,15,1,200,js.dumps(["HubSpot","Slack","Zoom","Gainsight"]),
   js.dumps(["Customer Success","Account Management","CRM","Communication"]),js.dumps(["Salesforce","SQL"]),
   js.dumps(["English","Korean"]),0),
]

cols = """company_id,title,slug,category,subcategory,description,requirements,nice_to_have,
remote_type,contract_type,duration,experience_level,salary_min,salary_max,salary_currency,salary_period,
required_timezone,timezone_overlap_hours,preferred_timezones,async_work_percentage,monthly_meeting_count,
equipment_provided,coworking_budget,tools,skills_required,skills_preferred,languages_required,is_featured"""

placeholders = ','.join(['?']*28)
conn.executemany(f"INSERT OR IGNORE INTO jobs ({cols}) VALUES ({placeholders})", jobs)

conn.commit()

# 검증
print(f"Companies: {conn.execute('SELECT COUNT(*) FROM companies').fetchone()[0]}")
print(f"Jobs: {conn.execute('SELECT COUNT(*) FROM jobs').fetchone()[0]}")
print(f"Timezones: {conn.execute('SELECT COUNT(*) FROM timezones').fetchone()[0]}")
print(f"Cost of living: {conn.execute('SELECT COUNT(*) FROM cost_of_living').fetchone()[0]}")

# 샘플 확인
for row in conn.execute("SELECT j.title, c.name FROM jobs j JOIN companies c ON j.company_id=c.id LIMIT 5").fetchall():
    print(f"  - {row[1]}: {row[0]}")

conn.close()
print("Done!")
