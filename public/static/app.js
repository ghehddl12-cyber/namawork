// ===== NomaWork SPA =====
const API = '/api'

// 앱 상태
const state = {
  page: 'home', // home | jobs | job-detail | calculator | companies
  jobs: [],
  selectedJob: null,
  companies: [],
  filters: {
    q: '', category: '', remote_type: '', contract_type: '',
    experience_level: '', timezone: '', salary_min: '', featured: ''
  },
  pagination: { page: 1, total: 0, total_pages: 0 },
  userTimezone: null,
  categories: [],
  timezones: [],
  loading: false
}

// 유틸
const $ = id => document.getElementById(id)
const fmt = (n, cur = 'USD') => {
  if (!n) return '미공개'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)
}
const fmtK = n => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`

// 타임존 유틸
function getUserTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const offset = -new Date().getTimezoneOffset() / 60
  return { tz, offset, label: `UTC${offset >= 0 ? '+' : ''}${offset}` }
}

function calcTimezoneOverlap(userOffset, requiredTimezone, preferredTimezones) {
  // UTC 오프셋 파싱
  const parseOffset = (tzStr) => {
    if (!tzStr) return null
    const match = tzStr.match(/UTC([+-])(\d+\.?\d*)/)
    if (!match) return null
    return parseFloat(match[1] + match[2])
  }

  const WORKDAY_START = 9 // 오전 9시
  const WORKDAY_END = 18  // 오후 6시

  // 사용자 근무 시간 (UTC 기준)
  const userStart = ((WORKDAY_START - userOffset) % 24 + 24) % 24
  const userEnd = ((WORKDAY_END - userOffset) % 24 + 24) % 24

  // 회사 요구 타임존
  let companyOffset = null
  if (requiredTimezone) {
    companyOffset = parseOffset(requiredTimezone)
  } else if (preferredTimezones && preferredTimezones.length > 0) {
    // 선호 타임존 중 첫 번째로 계산
    companyOffset = parseOffset(preferredTimezones[0])
  }

  if (companyOffset === null) return { hours: 24, label: '시간 제약 없음', color: '#14b8a6' }

  const compStart = ((WORKDAY_START - companyOffset) % 24 + 24) % 24
  const compEnd = ((WORKDAY_END - companyOffset) % 24 + 24) % 24

  // 겹치는 시간 계산
  const overlap = calcIntervalOverlap(userStart, userEnd, compStart, compEnd)

  return {
    hours: overlap,
    label: overlap === 0 ? '시간대 충돌' : overlap < 4 ? `${overlap}시간 겹침 (주의)` : `${overlap}시간 겹침`,
    color: overlap === 0 ? '#ef4444' : overlap < 4 ? '#f59e0b' : '#14b8a6',
    userStart, userEnd, compStart, compEnd,
    userOffset, companyOffset
  }
}

function calcIntervalOverlap(s1, e1, s2, e2) {
  const normalize = (s, e) => {
    const times = []
    if (s <= e) {
      for (let i = s; i < e; i++) times.push(i)
    } else {
      for (let i = s; i < 24; i++) times.push(i)
      for (let i = 0; i < e; i++) times.push(i)
    }
    return new Set(times)
  }
  const set1 = normalize(s1, e1)
  const set2 = normalize(s2, e2)
  let count = 0
  set1.forEach(h => { if (set2.has(h)) count++ })
  return count
}

// 매칭 점수 계산
function calcMatchScore(job) {
  let score = 60 // 기본
  const userTz = state.userTimezone

  // 시간대 호환성
  const overlap = calcTimezoneOverlap(
    userTz?.offset || 9,
    job.required_timezone,
    job.preferred_timezones
  )
  if (overlap.hours >= 8) score += 20
  else if (overlap.hours >= 4) score += 10
  else if (overlap.hours === 0) score -= 20

  // 완전 원격
  if (job.remote_type === 'fully_remote') score += 10
  else if (job.remote_type === 'hybrid') score -= 5

  // 비동기 비율
  if (job.async_work_percentage >= 70) score += 5
  if (job.equipment_provided) score += 3
  if (job.coworking_budget > 0) score += 2

  return Math.min(99, Math.max(50, score))
}

// 배지 HTML
function remoteBadge(type) {
  const map = {
    fully_remote: ['badge-remote', '🌍 완전 원격'],
    timezone_limited: ['badge-remote-limited', '🕐 시간제 원격'],
    hybrid: ['badge-hybrid', '🏢 하이브리드']
  }
  const [cls, label] = map[type] || ['badge-remote', type]
  return `<span class="badge ${cls} px-2 py-0.5 rounded-full text-xs font-semibold">${label}</span>`
}

function contractBadge(type) {
  const map = {
    full_time: ['badge-fulltime', '정규직'],
    part_time: ['badge-fulltime', '파트타임'],
    contract: ['badge-contract', '계약직'],
    freelance: ['badge-freelance', '프리랜서'],
    project: ['badge-contract', '프로젝트']
  }
  const [cls, label] = map[type] || ['', type]
  return `<span class="badge ${cls} px-2 py-0.5 rounded-full text-xs font-semibold">${label}</span>`
}

function levelBadge(level) {
  const map = { entry: '입문', junior: '주니어', mid: '미드레벨', senior: '시니어', lead: '리드', any: '무관' }
  return `<span class="text-xs text-gray-500 font-medium">${map[level] || level}</span>`
}

function formatSalary(job) {
  if (!job.salary_min && !job.salary_max) return '협의'
  const period = job.salary_period === 'hourly' ? '/hr' : job.salary_period === 'monthly' ? '/월' : '/년'
  if (job.salary_min && job.salary_max) {
    return `${fmtK(job.salary_min)} - ${fmtK(job.salary_max)} ${job.salary_currency}${period}`
  }
  return `${fmtK(job.salary_min || job.salary_max)} ${job.salary_currency}${period}`
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days/7)}주 전`
  return `${Math.floor(days/30)}개월 전`
}

function categoryIcon(cat) {
  const icons = { Engineering: 'fa-code', Design: 'fa-palette', Marketing: 'fa-bullhorn', Product: 'fa-box', Operations: 'fa-cogs', Data: 'fa-chart-bar', Sales: 'fa-handshake' }
  return icons[cat] || 'fa-briefcase'
}

function companyLetter(name) {
  return name ? name[0].toUpperCase() : '?'
}

function companyColor(name) {
  const colors = ['#0d9488', '#7c3aed', '#db2777', '#d97706', '#2563eb', '#16a34a', '#dc2626', '#0891b2']
  const idx = (name || '').charCodeAt(0) % colors.length
  return colors[idx]
}

