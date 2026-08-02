# NomaWork — 외부 작업자 인수인계 문서

> 작성일: 2026-08-02  
> 프로젝트: 디지털 노마드 특화 채용 플랫폼  
> 현재 상태: **MVP 완성 (로컬 개발 환경)**

---

## 1. 프로젝트 개요

**NomaWork**는 디지털 노마드를 위한 채용 플랫폼입니다. 일반 채용 사이트와 달리 다음 기능에 특화되어 있습니다:

- 타임존 호환성 시각화 (24시간 타임라인으로 겹치는 근무 시간 표시)
- 노마드 특화 공고 정보 (비동기 근무 비율, 장비 지원, 코워킹 예산 등)
- 글로벌 급여 계산기 (22개 도시 생활비 지수 기반 실질 구매력 계산)
- 매칭 점수 알고리즘 (사용자 타임존 기준 공고 호환도 표시)

---

## 2. 기술 스택

| 항목 | 내용 |
|------|------|
| 런타임 | Cloudflare Pages (Edge) |
| 프레임워크 | Hono v4 (TypeScript) |
| 빌드 도구 | Vite + `@hono/vite-build` |
| 데이터베이스 | Cloudflare D1 (SQLite) — 로컬: `--local` 모드 |
| 프론트엔드 | Vanilla JS SPA (Single Page Application) |
| CSS | TailwindCSS CDN + 커스텀 CSS |
| 아이콘 | FontAwesome 6.4.0 CDN |
| HTTP 클라이언트 | Axios 1.6.0 CDN |
| 차트 | Chart.js 4.4.0 CDN |
| 프로세스 관리 | PM2 (로컬 개발 서버) |

---

## 3. 디렉토리 구조

```
/home/user/webapp/
├── src/
│   ├── index.tsx              # 앱 엔트리: API 마운트 + SPA HTML 서빙
│   ├── renderer.tsx           # JSX renderer (현재 미사용)
│   └── routes/
│       ├── jobs.ts            # 공고 API (목록/상세/카테고리/타임존 메타)
│       ├── companies.ts       # 기업 API (목록/상세)
│       └── salary.ts          # 급여 계산기 API
├── public/
│   └── static/
│       ├── app.js             # 프론트엔드 SPA (1,391줄, Vanilla JS)
│       ├── styles.css         # 커스텀 CSS (노마드 그린 테마)
│       └── style.css          # (초기 기본 스타일, 현재 미사용)
├── migrations/
│   └── 0001_initial_schema.sql # DB 스키마 (4개 테이블)
├── dist/                       # 빌드 결과물 (git 제외)
├── .wrangler/                  # wrangler 로컬 상태 (D1 SQLite 포함)
│   └── state/v3/d1/miniflare-D1DatabaseObject/
│       └── *.sqlite            # 실제 로컬 D1 데이터
├── ecosystem.config.cjs        # PM2 설정
├── wrangler.jsonc              # Cloudflare 설정
├── vite.config.ts              # Vite 빌드 설정
├── package.json                # 의존성 및 npm 스크립트
├── tsconfig.json               # TypeScript 설정
├── seed_python.py              # DB 시드 스크립트 (Python sqlite3 직접 사용)
├── seed.sql                    # 원본 시드 SQL (wrangler CLI로는 실패함 - 아래 참고)
└── README.md                   # 프로젝트 문서
```

---

## 4. 로컬 개발 환경 구동 방법

### 사전 조건
- Node.js 18+
- Python 3.x (시드 데이터 삽입용)
- PM2 (`npm install -g pm2`)

### 최초 설치

```bash
# 1. 의존성 설치
cd /home/user/webapp
npm install

# 2. 빌드
npm run build

# 3. DB 마이그레이션 (로컬 SQLite 생성)
npx wrangler d1 migrations apply nomawork-production --local

# 4. 시드 데이터 삽입 (⚠️ wrangler CLI 아닌 Python 직접 사용 — 이유는 섹션 8 참고)
python3 seed_python.py

# 5. 서버 실행 (PM2)
pm2 start ecosystem.config.cjs

# 6. 확인
curl http://localhost:3000/api/health
# → {"status":"ok","service":"NomaWork API"}
```

### 재시작 (이미 설치된 환경)

