// ===== NomaWork 인증 UI (독립 모듈) =====
// app.js를 수정하지 않고 로그인/회원가입 기능과 공고 저장/지원 기능을 얹기 위한 모듈.
// - 상단 네비게이션에 로그인/회원가입 (또는 사용자+보관함+로그아웃) 버튼 주입
// - 로그인/회원가입/보관함은 모달로 처리 (앱 라우터에 의존하지 않음)
// - 상세페이지의 저장/지원 버튼에 동작 연결 (app.js 미수정)
// - 토큰은 localStorage에 저장하여 새로고침 후에도 로그인 유지
(function () {
  const API = '/api'
  const TOKEN_KEY = 'nomawork_token'
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-nomad-400'
  const auth = { token: localStorage.getItem(TOKEN_KEY) || null, user: null }

  if (auth.token) axios.defaults.headers.common['Authorization'] = 'Bearer ' + auth.token

  function saveToken(t) {
    auth.token = t
    localStorage.setItem(TOKEN_KEY, t)
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + t
  }
  function clearToken() {
    auth.token = null
    auth.user = null
    localStorage.removeItem(TOKEN_KEY)
    delete axios.defaults.headers.common['Authorization']
    if (window.state) window.state.user = null
  }
  function setUser(u) {
    auth.user = u
    if (window.state) window.state.user = u
  }

  async function loadMe() {
    if (!auth.token) { injectNav(); return }
    try {
      const res = await axios.get(`${API}/auth/me`)
      setUser(res.data.user)
    } catch { clearToken() }
    injectNav(); enhanceDetail(true)
  }

  // ---- 네비게이션 버튼 주입 ----
  function injectNav() {
    const container = document.querySelector('nav .gap-3')
    if (!container) return
    let el = document.getElementById('auth-nav-control')
    if (!el) {
      el = document.createElement('div')
      el.id = 'auth-nav-control'
      el.className = 'flex items-center gap-2'
      container.appendChild(el)
    }
    if (auth.user) {
      const label = auth.user.name || auth.user.email
      const initial = (label || '?').charAt(0).toUpperCase()
      el.innerHTML =
        '<div class="hidden sm:flex items-center gap-2 text-sm text-gray-700">' +
        '<div class="w-7 h-7 hero-gradient rounded-full flex items-center justify-center text-white text-xs font-bold">' + initial + '</div>' +
        '<span class="font-medium max-w-[120px] truncate">' + label + '</span></div>' +
        '<button id="auth-library-btn" class="text-gray-600 hover:text-nomad-600 text-sm font-medium px-2 py-2 transition-colors">' +
        '<i class="fas fa-bookmark sm:mr-1"></i><span class="hidden sm:inline">보관함</span></button>' +
        '<button id="auth-logout-btn" class="text-gray-500 hover:text-nomad-600 text-sm font-medium px-2 py-2 transition-colors">' +
        '<i class="fas fa-sign-out-alt sm:mr-1"></i><span class="hidden sm:inline">로그아웃</span></button>'
      el.querySelector('#auth-library-btn').onclick = () => openLibrary('saved')
      el.querySelector('#auth-logout-btn').onclick = () => { clearToken(); injectNav(); enhanceDetail(true) }
    } else {
      el.innerHTML =
        '<button id="auth-login-btn" class="text-gray-600 hover:text-nomad-600 text-sm font-medium px-2 py-2 transition-colors">로그인</button>' +
        '<button id="auth-signup-btn" class="bg-nomad-500 hover:bg-nomad-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">회원가입</button>'
      el.querySelector('#auth-login-btn').onclick = () => openModal('login')
      el.querySelector('#auth-signup-btn').onclick = () => openModal('signup')
    }
  }

  // ---- 모달 ----
  let modalEl = null
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null } }
  function openModal(mode) {
    closeModal()
    modalEl = document.createElement('div')
    modalEl.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40'
    modalEl.onclick = (e) => { if (e.target === modalEl) closeModal() }
    modalEl.innerHTML = renderModal(mode)
    document.body.appendChild(modalEl)
    wireModal(mode)
  }

  function renderModal(mode) {
    const isLogin = mode === 'login'
    const tzOptions = ((window.state && window.state.timezones) || []).map(function (tz) {
      const sel = (window.state && window.state.userTimezone && window.state.userTimezone.label === tz.utc_label) ? 'selected' : ''
      return '<option value="' + tz.utc_label + '" ' + sel + '>' + tz.utc_label + ' · ' + tz.name + '</option>'
    }).join('')
    return '' +
    '<div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">' +
      '<button id="auth-close" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>' +
      '<div class="text-center mb-6">' +
        '<div class="w-14 h-14 hero-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">' +
          '<i class="fas ' + (isLogin ? 'fa-globe' : 'fa-user-plus') + ' text-white text-xl"></i></div>' +
        '<h1 class="text-xl font-bold text-gray-900">' + (isLogin ? '다시 오신 걸 환영해요' : '노마드 여정을 시작하세요') + '</h1>' +
        '<p class="text-sm text-gray-500 mt-1">' + (isLogin ? 'NomaWork 계정으로 로그인하세요' : '무료로 계정을 만들고 맞춤 공고를 받아보세요') + '</p>' +
      '</div>' +
      '<div id="auth-error" class="hidden mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3"></div>' +
      '<div class="space-y-3">' +
        (isLogin ? '' : '<input type="text" id="f-name" placeholder="이름 (선택)" class="' + inputCls + '">') +
        '<input type="email" id="f-email" placeholder="이메일" autocomplete="email" class="' + inputCls + '">' +
        (isLogin ? '' : '<select id="f-tz" class="' + inputCls + '">' + (tzOptions || '<option value="UTC+9">UTC+9 · Korea Standard Time</option>') + '</select>') +
        '<input type="password" id="f-password" placeholder="비밀번호' + (isLogin ? '' : ' (8자 이상)') + '" autocomplete="' + (isLogin ? 'current-password' : 'new-password') + '" class="' + inputCls + '">' +
        (isLogin ? '' : '<input type="password" id="f-password2" placeholder="비밀번호 확인" autocomplete="new-password" class="' + inputCls + '">') +
        '<button id="auth-submit" class="w-full bg-nomad-500 hover:bg-nomad-600 text-white font-medium py-2.5 rounded-lg transition-colors">' + (isLogin ? '로그인' : '회원가입') + '</button>' +
      '</div>' +
      '<p class="text-center text-sm text-gray-500 mt-5">' +
        (isLogin ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? ') +
        '<button id="auth-switch" class="text-nomad-600 font-medium hover:underline">' + (isLogin ? '회원가입' : '로그인') + '</button>' +
      '</p>' +
    '</div>'
  }

  function showErr(m) {
    const e = document.getElementById('auth-error')
    if (e) { e.textContent = m; e.classList.remove('hidden') }
  }

  function wireModal(mode) {
    const submit = mode === 'login' ? doLogin : doSignup
    document.getElementById('auth-close').onclick = closeModal
    document.getElementById('auth-switch').onclick = () => openModal(mode === 'login' ? 'signup' : 'login')
    document.getElementById('auth-submit').onclick = submit
    const inputs = modalEl.querySelectorAll('input')
    inputs.forEach(function (inp) {
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit() })
    })
    const first = modalEl.querySelector('input')
    if (first) first.focus()
  }

  async function doLogin() {
    const email = (document.getElementById('f-email').value || '').trim()
    const password = document.getElementById('f-password').value || ''
    if (!email || !password) return showErr('이메일과 비밀번호를 입력하세요.')
    const btn = document.getElementById('auth-submit'); btn.disabled = true; btn.textContent = '로그인 중...'
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password })
      saveToken(res.data.token); setUser(res.data.user)
      closeModal(); injectNav(); enhanceDetail(true)
    } catch (e) {
      showErr((e.response && e.response.data && e.response.data.error) || '로그인에 실패했습니다.')
      btn.disabled = false; btn.textContent = '로그인'
    }
  }

  async function doSignup() {
    const email = (document.getElementById('f-email').value || '').trim()
    const password = document.getElementById('f-password').value || ''
    const password2 = document.getElementById('f-password2').value || ''
    const name = (document.getElementById('f-name').value || '').trim()
    const tzEl = document.getElementById('f-tz')
    const tz = (tzEl && tzEl.value) || (window.state && window.state.userTimezone && window.state.userTimezone.label) || 'UTC+9'
    if (!email || !password) return showErr('이메일과 비밀번호를 입력하세요.')
    if (password.length < 8) return showErr('비밀번호는 8자 이상이어야 합니다.')
    if (password !== password2) return showErr('비밀번호가 일치하지 않습니다.')
    const btn = document.getElementById('auth-submit'); btn.disabled = true; btn.textContent = '가입 중...'
    try {
      const res = await axios.post(`${API}/auth/signup`, { email, password, name, current_timezone: tz })
      saveToken(res.data.token); setUser(res.data.user)
      closeModal(); injectNav(); enhanceDetail(true)
    } catch (e) {
      showErr((e.response && e.response.data && e.response.data.error) || '회원가입에 실패했습니다.')
      btn.disabled = false; btn.textContent = '회원가입'
    }
  }

  // ===== 공고 저장 / 지원 =====
  async function apiStatus(jobId) {
    try { const r = await axios.get(`${API}/user/status/${jobId}`); return r.data }
    catch { return { saved: false, applied: false } }
  }

  function setSaveBtn(btn, saved) {
    btn.dataset.saved = saved ? '1' : '0'
    btn.innerHTML = '<i class="fas fa-bookmark mr-2"></i>' + (saved ? '저장됨' : '저장하기')
    btn.classList.toggle('text-nomad-600', saved)
    btn.classList.toggle('border-nomad-400', saved)
  }
  function setApplyBtn(btn, applied) {
    btn.dataset.applied = applied ? '1' : '0'
    if (applied) {
      btn.innerHTML = '<i class="fas fa-check mr-2"></i>지원 완료'
      btn.disabled = true
      btn.classList.add('opacity-70')
    } else {
      btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>지원하기'
      btn.disabled = false
      btn.classList.remove('opacity-70')
    }
  }

  // 상세페이지의 저장/지원 버튼에 동작 연결 (app.js를 수정하지 않고 주입)
  let enhancedJobId = null
  function enhanceDetail(force) {
    const onDetail = window.state && window.state.page === 'job-detail' && window.state.selectedJob
    if (!onDetail) { enhancedJobId = null; return }
    const job = window.state.selectedJob
    if (!force && enhancedJobId === job.id) return
    let applyBtn = null, saveBtn = null
    const scope = document.getElementById('main-content') || document.getElementById('app')
    scope.querySelectorAll('button').forEach(function (b) {
      if (b.innerHTML.indexOf('fa-paper-plane') >= 0 || b.dataset.applied != null) applyBtn = applyBtn || b
      else if (b.innerHTML.indexOf('fa-bookmark') >= 0 || b.dataset.saved != null) saveBtn = saveBtn || b
    })
    if (!applyBtn && !saveBtn) return
    enhancedJobId = job.id

    if (saveBtn) {
      saveBtn.onclick = async function () {
        if (!auth.user) return openModal('login')
        const saved = saveBtn.dataset.saved === '1'
        try {
          if (saved) { await axios.delete(`${API}/user/saved/${job.id}`); setSaveBtn(saveBtn, false) }
          else { await axios.post(`${API}/user/saved/${job.id}`); setSaveBtn(saveBtn, true) }
        } catch { /* 무시 */ }
      }
    }
    if (applyBtn) {
      applyBtn.onclick = async function () {
        if (!auth.user) return openModal('login')
        if (applyBtn.dataset.applied === '1') return
        applyBtn.disabled = true
        try {
          await axios.post(`${API}/user/applications/${job.id}`, {})
          setApplyBtn(applyBtn, true)
        } catch (e) {
          if (e.response && e.response.status === 409) setApplyBtn(applyBtn, true)
          else applyBtn.disabled = false
        }
      }
    }

    if (auth.user) {
      apiStatus(job.id).then(function (s) {
        if (saveBtn) setSaveBtn(saveBtn, s.saved)
        if (applyBtn) setApplyBtn(applyBtn, s.applied)
      })
    } else {
      if (saveBtn) setSaveBtn(saveBtn, false)
      if (applyBtn) setApplyBtn(applyBtn, false)
    }
  }

  // ---- 보관함 모달 (저장/지원 목록) ----
  function fmtSalary(j) {
    if (!j.salary_min && !j.salary_max) return '협의'
    const k = (n) => n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + n
    const period = j.salary_period === 'hourly' ? '/hr' : j.salary_period === 'monthly' ? '/월' : '/년'
    if (j.salary_min && j.salary_max) return k(j.salary_min) + '-' + k(j.salary_max) + period
    return k(j.salary_min || j.salary_max) + period
  }
  function libCard(j, tab) {
    const statusMap = { submitted: '제출됨', reviewing: '검토 중', accepted: '합격', rejected: '불합격', withdrawn: '철회' }
    const badge = tab === 'applied'
      ? '<span class="text-xs bg-nomad-50 text-nomad-700 px-2 py-0.5 rounded-full">' + (statusMap[j.application_status] || '제출됨') + '</span>'
      : ''
    const initial = (j.company_name || '?').charAt(0).toUpperCase()
    return '<div data-slug="' + j.slug + '" class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-gray-100 mb-2">' +
      '<div class="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center text-white font-bold flex-shrink-0">' + initial + '</div>' +
      '<div class="flex-1 min-w-0"><div class="font-medium text-gray-800 text-sm truncate">' + j.title + '</div>' +
      '<div class="text-xs text-gray-500 truncate">' + (j.company_name || '') + (j.headquarters_country ? (' · ' + j.headquarters_country) : '') + '</div></div>' +
      '<div class="text-right flex-shrink-0">' + badge +
      '<div class="text-xs text-nomad-600 font-medium mt-0.5">' + fmtSalary(j) + '</div></div></div>'
  }
  function openLibrary(tab) {
    closeModal()
    modalEl = document.createElement('div')
    modalEl.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40'
    modalEl.onclick = (e) => { if (e.target === modalEl) closeModal() }
    modalEl.innerHTML =
      '<div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">' +
        '<div class="flex items-center justify-between p-5 border-b border-gray-100">' +
          '<h2 class="text-lg font-bold text-gray-900">내 보관함</h2>' +
          '<button id="lib-close" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button></div>' +
        '<div class="flex border-b border-gray-100 px-5">' +
          '<button id="lib-tab-saved" class="px-4 py-3 text-sm font-medium border-b-2">저장한 공고</button>' +
          '<button id="lib-tab-applied" class="px-4 py-3 text-sm font-medium border-b-2">지원 내역</button></div>' +
        '<div id="lib-body" class="p-5 overflow-y-auto"></div></div>'
    document.body.appendChild(modalEl)
    document.getElementById('lib-close').onclick = closeModal
    document.getElementById('lib-tab-saved').onclick = () => showLibTab('saved')
    document.getElementById('lib-tab-applied').onclick = () => showLibTab('applied')
    showLibTab(tab || 'saved')
  }
  async function showLibTab(tab) {
    const body = document.getElementById('lib-body')
    const ts = document.getElementById('lib-tab-saved'), ta = document.getElementById('lib-tab-applied')
    const active = 'text-nomad-600 border-nomad-500', idle = 'text-gray-500 border-transparent'
    ts.className = 'px-4 py-3 text-sm font-medium border-b-2 ' + (tab === 'saved' ? active : idle)
    ta.className = 'px-4 py-3 text-sm font-medium border-b-2 ' + (tab === 'applied' ? active : idle)
    body.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>'
    try {
      const res = await axios.get(`${API}/user/` + (tab === 'saved' ? 'saved' : 'applications'))
      const jobs = res.data.jobs || []
      if (!jobs.length) {
        body.innerHTML = '<div class="text-center text-gray-400 py-10 text-sm">' + (tab === 'saved' ? '저장한 공고가 없습니다.' : '지원한 공고가 없습니다.') + '</div>'
        return
      }
      body.innerHTML = jobs.map((j) => libCard(j, tab)).join('')
      body.querySelectorAll('[data-slug]').forEach(function (el) {
        el.addEventListener('click', function () {
          const slug = el.dataset.slug
          closeModal()
          if (window.loadJobDetail) window.loadJobDetail(slug)
        })
      })
    } catch {
      body.innerHTML = '<div class="text-center text-red-400 py-10 text-sm">불러오기에 실패했습니다.</div>'
    }
  }

  // ---- 앱이 다시 렌더링돼도 네비 버튼 유지 ----
  function startObserver() {
    const appRoot = document.getElementById('app')
    if (!appRoot) { setTimeout(startObserver, 300); return }
    const obs = new MutationObserver(function () {
      if (!document.getElementById('auth-nav-control')) injectNav()
      enhanceDetail(false)
    })
    obs.observe(appRoot, { childList: true, subtree: true })
    injectNav()
  }

  // ESC로 모달 닫기
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal() })

  // 시작
  function boot() { startObserver(); loadMe() }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
