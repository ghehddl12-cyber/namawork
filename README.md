# NomaWork - 디지털 노마드 채용 플랫폼

## 프로젝트 개요
- **서비스명**: NomaWork
- **목표**: 시차 관리, 글로벌 급여 정산, 완전 원격 채용에 특화된 디지털 노마드 전용 채용 플랫폼
- **기술 스택**: Hono + TypeScript + Cloudflare Pages + D1 SQLite + TailwindCSS

## 현재 URL
- **개발 서버**: https://3000-ib6rwzfnzs1z642rhy9g3-5634da27.sandbox.novita.ai
- **헬스체크**: `/api/health`

## 구현된 기능

### 핵심 차별화 기능
1. **⏰ 시차 호환성 시각화** - 24시간 타임라인으로 내 근무시간과 회사 요구시간 겹침 표시
2. **💰 글로벌 급여 계산기** - 실시간 환율 + 22개 도시 생활비 지수 기반 실질 구매력 계산
3. **🎯 매칭 점수 알고리즘** - 타임존 오버랩, 원격 타입, 비동기 비율 기반 적합도 점수

### 페이지 구성
- **홈**: 추천 공고 피드, 직무별 카테고리, 통계, 차별화 기능 소개
- **공고 목록**: 필터링 (원격 타입/계약형태/경력/타임존/카테고리) + 검색
- **공고 상세**: 시차 시각화, 매칭 점수, 기술 스택, 유사 공고
- **급여 계산기**: 연봉/월급/시급 변환 + 도시별 생활비 비교
- **기업 목록**: 원격 친화 기업 15개 (평점, 공고 수 포함)

## API 엔드포인트

### 공고 API (`/api/jobs`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/jobs` | 공고 목록 (필터: q, category, remote_type, contract_type, experience_level, timezone, page) |
| GET | `/api/jobs/:slug` | 공고 상세 |
| GET | `/api/jobs/meta/categories` | 카테고리별 공고 수 |
| GET | `/api/jobs/meta/timezones` | 타임존 목록 |

### 기업 API (`/api/companies`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/companies` | 기업 목록 |
| GET | `/api/companies/:id` | 기업 상세 |

### 급여 API (`/api/salary`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/salary/calculate` | 급여 계산 (salary, currency, period, city, target_currency) |
| GET | `/api/salary/cities` | 도시별 생활비 목록 |
| GET | `/api/salary/rates` | 환율 정보 |

## 데이터 구조

### jobs 테이블
- 노마드 특화 필드: `remote_type`, `required_timezone`, `timezone_overlap_hours`, `async_work_percentage`, `monthly_meeting_count`, `equipment_provided`, `coworking_budget`
- 급여: `salary_min/max`, `salary_currency`, `salary_period` (yearly/monthly/hourly)

### 시드 데이터
- **기업**: 15개 (GitLab, Automattic, Basecamp, Doist, Hotjar, Remote, Deel, Toptal, Stripe, Shopify, Buffer, ConvertKit, Zapier, HubSpot, Figma)
- **공고**: 15개 (Engineering 8개, Marketing 3개, Design 2개, Product 1개, Operations 1개)
- **타임존**: 16개, **생활비 지수**: 22개 도시

## 로컬 개발 명령어
```bash
npm run build          # 빌드
pm2 start ecosystem.config.cjs  # 서비스 시작
pm2 logs --nostream    # 로그 확인
npm run db:reset       # DB 초기화 + 마이그레이션 + 시드
```

## 미구현 기능 (Phase 2 예정)
- [ ] 회원가입/로그인 (프로필 관리)
- [ ] 지원하기 기능
- [ ] 비동기 면접 시스템 (비디오 녹화)
- [ ] 실시간 환율 API 연동 (현재 하드코딩)
- [ ] 커뮤니티/노마드 허브 기능
- [ ] 기업용 대시보드
- [ ] 알림/저장 공고 기능

## 다음 개발 추천 사항
1. **외부 환율 API 연동** - Open Exchange Rates 또는 Fixer.io
2. **사용자 인증** - Cloudflare Zero Trust 또는 Lucia Auth
3. **알림 시스템** - Cloudflare Queues + Email 연동
4. **Cloudflare 배포** - `npx wrangler pages deploy dist`

## 배포 정보
- **플랫폼**: Cloudflare Pages
- **상태**: 🔄 로컬 개발 중
- **마지막 업데이트**: 2026-03-17