// ===== 렌더링 함수 =====

function renderApp() {
  const app = document.getElementById('app')
  app.innerHTML = `
    ${renderNav()}
    <main id="main-content">
      ${renderPage()}
    </main>
    ${renderFooter()}
  `
  bindEvents()
}

function renderNav() {
  const pages = [
    { id: 'home', label: '홈', icon: 'fa-home' },
    { id: 'jobs', label: '채용 공고', icon: 'fa-briefcase' },
    { id: 'companies', label: '기업', icon: 'fa-building' },
    { id: 'calculator', label: '급여 계산기', icon: 'fa-calculator' }
  ]
  return `
  <nav class="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-8">
          <button onclick="navigate('home')" class="flex items-center gap-2">
            <div class="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <i class="fas fa-globe text-white text-sm"></i>
            </div>
            <span class="font-bold text-xl gradient-text">NomaWork</span>
          </button>
          <div class="hidden md:flex items-center gap-6">
            ${pages.map(p => `
              <button onclick="navigate('${p.id}')"
                class="nav-link text-sm font-medium ${state.page === p.id ? 'active text-nomad-600' : 'text-gray-600 hover:text-nomad-600'} transition-colors">
                <i class="fas ${p.icon} mr-1.5 text-xs"></i>${p.label}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <i class="fas fa-map-marker-alt text-nomad-500"></i>
            <span>${state.userTimezone?.label || 'UTC+9'}</span>
          </div>
          <button onclick="navigate('jobs')" class="hidden sm:block bg-nomad-500 hover:bg-nomad-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            공고 찾기
          </button>
        </div>
      </div>
    </div>
    <!-- 모바일 하단 탭 -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      ${pages.map(p => `
        <button onclick="navigate('${p.id}')" class="flex-1 flex flex-col items-center py-2 ${state.page === p.id ? 'text-nomad-600' : 'text-gray-400'}">
          <i class="fas ${p.icon} text-lg"></i>
          <span class="text-xs mt-0.5">${p.label}</span>
        </button>
      `).join('')}
    </div>
  </nav>
  `
}

function renderPage() {
  if (state.page === 'home') return renderHome()
  if (state.page === 'jobs') return renderJobs()
  if (state.page === 'job-detail') return renderJobDetail()
  if (state.page === 'calculator') return renderCalculator()
  if (state.page === 'companies') return renderCompanies()
  return renderHome()
}

// ===== 홈 페이지 =====
function renderHome() {
  return `
  <div class="pb-20 md:pb-0">
    <!-- 히어로 -->
    <section class="hero-gradient text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm mb-6">
            <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>지금 ${state.pagination.total || 15}개 이상의 공고가 활성화 중</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            어디서든 일하는<br>
            <span class="text-nomad-200">당신을 위한 채용</span>
          </h1>
          <p class="text-lg text-white/80 mb-8 leading-relaxed">
            시차 매칭, 글로벌 급여 계산, 비동기 채용까지.<br>
            디지털 노마드를 위한 완전히 다른 채용 플랫폼.
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1 max-w-md">
              <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="text" id="hero-search" placeholder="포지션, 기술 스택, 기업명..."
                class="w-full pl-10 pr-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none shadow-lg"
                onkeydown="if(event.key==='Enter') { state.filters.q=this.value; navigate('jobs') }">
            </div>
            <button onclick="state.filters.q=$('hero-search').value; navigate('jobs')"
              class="bg-white text-nomad-700 hover:bg-nomad-50 font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-lg whitespace-nowrap">
              <i class="fas fa-search mr-2"></i>공고 검색
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            ${['React', 'Python', 'Product Design', 'Marketing', 'Node.js'].map(s => `
              <button onclick="state.filters.q='${s}'; navigate('jobs')"
                class="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-colors">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- 통계 -->
    <section class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          ${[
            { icon: 'fa-briefcase', value: '15+', label: '활성 공고', color: 'text-nomad-500' },
            { icon: 'fa-building', value: '15', label: '파트너 기업', color: 'text-purple-500' },
            { icon: 'fa-globe', value: '40+', label: '지원 국가', color: 'text-blue-500' },
            { icon: 'fa-percent', value: '87%', label: '평균 매칭률', color: 'text-orange-500' }
          ].map(s => `
            <div class="stat-card text-center p-4 rounded-xl bg-gray-50">
              <i class="fas ${s.icon} ${s.color} text-2xl mb-2"></i>
              <div class="text-2xl font-bold text-gray-800">${s.value}</div>
              <div class="text-sm text-gray-500">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- 추천 공고 -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">추천 공고</h2>
          <p class="text-gray-500 text-sm mt-1">당신의 타임존에 맞는 최고의 기회들</p>
        </div>
        <button onclick="navigate('jobs')" class="text-nomad-600 hover:text-nomad-700 text-sm font-medium">
          전체 보기 <i class="fas fa-arrow-right ml-1"></i>
        </button>
      </div>
      <div id="featured-jobs" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${state.loading ? renderLoading() : ''}
      </div>
    </section>

    <!-- 카테고리 -->
    <section class="bg-gray-50 py-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">직무별 탐색</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="category-grid">
          ${state.categories.map(cat => `
            <button onclick="state.filters.category='${cat.category}'; navigate('jobs')"
              class="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-all group">
              <div class="w-10 h-10 bg-nomad-100 group-hover:bg-nomad-500 rounded-lg flex items-center justify-center transition-colors">
                <i class="fas ${categoryIcon(cat.category)} text-nomad-600 group-hover:text-white transition-colors"></i>
              </div>
              <div class="text-left">
                <div class="font-medium text-gray-800 text-sm">${cat.category}</div>
                <div class="text-xs text-gray-400">${cat.count}개 공고</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- 노마드 특화 기능 -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">NomaWork만의 차별점</h2>
      <p class="text-gray-500 mb-8">기존 채용 플랫폼이 해결 못한 문제를 우리가 해결합니다</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${[
          {
            icon: 'fa-clock', color: 'bg-teal-50 text-teal-600',
            title: '시차 호환성 매칭',
            desc: '내 근무 시간과 회사 요구 시간대를 자동으로 분석해 겹치는 시간을 시각화합니다.'
          },
          {
            icon: 'fa-calculator', color: 'bg-purple-50 text-purple-600',
            title: '글로벌 급여 계산기',
            desc: '실시간 환율과 생활비 지수로 어느 도시에서든 실질 구매력을 계산합니다.'
          },
          {
            icon: 'fa-video', color: 'bg-blue-50 text-blue-600',
            title: '비동기 채용 프로세스',
            desc: '시차 없이 비디오 자기소개와 과제 기반 평가로 편한 시간에 지원하세요.'
          }
        ].map(f => `
          <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div class="w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4">
              <i class="fas ${f.icon} text-xl"></i>
            </div>
            <h3 class="font-bold text-gray-800 mb-2">${f.title}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">${f.desc}</p>
          </div>
        `).join('')}
      </div>
    </section>
  </div>
  `
}

// ===== 공고 목록 페이지 =====
function renderJobs() {
  return `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- 필터 사이드바 -->
      <aside class="lg:w-64 flex-shrink-0">
        <div class="bg-white rounded-2xl p-5 shadow-sm sticky top-20">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800">필터</h3>
            <button onclick="clearFilters()" class="text-xs text-nomad-600 hover:text-nomad-700">초기화</button>
          </div>

          <!-- 검색 -->
          <div class="mb-5">
            <div class="relative">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" id="search-input" value="${state.filters.q}"
                placeholder="포지션, 스킬, 기업..."
                class="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg search-input"
                oninput="state.filters.q=this.value"
                onkeydown="if(event.key==='Enter') loadJobs()">
            </div>
          </div>

          <!-- 원격 타입 -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">근무 형태</p>
            <div class="space-y-2">
              ${[
                { v: '', l: '전체' },
                { v: 'fully_remote', l: '🌍 완전 원격' },
                { v: 'timezone_limited', l: '🕐 시간제 원격' },
                { v: 'hybrid', l: '🏢 하이브리드' }
              ].map(o => `
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="remote_type" value="${o.v}"
                    ${state.filters.remote_type === o.v ? 'checked' : ''}
                    onchange="state.filters.remote_type=this.value; loadJobs()"
                    class="text-nomad-500 accent-teal-500">
                  <span class="text-sm text-gray-700">${o.l}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 계약 형태 -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">계약 형태</p>
            <div class="flex flex-wrap gap-1.5">
              ${[
                { v: '', l: '전체' },
                { v: 'full_time', l: '정규직' },
                { v: 'contract', l: '계약직' },
                { v: 'freelance', l: '프리랜서' }
              ].map(o => `
                <button onclick="state.filters.contract_type='${o.v}'; loadJobs()"
                  class="filter-chip text-xs px-3 py-1.5 border rounded-full ${state.filters.contract_type === o.v ? 'active' : 'border-gray-200 text-gray-600 hover:border-nomad-400'}">
                  ${o.l}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 경력 -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">경력 레벨</p>
            <div class="flex flex-wrap gap-1.5">
              ${[
                { v: '', l: '전체' },
                { v: 'entry', l: '입문' },
                { v: 'junior', l: '주니어' },
                { v: 'mid', l: '미드' },
                { v: 'senior', l: '시니어' },
                { v: 'lead', l: '리드' }
              ].map(o => `
                <button onclick="state.filters.experience_level='${o.v}'; loadJobs()"
                  class="filter-chip text-xs px-3 py-1.5 border rounded-full ${state.filters.experience_level === o.v ? 'active' : 'border-gray-200 text-gray-600 hover:border-nomad-400'}">
                  ${o.l}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 카테고리 -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">직무</p>
            <select id="cat-select" onchange="state.filters.category=this.value; loadJobs()"
              class="w-full text-sm border border-gray-200 rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:border-nomad-400">
              <option value="">전체 직무</option>
              ${state.categories.map(c => `<option value="${c.category}" ${state.filters.category === c.category ? 'selected' : ''}>${c.category} (${c.count})</option>`).join('')}
            </select>
          </div>

          <!-- 타임존 -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">타임존</p>
            <select id="tz-select" onchange="state.filters.timezone=this.value; loadJobs()"
              class="w-full text-sm border border-gray-200 rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:border-nomad-400">
              <option value="">전체 타임존</option>
              ${state.timezones.map(t => `<option value="${t.utc_label}" ${state.filters.timezone === t.utc_label ? 'selected' : ''}>${t.utc_label} - ${t.name}</option>`).join('')}
            </select>
          </div>

          <button onclick="loadJobs()" class="w-full bg-nomad-500 hover:bg-nomad-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-search mr-2"></i>검색하기
          </button>
        </div>
      </aside>

      <!-- 공고 목록 -->
      <div class="flex-1">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-800">채용 공고</h2>
            <p class="text-sm text-gray-500">총 ${state.pagination.total}개의 공고</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 hidden sm:block">내 타임존: ${state.userTimezone?.label || 'UTC+9'}</span>
          </div>
        </div>

        ${state.loading ? `<div class="flex justify-center py-20">${renderLoading()}</div>` : ''}
        <div id="jobs-list" class="grid grid-cols-1 md:grid-cols-2 gap-4 job-grid">
          ${!state.loading ? state.jobs.map(renderJobCard).join('') : ''}
        </div>

        <!-- 페이지네이션 -->
        ${state.pagination.total_pages > 1 ? renderPagination() : ''}
      </div>
    </div>
  </div>
  `
}

function renderJobCard(job) {
  const score = calcMatchScore(job)
  const overlap = calcTimezoneOverlap(
    state.userTimezone?.offset || 9,
    job.required_timezone,
    job.preferred_timezones
  )
  const scorePercent = `${score * 3.6}deg`

  return `
  <div class="job-card bg-white rounded-2xl p-5 shadow-sm border border-gray-100 fade-in"
    onclick="loadJobDetail('${job.slug}')">
    <!-- 상단: 기업 + 매칭 -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style="background: ${companyColor(job.company_name)}">
          ${companyLetter(job.company_name)}
        </div>
        <div>
          <div class="font-semibold text-gray-800 text-sm leading-tight">${job.company_name}</div>
          <div class="text-xs text-gray-400">${job.headquarters_country} · ${job.industry}</div>
        </div>
      </div>
      <div class="match-score flex-shrink-0" style="--score: ${scorePercent}">
        <span>${score}%</span>
      </div>
    </div>

    <!-- 포지션 -->
    <h3 class="font-bold text-gray-900 mb-2 leading-tight">${job.title}</h3>

    <!-- 배지 -->
    <div class="flex flex-wrap gap-1.5 mb-3">
      ${remoteBadge(job.remote_type)}
      ${contractBadge(job.contract_type)}
      ${levelBadge(job.experience_level)}
    </div>

    <!-- 급여 -->
    <div class="flex items-center justify-between mb-3">
      <div class="text-nomad-600 font-semibold text-sm">
        <i class="fas fa-dollar-sign mr-1"></i>${formatSalary(job)}
      </div>
      ${job.is_featured ? '<span class="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">⭐ 추천</span>' : ''}
    </div>

    <!-- 스킬 태그 -->
    <div class="flex flex-wrap gap-1 mb-3">
      ${(job.skills_required || []).slice(0, 3).map(s =>
        `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">${s}</span>`
      ).join('')}
      ${(job.skills_required || []).length > 3 ? `<span class="text-xs text-gray-400">+${(job.skills_required || []).length - 3}</span>` : ''}
    </div>

    <!-- 하단: 시차 + 날짜 -->
    <div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
      <div class="flex items-center gap-1" style="color: ${overlap.color}">
        <i class="fas fa-clock"></i>
        <span>${overlap.label}</span>
      </div>
      <div class="flex items-center gap-3">
        ${job.equipment_provided ? '<span title="장비 지원"><i class="fas fa-laptop text-gray-400"></i></span>' : ''}
        ${job.coworking_budget > 0 ? '<span title="코워킹 지원"><i class="fas fa-coffee text-gray-400"></i></span>' : ''}
        <span>${timeAgo(job.posted_at)}</span>
      </div>
    </div>
  </div>
  `
}

function renderPagination() {
  const { page, total_pages } = state.pagination
  const pages = []
  for (let i = Math.max(1, page - 2); i <= Math.min(total_pages, page + 2); i++) pages.push(i)

  return `
  <div class="flex items-center justify-center gap-2 mt-8">
    <button onclick="changePage(${page - 1})" class="page-btn px-3 py-2 border rounded-lg text-sm" ${page === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i>
    </button>
    ${pages.map(p => `
      <button onclick="changePage(${p})" class="page-btn px-4 py-2 border rounded-lg text-sm ${p === page ? 'active' : 'text-gray-600'}">${p}</button>
    `).join('')}
    <button onclick="changePage(${page + 1})" class="page-btn px-3 py-2 border rounded-lg text-sm" ${page === total_pages ? 'disabled' : ''}>
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
  `
}

// ===== 공고 상세 =====
function renderJobDetail() {
  const job = state.selectedJob
  if (!job) return `<div class="text-center py-20 text-gray-400">공고를 찾을 수 없습니다</div>`

  const overlap = calcTimezoneOverlap(
    state.userTimezone?.offset || 9,
    job.required_timezone,
    job.preferred_timezones
  )

  return `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
    <button onclick="navigate('jobs')" class="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
      <i class="fas fa-arrow-left"></i> 공고 목록으로
    </button>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- 메인 컨텐츠 -->
      <div class="flex-1 space-y-5">
        <!-- 헤더 카드 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
              style="background: ${companyColor(job.company_name)}">
              ${companyLetter(job.company_name)}
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 leading-tight">${job.title}</h1>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="font-semibold text-gray-700">${job.company_name}</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-500 text-sm">${job.headquarters_country}</span>
                ${job.company_rating ? `
                <span class="text-gray-400">·</span>
                <span class="text-yellow-500 text-sm"><i class="fas fa-star mr-0.5"></i>${job.company_rating}</span>
                ` : ''}
              </div>
            </div>
            ${job.is_featured ? '<span class="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">⭐ Featured</span>' : ''}
          </div>

          <div class="flex flex-wrap gap-2 mb-4">
            ${remoteBadge(job.remote_type)}
            ${contractBadge(job.contract_type)}
            ${levelBadge(job.experience_level)}
            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">${job.category}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <div class="text-xs text-gray-500 mb-1">연봉</div>
              <div class="font-bold text-nomad-600">${formatSalary(job)}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 mb-1">비동기 비율</div>
              <div class="font-bold text-gray-800">${job.async_work_percentage}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 mb-1">월 미팅 횟수</div>
              <div class="font-bold text-gray-800">${job.monthly_meeting_count}회</div>
            </div>
            ${job.equipment_provided ? `<div><div class="text-xs text-gray-500 mb-1">장비 지원</div><div class="font-bold text-green-600">✓ 지원</div></div>` : ''}
            ${job.coworking_budget > 0 ? `<div><div class="text-xs text-gray-500 mb-1">코워킹 예산</div><div class="font-bold text-green-600">$${job.coworking_budget}/월</div></div>` : ''}
          </div>
        </div>

        <!-- 시차 호환성 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <h2 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-clock text-nomad-500"></i> 시차 호환성 분석
          </h2>
          ${renderTimezoneViz(overlap, job)}
        </div>

        <!-- 포지션 설명 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-align-left text-nomad-500"></i> 포지션 소개
          </h2>
          <p class="text-gray-600 leading-relaxed text-sm">${job.description}</p>
        </div>

        <!-- 요구사항 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-check-circle text-nomad-500"></i> 자격 요건
          </h2>
          <ul class="space-y-2">
            ${parseJsonList(job.requirements).map(r => `
              <li class="flex items-start gap-2 text-sm text-gray-600">
                <i class="fas fa-check text-nomad-500 mt-0.5 flex-shrink-0 text-xs"></i>
                <span>${r}</span>
              </li>
            `).join('')}
          </ul>
          ${job.nice_to_have ? `
          <h3 class="font-semibold text-gray-700 mt-4 mb-2 text-sm">우대 사항</h3>
          <ul class="space-y-1">
            ${parseJsonList(job.nice_to_have).map(r => `
              <li class="flex items-start gap-2 text-sm text-gray-500">
                <i class="fas fa-plus text-blue-400 mt-0.5 flex-shrink-0 text-xs"></i>
                <span>${r}</span>
              </li>
            `).join('')}
          </ul>` : ''}
        </div>

        <!-- 기술 스택 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-code text-nomad-500"></i> 기술 스택
          </h2>
          <div class="mb-2">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">필수</span>
            <div class="flex flex-wrap mt-2">${(job.skills_required || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
          </div>
          ${(job.skills_preferred || []).length > 0 ? `
          <div class="mt-3">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">우대</span>
            <div class="flex flex-wrap mt-2">
              ${(job.skills_preferred || []).map(s => `<span class="skill-tag" style="background:#f8f8f8;color:#666;border-color:#e5e7eb">${s}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>

        <!-- 협업 툴 -->
        ${(job.tools || []).length > 0 ? `
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-tools text-nomad-500"></i> 사용 협업 툴
          </h2>
          <div class="flex flex-wrap gap-2">
            ${(job.tools || []).map(t => `
              <span class="flex items-center gap-1.5 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">
                <i class="fas fa-plug text-xs text-gray-400"></i>${t}
              </span>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- 유사 공고 -->
        ${job.similar_jobs && job.similar_jobs.length > 0 ? `
        <div class="bg-white rounded-2xl p-6 shadow-sm fade-in">
          <h2 class="font-bold text-gray-800 mb-4">비슷한 포지션</h2>
          <div class="space-y-3">
            ${job.similar_jobs.map(sj => `
              <div onclick="loadJobDetail('${sj.slug}')" class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style="background: ${companyColor(sj.company_name)}">
                  ${companyLetter(sj.company_name)}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-800 text-sm truncate">${sj.title}</div>
                  <div class="text-xs text-gray-500">${sj.company_name} · ${sj.headquarters_country}</div>
                </div>
                <div class="text-xs text-nomad-600 font-medium">${formatSalary(sj)}</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- 사이드바: 지원하기 -->
      <aside class="lg:w-72 flex-shrink-0">
        <div class="bg-white rounded-2xl p-6 shadow-sm sticky top-20 space-y-4">
          <!-- 매칭 점수 크게 -->
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-2"
              style="background: conic-gradient(#14b8a6 ${calcMatchScore(job) * 3.6}deg, #e2e8f0 0deg)">
              <div class="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-nomad-600">${calcMatchScore(job)}%</span>
                <span class="text-xs text-gray-400">매칭</span>
              </div>
            </div>
            <p class="text-sm text-gray-600">${calcMatchScore(job) >= 85 ? '🎉 매우 높은 매칭률!' : calcMatchScore(job) >= 70 ? '👍 좋은 매칭!' : '검토해보세요'}</p>
          </div>

          <button class="w-full bg-nomad-500 hover:bg-nomad-600 text-white font-semibold py-3 rounded-xl transition-colors">
            <i class="fas fa-paper-plane mr-2"></i>지원하기
          </button>
          <button class="w-full border border-gray-200 text-gray-600 hover:border-nomad-400 hover:text-nomad-600 font-medium py-3 rounded-xl transition-colors text-sm">
            <i class="fas fa-bookmark mr-2"></i>저장하기
          </button>

          <div class="pt-4 border-t border-gray-100 space-y-3 text-sm">
            <div class="flex items-center gap-2 text-gray-600">
              <i class="fas fa-clock text-gray-400 w-4"></i>
              <span>마감: ${job.expires_at ? new Date(job.expires_at).toLocaleDateString('ko') : '마감 없음'}</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <i class="fas fa-users text-gray-400 w-4"></i>
              <span>지원자 ${job.applicant_count}명</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <i class="fas fa-eye text-gray-400 w-4"></i>
              <span>조회 ${job.view_count}회</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <i class="fas fa-calendar text-gray-400 w-4"></i>
              <span>${timeAgo(job.posted_at)} 게시</span>
            </div>
          </div>

          <!-- 회사 정보 요약 -->
          <div class="pt-4 border-t border-gray-100">
            <h3 class="font-semibold text-gray-700 mb-3 text-sm">기업 정보</h3>
            <div class="space-y-2 text-xs text-gray-500">
              <div class="flex items-center gap-2">
                <i class="fas fa-industry w-3"></i>${job.industry}
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-map-marker-alt w-3"></i>${job.headquarters_city || job.headquarters_country}
              </div>
              ${job.remote_policy ? `
              <div class="flex items-center gap-2">
                <i class="fas fa-home w-3"></i>${
                  {fully_remote:'완전 원격', remote_first:'원격 우선', hybrid:'하이브리드'}[job.remote_policy] || job.remote_policy
                }
              </div>` : ''}
              ${job.company_rating ? `
              <div class="flex items-center gap-2">
                <i class="fas fa-star text-yellow-500 w-3"></i>${job.company_rating} / 5.0 (${job.review_count}개 리뷰)
              </div>` : ''}
            </div>
          </div>

          <button onclick="navigate('calculator')"
            class="w-full border border-nomad-200 text-nomad-600 hover:bg-nomad-50 text-sm py-2.5 rounded-xl transition-colors">
            <i class="fas fa-calculator mr-2"></i>이 급여 계산해보기
          </button>
        </div>
      </aside>
    </div>
  </div>
  `
}

function renderTimezoneViz(overlap, job) {
  const userOffset = state.userTimezone?.offset || 9
  const labels = []
  for (let i = 0; i <= 24; i += 3) labels.push(`${i}시`)

  // 근무 시간 블록 위치 계산
  const TOTAL_HOURS = 24
  const toPercent = (h) => ((h % 24) / TOTAL_HOURS * 100).toFixed(1) + '%'
  const toWidth = (s, e) => {
    if (s === undefined) return '37.5%' // 기본 9시간 / 24 * 100
    const hours = s <= e ? e - s : 24 - s + e
    return (hours / TOTAL_HOURS * 100).toFixed(1) + '%'
  }

  const statusIcon = overlap.hours >= 8 ? '✅' : overlap.hours >= 4 ? '⚠️' : overlap.hours === 0 ? '❌' : '⚠️'
  const statusText = overlap.hours >= 8 ? '완벽한 시차 매칭' : overlap.hours >= 4 ? '시차 고려 필요' : overlap.hours === 24 ? '시간 제약 없음' : '시차 부적합 가능성'

  return `
  <div class="space-y-4">
    <!-- 상태 표시 -->
    <div class="flex items-center gap-3 p-3 rounded-xl" style="background: ${overlap.color}18">
      <span class="text-2xl">${statusIcon}</span>
      <div>
        <div class="font-semibold text-gray-800">${statusText}</div>
        <div class="text-sm text-gray-500">${overlap.label}</div>
      </div>
    </div>

    <!-- 타임라인 시각화 -->
    <div>
      <div class="flex justify-between text-xs text-gray-400 mb-1">
        ${['0시', '6시', '12시', '18시', '24시'].map(l => `<span>${l}</span>`).join('')}
      </div>

      <!-- 사용자 근무 시간 -->
      <div class="mb-2">
        <div class="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <span class="w-3 h-3 rounded bg-indigo-300 inline-block"></span>
          내 근무 시간 (${state.userTimezone?.label || 'UTC+9'} 오전 9시 - 오후 6시)
        </div>
        <div class="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          ${overlap.userStart !== undefined ? `
          <div class="absolute h-full bg-indigo-300 rounded opacity-80 flex items-center justify-center text-white text-xs font-medium"
            style="left: ${toPercent(overlap.userStart)}; width: ${toWidth(overlap.userStart, overlap.userEnd)}">
            9h
          </div>` : `
          <div class="absolute h-full bg-indigo-300 rounded opacity-80" style="left: 0%; width: 37.5%"></div>`}
        </div>
      </div>

      <!-- 회사 근무 시간 -->
      <div class="mb-2">
        <div class="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <span class="w-3 h-3 rounded inline-block" style="background: ${overlap.color}"></span>
          회사 근무 시간 (${job.required_timezone || (job.preferred_timezones || [])[0] || '제약 없음'})
        </div>
        <div class="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          ${overlap.compStart !== undefined && overlap.hours < 24 ? `
          <div class="absolute h-full rounded opacity-80 flex items-center justify-center text-white text-xs font-medium"
            style="left: ${toPercent(overlap.compStart)}; width: ${toWidth(overlap.compStart, overlap.compEnd)}; background: ${overlap.color}">
            9h
          </div>` : `
          <div class="absolute h-full rounded opacity-40 flex items-center justify-center text-gray-600 text-xs" style="left: 0; right: 0; background: #14b8a620">
            시간 제약 없음
          </div>`}
        </div>
      </div>

      <!-- 겹치는 시간 -->
      ${overlap.hours > 0 && overlap.hours < 24 ? `
      <div class="p-3 bg-nomad-50 rounded-lg text-sm text-nomad-800">
        <i class="fas fa-handshake mr-2 text-nomad-500"></i>
        협업 가능 시간: <strong>${overlap.hours}시간</strong>
        ${overlap.hours >= 4 ? '— 원활한 협업이 가능합니다.' : '— 비동기 업무 비중이 높습니다.'}
      </div>` : ''}
    </div>

    <div class="grid grid-cols-3 gap-3 text-center text-sm">
      <div class="bg-gray-50 rounded-lg p-3">
        <div class="font-bold text-gray-800">${job.async_work_percentage}%</div>
        <div class="text-xs text-gray-500">비동기 업무</div>
      </div>
      <div class="bg-gray-50 rounded-lg p-3">
        <div class="font-bold text-gray-800">${job.monthly_meeting_count}회</div>
        <div class="text-xs text-gray-500">월간 미팅</div>
      </div>
      <div class="bg-gray-50 rounded-lg p-3">
        <div class="font-bold text-gray-800">${overlap.hours < 24 ? overlap.hours + 'h' : '자유'}</div>
        <div class="text-xs text-gray-500">겹치는 시간</div>
      </div>
    </div>
  </div>
  `
}

// ===== 급여 계산기 =====
function renderCalculator() {
  return `
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        <i class="fas fa-calculator text-nomad-500 mr-3"></i>글로벌 급여 계산기
      </h1>
      <p class="text-gray-500">실시간 환율과 생활비 지수로 실질 구매력을 계산하세요</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 입력 패널 -->
      <div class="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 class="font-bold text-gray-800">급여 정보</h2>

        <!-- 급여 금액 -->
        <div>
          <label class="text-sm font-medium text-gray-700 mb-2 block">급여 금액</label>
          <div class="flex gap-2">
            <select id="calc-currency" class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-nomad-400">
              ${['USD','EUR','GBP','KRW','JPY','SGD','AUD','CAD'].map(c =>
                `<option value="${c}" ${c==='USD'?'selected':''}>${c}</option>`
              ).join('')}
            </select>
            <input type="number" id="calc-salary" value="100000" min="0"
              class="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-nomad-400">
          </div>
        </div>

        <!-- 급여 기간 -->
        <div>
          <label class="text-sm font-medium text-gray-700 mb-2 block">지급 주기</label>
          <div class="flex gap-2">
            ${[['yearly','연봉'],['monthly','월급'],['hourly','시급']].map(([v,l]) => `
              <button id="period-${v}" onclick="selectPeriod('${v}')"
                class="flex-1 py-2.5 text-sm font-medium border rounded-lg transition-colors
                  ${v==='yearly' ? 'bg-nomad-500 text-white border-nomad-500' : 'border-gray-200 text-gray-600 hover:border-nomad-400'}">
                ${l}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 거주 도시 -->
        <div>
          <label class="text-sm font-medium text-gray-700 mb-2 block">거주 예정 도시</label>
          <select id="calc-city" class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-nomad-400">
            <option value="">도시 선택 (생활비 비교)</option>
            ${[
              ['🇺🇸', 'New York'], ['🇺🇸', 'San Francisco'], ['🇺🇸', 'Austin'],
              ['🇬🇧', 'London'], ['🇩🇪', 'Berlin'], ['🇳🇱', 'Amsterdam'],
              ['🇵🇹', 'Lisbon'], ['🇪🇸', 'Barcelona'], ['🇹🇭', 'Bangkok'],
              ['🇹🇭', 'Chiang Mai'], ['🇻🇳', 'Ho Chi Minh City'], ['🇮🇩', 'Bali'],
              ['🇲🇽', 'Mexico City'], ['🇨🇴', 'Medellin'], ['🇰🇷', 'Seoul'],
              ['🇯🇵', 'Tokyo'], ['🇸🇬', 'Singapore'], ['🇦🇺', 'Sydney'],
              ['🇨🇦', 'Toronto'], ['🇵🇱', 'Warsaw'], ['🇬🇪', 'Tbilisi']
            ].map(([flag, city]) => `<option value="${city}">${flag} ${city}</option>`).join('')}
          </select>
        </div>

        <!-- 표시 통화 -->
        <div>
          <label class="text-sm font-medium text-gray-700 mb-2 block">결과 표시 통화</label>
          <select id="calc-target-currency" class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-nomad-400">
            ${[['USD','🇺🇸 달러 (USD)'],['EUR','🇪🇺 유로 (EUR)'],['GBP','🇬🇧 파운드 (GBP)'],['KRW','🇰🇷 원 (KRW)'],['JPY','🇯🇵 엔 (JPY)'],['SGD','🇸🇬 싱가포르 달러 (SGD)']].map(([v,l]) =>
              `<option value="${v}">${l}</option>`
            ).join('')}
          </select>
        </div>

        <button onclick="calcSalary()" 
          class="w-full bg-nomad-500 hover:bg-nomad-600 text-white font-semibold py-3.5 rounded-xl transition-colors">
          <i class="fas fa-calculator mr-2"></i>계산하기
        </button>
      </div>

      <!-- 결과 패널 -->
      <div class="space-y-4">
        <div id="calc-result" class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="text-center py-8 text-gray-400">
            <i class="fas fa-calculator text-4xl mb-3 block"></i>
            <p>급여 정보를 입력하고 계산하기를 누르세요</p>
          </div>
        </div>

        <!-- 노마드 도시 비교 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h3 class="font-bold text-gray-800 mb-4">🌏 노마드 인기 도시 생활비</h3>
          <div class="space-y-3" id="city-comparison">
            ${renderCityComparison()}
          </div>
        </div>
      </div>
    </div>
  </div>
  `
}

let calcPeriod = 'yearly'
function selectPeriod(period) {
  calcPeriod = period
  document.querySelectorAll('[id^="period-"]').forEach(btn => {
    btn.className = 'flex-1 py-2.5 text-sm font-medium border rounded-lg transition-colors border-gray-200 text-gray-600 hover:border-nomad-400'
  })
  const active = document.getElementById(`period-${period}`)
  if (active) active.className = 'flex-1 py-2.5 text-sm font-medium border rounded-lg transition-colors bg-nomad-500 text-white border-nomad-500'
}

function renderCityComparison() {
  const cities = [
    { name: 'Bali', budget: 1300, flag: '🇮🇩' },
    { name: 'Chiang Mai', budget: 1200, flag: '🇹🇭' },
    { name: 'Tbilisi', budget: 1400, flag: '🇬🇪' },
    { name: 'Lisbon', budget: 2200, flag: '🇵🇹' },
    { name: 'Barcelona', budget: 2400, flag: '🇪🇸' },
    { name: 'Seoul', budget: 3000, flag: '🇰🇷' },
    { name: 'New York', budget: 4500, flag: '🇺🇸' },
    { name: 'Singapore', budget: 4000, flag: '🇸🇬' }
  ]
  const max = Math.max(...cities.map(c => c.budget))
  return cities.map(c => `
    <div>
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-gray-700">${c.flag} ${c.name}</span>
        <span class="font-medium text-gray-800">$${c.budget.toLocaleString()}/월</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2">
        <div class="h-2 rounded-full transition-all" style="width: ${(c.budget/max*100).toFixed(0)}%; background: ${c.budget < 1500 ? '#10b981' : c.budget < 2500 ? '#14b8a6' : c.budget < 3500 ? '#f59e0b' : '#ef4444'}"></div>
      </div>
    </div>
  `).join('')
}

async function calcSalary() {
  const salary = parseFloat(document.getElementById('calc-salary').value)
  const currency = document.getElementById('calc-currency').value
  const city = document.getElementById('calc-city').value
  const targetCurrency = document.getElementById('calc-target-currency').value

  if (!salary || salary <= 0) {
    document.getElementById('calc-result').innerHTML = `<div class="text-center py-8 text-red-400"><i class="fas fa-exclamation-circle text-3xl mb-3 block"></i>급여를 입력하세요</div>`
    return
  }

  document.getElementById('calc-result').innerHTML = `<div class="flex justify-center py-12"><div class="spinner"></div></div>`

  try {
    const res = await axios.post(`${API}/salary/calculate`, { salary, currency, period: calcPeriod, city, target_currency: targetCurrency })
    const d = res.data
    renderCalcResult(d, targetCurrency, city)
  } catch (e) {
    document.getElementById('calc-result').innerHTML = `<div class="text-center py-8 text-red-400">계산 중 오류 발생</div>`
  }
}

function renderCalcResult(d, targetCurrency, city) {
  const symbols = { USD: '$', EUR: '€', GBP: '£', KRW: '₩', JPY: '¥', SGD: 'S$', AUD: 'A$', CAD: 'C$' }
  const sym = symbols[targetCurrency] || '$'
  const fmtNum = (n) => n ? n.toLocaleString() : '0'

  document.getElementById('calc-result').innerHTML = `
  <div class="space-y-4 fade-in">
    <h3 class="font-bold text-gray-800">계산 결과</h3>

    <!-- 연봉 -->
    <div class="p-4 bg-nomad-50 rounded-xl text-center">
      <div class="text-xs text-gray-500 mb-1">연간 총 급여 (${targetCurrency})</div>
      <div class="text-3xl font-bold text-nomad-600">${sym}${fmtNum(d.annual_target)}</div>
      <div class="text-sm text-gray-500 mt-1">월 ${sym}${fmtNum(d.monthly_target)}</div>
    </div>

    <!-- 세금/실수령 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-3 bg-gray-50 rounded-xl text-center">
        <div class="text-xs text-gray-500 mb-1">예상 세율</div>
        <div class="text-xl font-bold text-orange-500">~${d.estimated_tax_rate}%</div>
      </div>
      <div class="p-3 bg-gray-50 rounded-xl text-center">
        <div class="text-xs text-gray-500 mb-1">세후 월급 (USD)</div>
        <div class="text-xl font-bold text-green-600">${fmtNum(d.after_tax_monthly_usd)}</div>
      </div>
    </div>

    ${city && d.city_cost_index ? `
    <!-- 생활비 분석 -->
    <div class="p-4 bg-blue-50 rounded-xl">
      <div class="font-semibold text-blue-800 mb-3">🏙️ ${city} 생활비 분석</div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">생활비 지수 (뉴욕=100)</span>
          <span class="font-semibold">${d.city_cost_index}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">편안한 생활 예산</span>
          <span class="font-semibold">$${fmtNum(d.monthly_living_budget_usd)}/월</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">뉴욕 대비 구매력</span>
          <span class="font-semibold text-nomad-600">${d.purchasing_power_ratio}배</span>
        </div>
        ${d.estimated_savings_ratio !== null ? `
        <div class="flex justify-between">
          <span class="text-gray-600">예상 저축률</span>
          <span class="font-semibold ${d.estimated_savings_ratio > 30 ? 'text-green-600' : d.estimated_savings_ratio > 0 ? 'text-yellow-600' : 'text-red-500'}">${d.estimated_savings_ratio}%</span>
        </div>` : ''}
      </div>

      ${d.estimated_savings_ratio !== null ? `
      <div class="mt-3 p-2 rounded-lg text-xs ${d.estimated_savings_ratio > 30 ? 'bg-green-100 text-green-700' : d.estimated_savings_ratio > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">
        ${d.estimated_savings_ratio > 30 ? '💚 저축 여유가 충분합니다!' : d.estimated_savings_ratio > 0 ? '💛 적당한 생활이 가능합니다.' : '❤️ 예산이 부족할 수 있어요.'}
      </div>` : ''}
    </div>` : ''}

    <div class="text-xs text-gray-400 text-center">* 세금은 추정값입니다. 실제 세금은 거주 국가에 따라 다릅니다.</div>
  </div>
  `
}

// ===== 기업 목록 =====
function renderCompanies() {
  return `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">원격 친화 기업</h1>
    <p class="text-gray-500 mb-8">검증된 글로벌 리모트 기업들을 만나보세요</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="companies-grid">
      ${state.loading ? renderLoading() : state.companies.map(renderCompanyCard).join('')}
    </div>
  </div>
  `
}

function renderCompanyCard(co) {
  const policyMap = { fully_remote: '🌍 완전 원격', remote_first: '🚀 원격 우선', hybrid: '🏢 하이브리드' }
  return `
  <div class="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer fade-in"
    onclick="loadCompanyJobs(${co.id}, '${co.name}')">
    <div class="flex items-start gap-3 mb-4">
      <div class="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
        style="background: ${companyColor(co.name)}">
        ${companyLetter(co.name)}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-gray-900 truncate">${co.name}</h3>
        <div class="text-sm text-gray-500">${co.industry}</div>
        <div class="flex items-center gap-1 text-sm mt-0.5">
          ${co.rating ? `<i class="fas fa-star text-yellow-400 text-xs"></i><span class="font-medium text-gray-700">${co.rating}</span>` : ''}
          ${co.review_count ? `<span class="text-gray-400 text-xs">(${co.review_count})</span>` : ''}
        </div>
      </div>
    </div>
    <p class="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">${co.description || ''}</p>
    <div class="flex items-center justify-between text-xs">
      <span class="text-gray-500">📍 ${co.headquarters_country}</span>
      <span class="bg-nomad-50 text-nomad-700 px-2 py-1 rounded-full font-medium">${policyMap[co.remote_policy] || '리모트'}</span>
    </div>
    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
      <span class="text-xs text-gray-500">직원 ${co.size || '미공개'}</span>
      <span class="text-xs font-semibold text-nomad-600">${co.job_count || 0}개 공고</span>
    </div>
  </div>
  `
}

function renderFooter() {
  return `
  <footer class="bg-gray-900 text-gray-400 py-10 mt-12 hidden md:block">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex flex-col md:flex-row items-center justify-between">
        <div class="flex items-center gap-2 mb-4 md:mb-0">
          <div class="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
            <i class="fas fa-globe text-white text-sm"></i>
          </div>
          <span class="text-white font-bold text-lg">NomaWork</span>
          <span class="text-xs text-gray-500 ml-2">디지털 노마드 채용 플랫폼</span>
        </div>
        <div class="flex items-center gap-6 text-sm">
          <span>이용약관</span>
          <span>개인정보처리방침</span>
          <span>문의하기</span>
        </div>
      </div>
      <div class="mt-6 text-center text-xs text-gray-600">© 2024 NomaWork. Work from anywhere.</div>
    </div>
  </footer>
  `
}

function renderLoading() {
  return `<div class="flex justify-center py-12"><div class="spinner"></div></div>`
}

function parseJsonList(val) {
  try {
    const arr = JSON.parse(val)
    return Array.isArray(arr) ? arr : [val]
  } catch {
    return val ? val.split('\n').filter(Boolean) : []
  }
}

// ===== 데이터 로딩 =====
async function loadMeta() {
  try {
    const [catsRes, tzRes] = await Promise.all([
      axios.get(`${API}/jobs/meta/categories`),
      axios.get(`${API}/jobs/meta/timezones`)
    ])
    state.categories = catsRes.data
    state.timezones = tzRes.data
  } catch (e) { console.error('Meta load failed', e) }
}

async function loadJobs() {
  state.loading = true
  renderApp()
  try {
    const params = new URLSearchParams()
    Object.entries(state.filters).forEach(([k, v]) => { if (v) params.append(k, v) })
    params.append('page', state.pagination.page)
    params.append('limit', '12')
    const res = await axios.get(`${API}/jobs?${params}`)
    state.jobs = res.data.jobs
    state.pagination = res.data.pagination
  } catch (e) {
    console.error('Jobs load failed', e)
    state.jobs = []
  }
  state.loading = false
  renderApp()
}

async function loadFeaturedJobs() {
  try {
    const res = await axios.get(`${API}/jobs?featured=true&limit=6`)
    state.jobs = res.data.jobs
    state.pagination = res.data.pagination
    const container = document.getElementById('featured-jobs')
    if (container) {
      container.innerHTML = res.data.jobs.map(renderJobCard).join('')
    }
  } catch (e) { console.error('Featured jobs failed', e) }
}

async function loadJobDetail(slug) {
  state.loading = true
  state.page = 'job-detail'
  renderApp()
  try {
    const res = await axios.get(`${API}/jobs/${slug}`)
    state.selectedJob = res.data
  } catch (e) {
    console.error('Job detail failed', e)
    state.selectedJob = null
  }
  state.loading = false
  renderApp()
  window.scrollTo(0, 0)
}

async function loadCompanies() {
  state.loading = true
  renderApp()
  try {
    const res = await axios.get(`${API}/companies`)
    state.companies = res.data
  } catch (e) {
    console.error('Companies load failed', e)
    state.companies = []
  }
  state.loading = false
  renderApp()
}

async function loadCompanyJobs(id, name) {
  state.filters.q = name
  state.page = 'jobs'
  await loadJobs()
}

// ===== 네비게이션 =====
function navigate(page) {
  state.page = page
  if (page === 'jobs') {
    state.pagination.page = 1
    loadJobs()
  } else if (page === 'companies') {
    loadCompanies()
  } else {
    renderApp()
    if (page === 'home') loadFeaturedJobs()
  }
  window.scrollTo(0, 0)
}

function clearFilters() {
  state.filters = { q: '', category: '', remote_type: '', contract_type: '', experience_level: '', timezone: '', salary_min: '', featured: '' }
  state.pagination.page = 1
  loadJobs()
}

function changePage(page) {
  if (page < 1 || page > state.pagination.total_pages) return
  state.pagination.page = page
  loadJobs()
  window.scrollTo(0, 0)
}

function bindEvents() {
  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.page === 'job-detail') {
      navigate('jobs')
    }
  }, { once: true })
}

// ===== 초기화 =====
async function init() {
  state.userTimezone = getUserTimezone()
  await loadMeta()
  renderApp()
  await loadFeaturedJobs()
}

// 전역 노출
window.navigate = navigate
window.clearFilters = clearFilters
window.changePage = changePage
window.loadJobDetail = loadJobDetail
window.loadCompanyJobs = loadCompanyJobs
window.calcSalary = calcSalary
window.selectPeriod = selectPeriod
window.state = state

// 시작
init()
