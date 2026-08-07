// ===== NomaWork 공고 관리 UI (독립 모듈) =====
// app.js를 수정하지 않고, 기업 사용자가 회사 프로필/공고를 관리하는 전체화면 오버레이.
// auth-ui.js의 "공고 관리" 버튼이 window.openEmployer()를 호출한다.
(function () {
  const API = '/api/employer'
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-nomad-400'
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1'

  let empEl = null
  let company = null

  const REMOTE = [['fully_remote', '완전 원격'], ['timezone_limited', '시차 제한'], ['hybrid', '하이브리드']]
  const CONTRACT = [['full_time', '정규직'], ['part_time', '파트타임'], ['contract', '계약직'], ['freelance', '프리랜서'], ['project', '프로젝트']]
  const LEVEL = [['any', '무관'], ['entry', '입문'], ['junior', '주니어'], ['mid', '미드'], ['senior', '시니어'], ['lead', '리드']]
  const PERIOD = [['yearly', '연'], ['monthly', '월'], ['hourly', '시급']]
  const SIZE = [['', '선택 안 함'], ['1-10', '1-10명'], ['11-50', '11-50명'], ['51-200', '51-200명'], ['201-500', '201-500명'], ['500+', '500명+']]
  const POLICY = [['', '선택 안 함'], ['fully_remote', '완전 원격'], ['remote_first', '원격 우선'], ['hybrid', '하이브리드'], ['office_first', '오피스 우선']]

  function esc(s) { return (s == null ? '' : String(s)).replace(/"/g, '&quot;') }
  function inp(id, label, ph, val, type) {
    return '<div><label class="' + labelCls + '">' + label + '</label>' +
      '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + (ph || '') + '" value="' + esc(val) + '" class="' + inputCls + '"></div>'
  }
  function ta(id, label, ph, val) {
    return '<div><label class="' + labelCls + '">' + label + '</label>' +
      '<textarea id="' + id + '" rows="3" placeholder="' + (ph || '') + '" class="' + inputCls + '">' + (val || '') + '</textarea></div>'
  }
  function sel(id, label, opts, val) {
    return '<div><label class="' + labelCls + '">' + label + '</label>' +
      '<select id="' + id + '" class="' + inputCls + '">' +
      opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (val || '') ? ' selected' : '') + '>' + o[1] + '</option>' }).join('') +
      '</select></div>'
  }
  function parseSkills(s) {
    try { const a = JSON.parse(s); if (Array.isArray(a)) return a.join(', ') } catch { }
    return s || ''
  }

  // ---- 오버레이 뻐대 ----
  function closeEmp() { if (empEl) { empEl.remove(); empEl = null } }
  function openEmployer() {
    if (!(window.state && window.state.user)) return
    closeEmp()
    empEl = document.createElement('div')
    empEl.className = 'fixed inset-0 z-[90] bg-black/40 overflow-y-auto'
    empEl.onclick = function (e) { if (e.target === empEl) closeEmp() }
    empEl.innerHTML =
      '<div class="max-w-2xl mx-auto my-8 bg-white rounded-2xl shadow-xl">' +
        '<div class="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">' +
          '<h2 class="text-lg font-bold text-gray-900"><i class="fas fa-briefcase text-nomad-500 mr-2"></i>공고 관리</h2>' +
          '<button id="emp-close" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button></div>' +
        '<div id="emp-body" class="p-6"></div></div>'
    document.body.appendChild(empEl)
    document.getElementById('emp-close').onclick = closeEmp
    document.addEventListener('keydown', escClose)
    loadCompany()
  }
  function escClose(e) { if (e.key === 'Escape') { closeEmp(); document.removeEventListener('keydown', escClose) } }
  function body() { return document.getElementById('emp-body') }
  function loading() { body().innerHTML = '<div class="flex justify-center py-16"><div class="spinner"></div></div>' }

  async function loadCompany() {
    loading()
    try {
      const res = await axios.get(`${API}/company`)
      company = res.data.company
      if (!company) renderCompanyForm(true)
      else renderList()
    } catch { body().innerHTML = errBox('불러오기에 실패했습니다.') }
  }
  function errBox(m) { return '<div class="text-center text-red-500 py-10 text-sm">' + m + '</div>' }
  function msg(m, ok) {
    const el = document.getElementById('emp-msg')
    if (el) { el.textContent = m; el.className = 'mb-4 text-sm rounded-lg px-4 py-3 ' + (ok ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50') }
  }

  // ---- 회사 프로필 폼 ----
  function renderCompanyForm(first) {
    const cc = company || {}
    body().innerHTML =
      (first ? '<p class="text-sm text-gray-500 mb-5">공고를 올리려면 먼저 회사 정보를 등록해주세요. (한 번만 입력하면 됩니다)</p>' : '') +
      '<div id="emp-msg" class="hidden"></div>' +
      '<div class="space-y-4">' +
        inp('c-name', '회사명 *', '예: NomaWork', cc.name) +
        inp('c-industry', '산업 *', '예: IT / 소프트웨어', cc.industry) +
        '<div class="grid grid-cols-2 gap-3">' +
          inp('c-country', '본사 국가 *', '예: 대한민국', cc.headquarters_country) +
          inp('c-city', '본사 도시', '예: 서울', cc.headquarters_city) +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3">' +
          sel('c-size', '회사 규모', SIZE, cc.size) +
          sel('c-policy', '근무 정책', POLICY, cc.remote_policy) +
        '</div>' +
        inp('c-website', '웹사이트', 'https://...', cc.website) +
        ta('c-desc', '회사 소개', '회사에 대한 간단한 소개', cc.description) +
        '<div class="flex gap-2 pt-2">' +
          (first ? '' : '<button id="c-cancel" class="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>') +
          '<button id="c-save" class="flex-1 bg-nomad-500 hover:bg-nomad-600 text-white py-2.5 rounded-lg text-sm font-medium">' + (first ? '회사 등록하고 시작하기' : '저장') + '</button>' +
        '</div>' +
      '</div>'
    if (!first) document.getElementById('c-cancel').onclick = renderList
    document.getElementById('c-save').onclick = saveCompany
  }

  async function saveCompany() {
    const val = (id) => (document.getElementById(id).value || '').trim()
    const payload = {
      name: val('c-name'), industry: val('c-industry'),
      headquarters_country: val('c-country'), headquarters_city: val('c-city'),
      size: document.getElementById('c-size').value, remote_policy: document.getElementById('c-policy').value,
      website: val('c-website'), description: val('c-desc'),
    }
    if (!payload.name || !payload.industry || !payload.headquarters_country) return msgShow('회사명, 산업, 국가는 필수입니다.', false)
    const btn = document.getElementById('c-save'); btn.disabled = true; btn.textContent = '저장 중...'
    try {
      const res = await axios.post(`${API}/company`, payload)
      company = res.data.company
      renderList()
    } catch (e) { msgShow((e.response && e.response.data && e.response.data.error) || '저장에 실패했습니다.', false); btn.disabled = false; btn.textContent = '저장' }
  }
  function msgShow(m, ok) {
    let el = document.getElementById('emp-msg')
    if (el) { el.classList.remove('hidden'); msg(m, ok) }
  }

  // ---- 내 공고 목록 ----
  async function renderList() {
    body().innerHTML =
      '<div class="flex items-center justify-between mb-4">' +
        '<div><div class="font-bold text-gray-900">' + (company.name || '') + '</div>' +
        '<div class="text-xs text-gray-500">' + (company.industry || '') + (company.headquarters_country ? (' · ' + company.headquarters_country) : '') +
        ' · <button id="emp-editco" class="text-nomad-600 hover:underline">회사 정보 수정</button></div></div>' +
        '<button id="emp-newjob" class="bg-nomad-500 hover:bg-nomad-600 text-white text-sm font-medium px-4 py-2 rounded-lg"><i class="fas fa-plus mr-1"></i>새 공고</button>' +
      '</div>' +
      '<div id="emp-joblist"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>'
    document.getElementById('emp-editco').onclick = () => renderCompanyForm(false)
    document.getElementById('emp-newjob').onclick = () => renderJobForm(null)
    try {
      const res = await axios.get(`${API}/jobs`)
      const jobs = res.data.jobs || []
      const list = document.getElementById('emp-joblist')
      if (!jobs.length) { list.innerHTML = '<div class="text-center text-gray-400 py-10 text-sm">아직 등록한 공고가 없습니다. "새 공고"로 첫 공고를 올려보세요.</div>'; return }
      list.innerHTML = jobs.map(jobCard).join('')
      jobs.forEach(function (j) {
        document.getElementById('edit-' + j.id).onclick = () => renderJobForm(j)
        document.getElementById('del-' + j.id).onclick = () => delJob(j)
      })
    } catch { document.getElementById('emp-joblist').innerHTML = errBox('공고를 불러오지 못했습니다.') }
  }

  function jobCard(j) {
    const active = j.is_active
      ? '<span class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">게시중</span>'
      : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">비공개</span>'
    return '<div class="border border-gray-100 rounded-xl p-4 mb-2">' +
      '<div class="flex items-start justify-between gap-2">' +
        '<div class="min-w-0"><div class="font-medium text-gray-800 truncate">' + j.title + '</div>' +
        '<div class="text-xs text-gray-500 mt-0.5">' + (j.category || '') + ' · 지원 ' + (j.applicant_count || 0) + ' · 조회 ' + (j.view_count || 0) + '</div></div>' +
        active +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
        '<button id="edit-' + j.id + '" class="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-nomad-400"><i class="fas fa-pen mr-1"></i>수정</button>' +
        '<button id="del-' + j.id + '" class="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50"><i class="fas fa-trash mr-1"></i>삭제</button>' +
      '</div></div>'
  }

  async function delJob(j) {
    if (!window.confirm('"' + j.title + '" 공고를 삭제할까요?')) return
    try { await axios.delete(`${API}/jobs/${j.id}`); renderList(); refreshPublic() }
    catch { window.alert('삭제에 실패했습니다.') }
  }

  // ---- 공고 등록/수정 폼 ----
  function renderJobForm(job) {
    const e = job || {}
    const editing = !!job
    body().innerHTML =
      '<div class="flex items-center gap-2 mb-4">' +
        '<button id="j-back" class="text-gray-400 hover:text-gray-600"><i class="fas fa-arrow-left"></i></button>' +
        '<h3 class="font-bold text-gray-900">' + (editing ? '공고 수정' : '새 공고 등록') + '</h3></div>' +
      '<div id="emp-msg" class="hidden"></div>' +
      '<div class="space-y-4">' +
        inp('j-title', '제목 *', '예: 시니어 프론트엔드 엔지니어', e.title) +
        inp('j-category', '직무 *', '예: Engineering', e.category) +
        '<div class="grid grid-cols-2 gap-3">' +
          sel('j-remote', '근무 형태', REMOTE, e.remote_type) +
          sel('j-contract', '계약 형태', CONTRACT, e.contract_type) +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3">' +
          sel('j-level', '경력', LEVEL, e.experience_level) +
          inp('j-tz', '필요 타임존', '예: UTC+9 (선택)', e.required_timezone) +
        '</div>' +
        '<div class="grid grid-cols-3 gap-3">' +
          inp('j-smin', '최소 급여', '80000', e.salary_min, 'number') +
          inp('j-smax', '최대 급여', '120000', e.salary_max, 'number') +
          sel('j-period', '주기', PERIOD, e.salary_period) +
        '</div>' +
        inp('j-skills', '기술 스택 *', '쉼표로 구분: React, TypeScript', parseSkills(e.skills_required)) +
        ta('j-desc', '설명 *', '업무 내용, 팀 소개 등', e.description) +
        ta('j-req', '자격 요건 *', '필수 요건', e.requirements) +
        ta('j-nice', '우대 사항', '있으면 좋은 요건 (선택)', e.nice_to_have) +
        '<div class="flex gap-2 pt-2">' +
          '<button id="j-cancel" class="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>' +
          '<button id="j-save" class="flex-1 bg-nomad-500 hover:bg-nomad-600 text-white py-2.5 rounded-lg text-sm font-medium">' + (editing ? '수정 저장' : '공고 등록') + '</button>' +
        '</div>' +
      '</div>'
    document.getElementById('j-back').onclick = renderList
    document.getElementById('j-cancel').onclick = renderList
    document.getElementById('j-save').onclick = () => saveJob(job)
  }

  async function saveJob(job) {
    const val = (id) => (document.getElementById(id).value || '').trim()
    const num = (id) => { const v = val(id); return v ? parseInt(v) : null }
    const payload = {
      title: val('j-title'), category: val('j-category'),
      remote_type: document.getElementById('j-remote').value, contract_type: document.getElementById('j-contract').value,
      experience_level: document.getElementById('j-level').value, required_timezone: val('j-tz') || null,
      salary_min: num('j-smin'), salary_max: num('j-smax'), salary_period: document.getElementById('j-period').value,
      skills_required: val('j-skills'), description: val('j-desc'), requirements: val('j-req'), nice_to_have: val('j-nice') || null,
    }
    if (!payload.title || !payload.category || !payload.description || !payload.requirements) return msgShow('제목, 직무, 설명, 자격요건은 필수입니다.', false)
    const btn = document.getElementById('j-save'); btn.disabled = true; btn.textContent = '저장 중...'
    try {
      if (job) await axios.put(`${API}/jobs/${job.id}`, payload)
      else await axios.post(`${API}/jobs`, payload)
      refreshPublic()
      renderList()
    } catch (e) { msgShow((e.response && e.response.data && e.response.data.error) || '저장에 실패했습니다.', false); btn.disabled = false; btn.textContent = job ? '수정 저장' : '공고 등록' }
  }

  // 공개 목록 새로고침 (있으면)
  function refreshPublic() { try { if (window.loadJobs) window.loadJobs() } catch { } }

  // 전역 노출 (auth-ui.js의 "공고 관리" 버튼이 호출)
  window.openEmployer = openEmployer
})()