```bash
cd /home/user/webapp
npm run build
pm2 restart nomawork

# 또는 완전 재시작
pm2 delete all
pm2 start ecosystem.config.cjs
```

### 로그 확인

```bash
pm2 logs nomawork --nostream
```

---

## 5. API 엔드포인트 명세

### 공통
- Base URL: `http://localhost:3000` (로컬) / `https://nomawork.pages.dev` (배포 후)
- Content-Type: `application/json`
- CORS: `/api/*` 전체 허용

---

### 5-1. 헬스체크
```
GET /api/health
→ {"status":"ok","service":"NomaWork API"}
```

---

### 5-2. 공고 (Jobs)

#### 공고 목록 조회
```
GET /api/jobs
```
쿼리 파라미터:

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `q` | string | 제목/회사명/스킬 검색 |
| `category` | string | 카테고리 필터 (Engineering, Marketing, Design 등) |
| `remote_type` | string | `fully_remote` \| `timezone_limited` \| `hybrid` |
| `contract_type` | string | `full_time` \| `part_time` \| `contract` \| `freelance` \| `project` |
| `experience_level` | string | `entry` \| `junior` \| `mid` \| `senior` \| `lead` \| `any` |
| `timezone` | string | UTC 오프셋 (예: `UTC+9`) |
| `salary_min` | number | 최소 연봉 (USD) |
| `featured` | `true` | 추천 공고만 |
| `page` | number | 페이지 번호 (기본: 1) |
| `limit` | number | 페이지당 개수 (기본: 12) |

응답:
```json
{
  "jobs": [ /* job 객체 배열 */ ],
  "pagination": { "total": 15, "page": 1, "limit": 12, "total_pages": 2 }
}
```

#### 공고 상세 조회
```
GET /api/jobs/:slug
```
- 유사 공고 3개 포함 (`similar_jobs` 필드)
- 조회 시 `view_count` 자동 증가

#### 카테고리 메타
```
GET /api/jobs/meta/categories
→ [{"category":"Engineering","count":7}, ...]
```

#### 타임존 메타
```
GET /api/jobs/meta/timezones
→ [{"id":1,"name":"Pacific Time","offset_hours":-8,"utc_label":"UTC-8",...}, ...]
```

---

### 5-3. 기업 (Companies)

#### 기업 목록
```
GET /api/companies?q=&remote_policy=fully_remote&industry=
```
- 공고 수(`job_count`) 포함, 평점 순 정렬, 최대 20개

#### 기업 상세
```
GET /api/companies/:id
→ { ...company, jobs: [...] }
```

---

### 5-4. 급여 계산기 (Salary)

#### 급여 계산
```
POST /api/salary/calculate
Content-Type: application/json

{
  "salary": 120000,
  "currency": "USD",    // 통화 코드 (15개 지원)
  "period": "yearly",   // "hourly" | "monthly" | "yearly"
  "city": "Seoul",      // 22개 도시 중 하나 (선택)
  "target_currency": "KRW"  // 결과 통화 (선택)
}
```

응답:
```json
{
  "annual_usd": 120000,
  "monthly_usd": 10000,
  "annual_target": 157800000,
  "monthly_target": 13150000,
  "after_tax_monthly_usd": 7500,
  "purchasing_power_ratio": 1.25,       // 뉴욕 대비 실질 구매력 배수
  "adjusted_monthly_usd": 12500,        // 실질 구매력 환산 월급
  "city_cost_index": 80,                // 뉴욕=100 기준
  "monthly_living_budget_usd": 3000,    // 편안한 생활 예상 월비용
  "estimated_savings_ratio": 25,        // 예상 저축률 (%)
  "estimated_tax_rate": 30,             // 추정 세율 (%)
  "exchange_rates": { "USD":1, "KRW":1315, ... }
}
```

#### 도시 목록
```
GET /api/salary/cities
→ [{"name":"Ho Chi Minh City","index":30,"monthly_budget":1100}, ...]
```

#### 환율 정보
```
GET /api/salary/rates
→ {"USD":1,"EUR":0.92,"GBP":0.79,"KRW":1315,...}
```

지원 통화 (15개): USD, EUR, GBP, KRW, JPY, SGD, AUD, CAD, THB, VND, IDR, BRL, MXN, PLN, GEL

---

