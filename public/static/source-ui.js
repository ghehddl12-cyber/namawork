// ===== NomaWork 공고 출처 표시 + 수집 관리 (독립 모듈) =====
// app.js를 수정하지 않고, 외부에서 수집한 공고에 출처 배지와 원문 링크를 붙인다.
(function () {
  const SRC = {
    remoteok: { name: 'Remote OK', cls: 'bg-violet-50 text-violet-700' },
    wwr: { name: 'We Work Remotely', cls: 'bg-blue-50 text-blue-700' },
    himalayas: { name: 'Himalayas', cls: 'bg-pink-50 text-pink-700' },
    direct: { name: 'NomaWork 등록', cls: 'bg-nomad-500 text-white' },
  }
  const meta = (s) => SRC[s] || { name: s || '외부', cls: 'bg-gray-100 text-gray-600' }

  // 목록의 각 카드에 출처 배지 추가 (app.js 수정 없이 DOM에 주입)
  function decorateCards() {
    const jobs = (window.state && window.state.jobs) || []
    if (!jobs.length) return
    const cards = document.querySelectorAll('#app .job-card')
    cards.forEach(function (card) {
      if (card.dataset.srcDone === '1') return
      // 카드의 onclick에서 slug 추출 → 해당 공고 찾기
      const oc = card.getAttribute('onclick') || ''
      const m = oc.match(/loadJobDetail\('([^']+)'\)/)
      if (!m) return
      const job = jobs.find(function (j) { return j.slug === m[1] })
      if (!job) return
      card.dataset.srcDone = '1'
      const s = meta(job.source || 'direct')
      const isDirect = (job.source || 'direct') === 'direct'
      const badge = document.createElement('div')
      badge.className = 'mt-3 pt-3 border-t border-gray-50 flex items-center justify-between'
      badge.innerHTML =
        '<span class="text-[11px] ' + s.cls + ' px-2 py-0.5 rounded-full font-medium">' +
        (isDirect ? '⭐ ' : '') + s.name + '</span>' +
        (isDirect ? '' : '<span class="text-[11px] text-gray-400">원문에서 지원 <i class="fas fa-arrow-up-right-from-square"></i></span>')
      card.appendChild(badge)
    })
  }

  // 상세 페이지: 외부 공고면 원문 링크 안내 삽입
  let detailDone = null
  function decorateDetail() {
    const st = window.state
    if (!st || st.page !== 'job-detail' || !st.selectedJob) { detailDone = null; return }
    const job = st.selectedJob
    if (detailDone === job.slug) return
    const host = document.getElementById('main-content') || document.getElementById('app')
    if (!host) return
    const src = job.source || 'direct'
    if (src === 'direct') { detailDone = job.slug; return }
    if (document.getElementById('src-note')) return
    detailDone = job.slug
    const s = meta(src)
    const box = document.createElement('div')
    box.id = 'src-note'
    box.className = 'bg-white border border-gray-100 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3'
    box.innerHTML =
      '<div class="text-sm text-gray-600">이 공고는 <span class="' + s.cls + ' px-2 py-0.5 rounded-full text-xs font-medium">' + s.name + '</span> 에서 가져왔습니다.</div>' +
      (job.source_url ? '<a href="' + job.source_url + '" target="_blank" rel="noopener" class="bg-nomad-500 hover:bg-nomad-600 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap">원문에서 지원 <i class="fas fa-arrow-up-right-from-square ml-1"></i></a>' : '')
    host.insertBefore(box, host.firstChild)
  }

  // ---- 관리자: 수집 현황 ----
  let panel = null
  function closePanel() { if (panel) { panel.remove(); panel = null } }
  async function openSync() {
    closePanel()
    panel = document.createElement('div')
    panel.className = 'fixed inset-0 z-[95] bg-black/40 overflow-y-auto'
    panel.onclick = function (e) { if (e.target === panel) closePanel() }
    panel.innerHTML =
      '<div class="max-w-2xl mx-auto my-8 bg-white rounded-2xl shadow-xl">' +
        '<div class="flex items-center justify-between p-5 border-b border-gray-100">' +
          '<h2 class="text-lg font-bold text-gray-900"><i class="fas fa-rotate text-nomad-500 mr-2"></i>공고 수집 현황</h2>' +
          '<button id="sync-close" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button></div>' +
        '<div id="sync-body" class="p-6"><div class="flex justify-center py-16"><div class="spinner"></div></div></div></div>'
    document.body.appendChild(panel)
    document.getElementById('sync-close').onclick = closePanel
    loadStatus()
  }

  async function loadStatus() {
    const body = document.getElementById('sync-body')
    try {
      const res = await axios.get('/api/aggregate/status')
      const d = res.data
      const srcRows = (d.sources || []).map(function (r) {
        const s = meta(r.source)
        return '<div class="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">' +
          '<span class="text-sm ' + s.cls + ' px-2 py-0.5 rounded-full font-medium">' + s.name + '</span>' +
          '<span class="font-bold text-gray-900">' + (r.n || 0).toLocaleString() + '<span class="text-xs text-gray-400 font-normal ml-1">건</span></span></div>'
      }).join('') || '<div class="text-center text-gray-400 py-6 text-sm">아직 수집된 공고가 없습니다.</div>'

      const logRows = (d.logs || []).map(function (l) {
        const okIcon = l.status === 'ok' ? 'fa-circle-check text-nomad-500' : 'fa-triangle-exclamation text-amber-500'
        const when = (l.created_at || '').replace('T', ' ').slice(0, 16)
        const msg = l.status === 'ok'
          ? meta(l.source).name + ' · 신규 ' + l.added + '건, 중복 ' + l.skipped + '건'
          : meta(l.source).name + ' · 실패 (' + (l.message || '알 수 없음') + ')'
        return '<div class="flex items-start gap-2 text-sm"><i class="fas ' + okIcon + ' mt-0.5"></i>' +
          '<div><span class="text-gray-400 text-xs mr-2">' + when + '</span><span class="text-gray-700">' + msg + '</span></div></div>'
      }).join('') || '<div class="text-gray-400 text-sm">아직 기록이 없습니다.</div>'

      body.innerHTML =
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="bg-gray-50 rounded-2xl p-4 text-center"><div class="text-2xl font-bold text-nomad-600">' + (d.total || 0).toLocaleString() + '</div><div class="text-xs text-gray-500 mt-1">전체 공고</div></div>' +
          '<div class="bg-gray-50 rounded-2xl p-4 text-center"><div class="text-2xl font-bold text-gray-900">' + (d.today || 0) + '</div><div class="text-xs text-gray-500 mt-1">오늘 신규</div></div>' +
        '</div>' +
        '<button id="sync-run" class="w-full bg-nomad-500 hover:bg-nomad-600 text-white py-3 rounded-lg text-sm font-medium mb-5"><i class="fas fa-rotate mr-1"></i>지금 수집하기</button>' +
        '<div class="border border-gray-100 rounded-2xl overflow-hidden mb-5">' +
          '<div class="px-4 py-3 border-b border-gray-100 font-bold text-gray-900 text-sm">출처별 공고 수</div>' + srcRows + '</div>' +
        '<div class="font-bold text-gray-900 text-sm mb-3">최근 수집 기록</div><div class="space-y-2">' + logRows + '</div>'

      document.getElementById('sync-run').onclick = runSync
    } catch (e) {
      body.innerHTML = '<div class="text-center text-red-500 py-10 text-sm">현황을 불러오지 못했습니다.</div>'
    }
  }

  async function runSync() {
    const btn = document.getElementById('sync-run')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-rotate fa-spin mr-1"></i>수집 중... (최대 1분)'
    btn.className = 'w-full bg-gray-300 text-white py-3 rounded-lg text-sm font-medium mb-5'
    try {
      await axios.post('/api/aggregate/run', {})
      await loadStatus()
      if (window.loadJobs) window.loadJobs()
    } catch {
      btn.disabled = false
      btn.innerHTML = '수집에 실패했습니다. 다시 시도'
      btn.className = 'w-full bg-red-500 text-white py-3 rounded-lg text-sm font-medium mb-5'
    }
  }

  // 앱 재렌더링 시에도 배지 유지
  function startObserver() {
    const root = document.getElementById('app')
    if (!root) { setTimeout(startObserver, 300); return }
    new MutationObserver(function () { decorateCards(); decorateDetail() })
      .observe(root, { childList: true, subtree: true })
    decorateCards(); decorateDetail()
  }

  window.openSyncPanel = openSync
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver)
  else startObserver()
})()