## 6. 데이터베이스 스키마

### companies 테이블
```sql
CREATE TABLE companies (
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
  remote_policy TEXT CHECK(remote_policy IN ('fully_remote','remote_first','hybrid','office_first')),
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  founded_year INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### jobs 테이블 (핵심 — 노마드 특화 컬럼 포함)
```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,             -- FK → companies
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,               -- URL 식별자
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,              -- JSON array
  nice_to_have TEXT,                       -- JSON array
  remote_type TEXT NOT NULL CHECK(remote_type IN ('fully_remote','timezone_limited','hybrid')),
  contract_type TEXT NOT NULL CHECK(contract_type IN ('full_time','part_time','contract','freelance','project')),
  duration TEXT CHECK(duration IN ('short_term','mid_term','long_term','permanent')),
  experience_level TEXT CHECK(experience_level IN ('entry','junior','mid','senior','lead','any')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  salary_period TEXT DEFAULT 'yearly' CHECK(salary_period IN ('hourly','monthly','yearly')),
  required_timezone TEXT,                  -- 예: "UTC+9"
  timezone_overlap_hours INTEGER DEFAULT 0, -- 최소 오버랩 필요 시간
  preferred_timezones TEXT,               -- JSON array ["UTC-8","UTC+9"]
  async_work_percentage INTEGER DEFAULT 50, -- 비동기 근무 비율 (0~100%)
  monthly_meeting_count INTEGER DEFAULT 8,  -- 월 미팅 횟수
  equipment_provided INTEGER DEFAULT 0,     -- 장비 지원 여부 (0/1)
  coworking_budget INTEGER DEFAULT 0,       -- 코워킹 예산 (USD/월)
  tools TEXT,                               -- JSON array ["Slack","Notion"]
  skills_required TEXT NOT NULL,           -- JSON array
  skills_preferred TEXT,                   -- JSON array
  languages_required TEXT DEFAULT '["English"]', -- JSON array
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  applicant_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

### timezones 테이블
```sql
CREATE TABLE timezones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,          -- "Korea Standard Time"
  offset_hours REAL NOT NULL,  -- 9 (KST)
  utc_label TEXT NOT NULL,     -- "UTC+9"
  region TEXT,                 -- "Asia"
  major_cities TEXT            -- "Seoul, Tokyo, Osaka"
);
```

### cost_of_living 테이블
```sql
CREATE TABLE cost_of_living (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT NOT NULL,
  city TEXT,
  index_value REAL NOT NULL,       -- 뉴욕=100 기준
  rent_index REAL,
  monthly_budget_usd INTEGER,      -- 편안한 생활 예상 월비용
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

현재 시드 데이터:
- 기업: 15개 (GitLab, Automattic, Basecamp, Doist, Hotjar, Remote, Deel, Toptal, Stripe, Shopify, Buffer, ConvertKit, Zapier, HubSpot, Figma)
- 공고: 15개 (Engineering 8개, Design 2개, Marketing 3개, Product 1개, Operations 1개)
- 타임존: 16개 (UTC-8 ~ UTC+12)
- 도시 생활비: 22개 도시

---

## 7. 프론트엔드 SPA 구조

`public/static/app.js` (1,391줄) — 완전한 Vanilla JS SPA

### 페이지 라우팅
```javascript
// hash 기반 SPA 라우팅
window.addEventListener('hashchange', router)
// #/ → 홈
// #/jobs → 공고 목록
// #/jobs/:slug → 공고 상세
// #/calculator → 급여 계산기
// #/companies → 기업 목록
```

### 주요 함수

| 함수 | 역할 |
|------|------|
| `router()` | URL hash 기반 페이지 라우팅 |
| `renderHomePage()` | 홈 화면 (히어로 + 추천 공고 + 특징) |
| `renderJobListPage()` | 공고 목록 (필터 사이드바 + 카드 그리드) |
| `renderJobDetailPage(slug)` | 공고 상세 (타임존 시각화 + 매칭 점수) |
| `renderCalculatorPage()` | 급여 계산기 (도시별 생활비 비교) |
| `renderCompaniesPage()` | 기업 목록 |
| `renderTimezoneBar(job)` | 24시간 타임라인 시각화 |
| `calculateMatchScore(job)` | 타임존 매칭 점수 계산 (0~100) |
| `formatSalary(min, max, currency, period)` | 급여 포맷팅 |
| `formatRemoteType(type)` | remote_type 한글 변환 |

### 타임존 매칭 점수 알고리즘
```javascript
// 사용자 타임존(localStorage 저장) vs 공고 preferred_timezones 비교
// 완전 매칭: 100점
// 인접 타임존 (±2h): 80점
// 광역 매칭 (±4h): 60점
// 오버랩 없음: 30점 (fully_remote는 기본 50점)
```

---

## 8. 알려진 이슈 및 주의사항

### ⚠️ 시드 데이터는 반드시 Python으로 삽입해야 함

`wrangler d1 execute --file=seed.sql` 명령은 아래 이유로 실패합니다:
1. wrangler CLI가 SQL을 statement 단위로 실행하여 `PRAGMA foreign_keys=OFF`가 무시됨
2. FK 제약 위반 (jobs 삽입 시 companies 순서 문제)
3. `size` CHECK 제약: 허용값은 `'1-10','11-50','51-200','201-500','500+'` 뿐

**반드시 `python3 seed_python.py`로 시드 데이터를 삽입하세요.**

### ⚠️ `remote_type` CHECK 제약
DB의 `remote_type` 허용값: `fully_remote`, `timezone_limited`, `hybrid`  
기업 테이블의 `remote_policy` 허용값: `fully_remote`, `remote_first`, `hybrid`, `office_first`  
혼용 주의 (다른 컬럼입니다).

### ⚠️ 로컬 D1 SQLite 파일 경로
시드 스크립트(`seed_python.py`) 상단의 DB 파일 경로가 하드코딩되어 있습니다:
```python
DB = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/57f18ed1...eb.sqlite'
```
DB를 초기화하거나 새 환경에서 실행하면 파일명(해시값)이 바뀝니다.  
변경 시 다음 명령으로 새 파일명 확인 후 수정하세요:
```bash
ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
```

### ⚠️ 환율 하드코딩
`src/routes/salary.ts`의 `EXCHANGE_RATES`는 정적 값입니다.  
실제 서비스에서는 외부 API(Fixer.io, ExchangeRate-API 등)로 교체 필요.

### ⚠️ wrangler.jsonc의 database_id
현재 `"database_id": "local-nomawork-db"` — 로컬 개발용 더미 값.  
Cloudflare 실제 배포 시 `npx wrangler d1 create nomawork-production`으로 발급된 실제 ID로 교체 필요.

---

## 9. Cloudflare 실제 배포 방법

로컬 개발 환경에서 실제 Cloudflare Pages로 배포하려면:

```bash
# 1. Cloudflare 계정 인증 (wrangler login은 sandbox에서 안 됨 — API 토큰 사용)
export CLOUDFLARE_API_TOKEN="your-api-token"

# 2. 실제 D1 DB 생성 및 ID 업데이트
npx wrangler d1 create nomawork-production
# 출력된 database_id를 wrangler.jsonc에 업데이트

# 3. 프로덕션 DB 마이그레이션
npx wrangler d1 migrations apply nomawork-production

# 4. 빌드 및 배포
npm run build
npx wrangler pages deploy dist --project-name nomawork

# 5. 프로덕션 DB 시드 (별도 스크립트 필요 — 현재 미구현)
# 로컬 seed_python.py는 로컬 SQLite를 직접 수정하므로 프로덕션용 SQL 파일 별도 작성 필요
```

---

## 10. 미구현 기능 (기획서 기준)

우선순위 순으로 정리:

### 🔴 높음 — 핵심 기능 미완성

#### 1. 회원가입/로그인 (인증 시스템)
- DB 테이블: `users` 테이블 추가 필요
  ```sql
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    current_timezone TEXT,         -- 사용자 현재 타임존
    preferred_timezones TEXT,      -- JSON array
    skills TEXT,                   -- JSON array
    experience_level TEXT,
    preferred_salary_min INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- 구현 방식 제안: Cloudflare Workers의 Web Crypto API로 비밀번호 해싱, JWT 토큰 발급
- 참고: Hono의 `hono/jwt` 미들웨어 활용 가능

#### 2. 지원하기 / 공고 저장 기능
- DB 테이블: `job_applications`, `saved_jobs` 테이블 추가 필요
- 인증 시스템 구현 후 연동

### 🟡 중간 — 서비스 완성도

#### 3. 실시간 환율 API 연동
- 현재: `src/routes/salary.ts`의 `EXCHANGE_RATES` 하드코딩
- 교체 대상: ExchangeRate-API (무료 플랜 1,500회/월) 또는 Fixer.io
- 구현 방법: Cloudflare Workers의 `fetch()` + KV 캐싱 (1시간 TTL)
  ```typescript
  // KV에 캐시된 환율 없으면 외부 API 호출 후 캐시
  const cached = await c.env.KV.get('exchange_rates')
  if (cached) return JSON.parse(cached)
  const rates = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json())
  await c.env.KV.put('exchange_rates', JSON.stringify(rates), { expirationTtl: 3600 })
  ```

#### 4. 기업용 공고 등록/관리 대시보드
- 별도 어드민 페이지 (`#/admin`) 추가
- POST `/api/jobs`, PUT `/api/jobs/:slug`, DELETE `/api/jobs/:slug` API 추가
- 인증된 기업 계정만 접근 가능하도록 미들웨어 필요

### 🟢 낮음 — 부가 기능

#### 5. 비동기 면접 시스템
- 지원자: 영상 자기소개/과제 업로드 → Cloudflare R2 저장
- 기업: 업로드된 영상 검토
- 구현 복잡도 높음 (R2 바인딩, 대용량 파일 처리)

#### 6. 커뮤니티 / 노마드 허브
- 도시별 노마드 정보 게시판
- 코워킹 스페이스 지도 (Google Maps API 연동)

#### 7. 알림 시스템
- 새 공고 이메일 알림 (Resend API 연동)
- 마감 임박 알림

---

## 11. 로컬 개발 환경에서 테스트 방법

```bash
# 전체 API 테스트
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/jobs?limit=3"
curl "http://localhost:3000/api/jobs/senior-frontend-engineer-react-gitlab"
curl "http://localhost:3000/api/companies"
curl "http://localhost:3000/api/salary/cities"
curl -X POST http://localhost:3000/api/salary/calculate \
  -H "Content-Type: application/json" \
  -d '{"salary":120000,"currency":"USD","period":"yearly","city":"Seoul","target_currency":"KRW"}'

# 필터 테스트
curl "http://localhost:3000/api/jobs?category=Engineering&remote_type=fully_remote"
curl "http://localhost:3000/api/jobs?featured=true"
curl "http://localhost:3000/api/jobs?timezone=UTC%2B9"

# DB 직접 조회
python3 -c "
import sqlite3, os
d = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/'
f = [x for x in os.listdir(d) if x.endswith('.sqlite')][0]
conn = sqlite3.connect(d+f)
for row in conn.execute('SELECT j.title, c.name FROM jobs j JOIN companies c ON j.company_id=c.id'):
    print(row)
conn.close()
"
```

---

## 12. 환경 변수 및 설정

### 로컬 개발 (`.dev.vars` — 현재 미사용)
```
# 실제 배포 시 필요한 환경 변수들
EXCHANGE_RATE_API_KEY=your-key-here
JWT_SECRET=your-secret-here
```

### wrangler.jsonc (현재 설정)
```jsonc
{
  "name": "nomawork",
  "compatibility_date": "2026-03-17",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "nomawork-production",
      "database_id": "local-nomawork-db"  // ⚠️ 배포 시 실제 ID로 교체 필요
    }
  ]
}
```

---

## 13. Git 이력

```
c1aeae8  feat: NomaWork 디지털 노마드 채용 플랫폼 MVP 구현
```

브랜치: `main`  
현재 미커밋 변경사항: `README.md` 수정

---

## 14. 빌드 상태

| 항목 | 상태 |
|------|------|
| `npm run build` | ✅ 성공 (`dist/_worker.js 36.09 kB`) |
| DB 마이그레이션 | ✅ 완료 |
| 시드 데이터 | ✅ 삽입 완료 (기업 15, 공고 15, 타임존 16, 도시 22) |
| PM2 서비스 | ✅ 포트 3000 실행 중 |
| API 헬스체크 | ✅ 정상 응답 |

---

*본 문서는 2026-08-02 기준으로 작성되었습니다.*
