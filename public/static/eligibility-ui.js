// ===== NomaWork 지원 가능 필터 (독립 모듈) =====
// app.js를 수정하지 않고, 공고 목록에 "내 위치에서 지원 가능한가" 판정과 필터를 얹는다.
(function () {
  const KEY_TZ = 'nomawork_my_tz'
  const KEY_FILTER = 'nomawork_elig_filter'
  const KEY_HIDE = 'nomawork_hide_blocked'

  const PLACES = [
    { off: 9, label: '🇰🇷 한국 UTC+9' },
    { off: 9, label: '🇯🇵 일본 UTC+9' },
    { off: 8, label: '🇮🇩 발리 UTC+8' },
    { off: 7, label: '🇹🇭 방콕 UTC+7' },
    { off: 1, label: '🇵🇹 리스본 UTC+1' },
    { off: 2, label: '🇩🇪 베를린 UTC+2' },
    { off: -5, label: '🇺🇸 뉴욕 UTC-5' },
    { off: -8, label: '🇺🇸 샌프란시스코 UTC-8' },
  ]

  // ---- 판정 로직 (서버 lib/eligibility.ts와 동일 기준) ----
  function parseOffset(tz) {
    if (!tz) return null
    const s = String(tz).trim()
    const m = s.match(/(?:UTC|GMT)\s*([+-])\s*(\d{1,2})/i)
    if (m) return (m[1] === '-' ? -1 : 1) * parseInt(m[2])
    if (/^(UTC|GMT)$/i.test(s)) return 0
    const named = { CET: 1, CEST: 2, EET: 2, BST: 1, WET: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, PST: -8, PDT: -7, KST: 9, JST: 9, SGT: 8, AEST: 10 }
    const key = (s.match(/\b([A-Z]{3,4})\b/) || [])[1]
    if (key && named[key] !== undefined) return named[key]
    return null
  }
  function overlapHours(a, b) {
    let d = Math.abs(a - b)
    if (d > 12) d = 24 - d
    return Math.max(0, 8 - d)
  }
  function judge(job, my) {
    if (job.residency_blocked) return { level: 'no', label: '지원 불가', reason: '특정 국가 거주자만 지원할 수 있어요', overlap: 0 }
    const off = parseOffset(job.required_timezone)
    if (job.remote_type === 'fully_remote' && off === null) return { level: 'ok', label: '지원 가능', reason: '전 세계 어디서나 근무 가능', overlap: 8 }
    if (off === null) return { level: 'warn', label: '확인 필요', reason: '근무 지역 정보가 없어 원문 확인이 필요해요', overlap: null }
    const ov = overlapHours(my, off)
    let d = Math.abs(my - off); if (d > 12) d = 24 - d
    if (ov >= 4) return { level: 'ok', label: '지원 가능', reason: '업무시간이 하루 ' + ov + '시간 겹쳐요', overlap: ov }
    if (ov >= 1) return { level: 'warn', label: '시차 주의', reason: '겹치는 시간이 ' + ov + '시간뿐이라 새벽 근무가 생길 수 있어요', overlap: ov }
    return { level: 'no', label: '시차 불가', reason: '업무시간이 전혀 겹치지 않아요 (시차 ' + d + '시간)', overlap: 0 }
  }

  const STYLE = {
    ok: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    no: 'bg-red-50 text-red-700',
  }
  const BAR = { ok: '#14b8a6', warn: '#f59e0b', no: '#ef4444' }

  // ---- 내 위치 ----
  function myOffset() {
    const saved = localStorage.getItem(KEY_TZ)
    if (saved !== null && saved !== '') return parseInt(saved)
    // 로그인 사용자의 가입 시차 → 없으면 브라우저 시차
    const u = window.state && window.state.user
    const fromUser = u && u.current_timezone ? parseOffset(u.current_timezone) : null
    if (fromUser !== null && fromUser !== undefined) return fromUser
    return -Math.round(new Date().getTimezoneOffset() / 60)
  }
  const getFilter = () => localStorage.getItem(KEY_FILTER) || 'all'
  const hideBlocked = () => localStorage.getItem(KEY_HIDE) !== '0' // 기본 켜짐

  // ---- 목록 위 컨트롤 바 ----
  function injectBar() {
    if (!(window.state && window.state.page === 'jobs')) {
      const old = document.getElementById('elig-bar'); if (old) old.remove()
      return
    }
    if (document.getElementById('elig-bar')) return
    const host = document.getElementById('main-content') || document.getElementById('app')
    if (!host) return
    const my = myOffset()
    const opts = PLACES.map(function (p) {
      return '<option value="' + p.off + '"' + (p.off === my ? ' selected' : '') + '>' + p.label + '</option>'
    }).join('')
    const f = getFilter()
    const btn = (k, t) => '<button data-f="' + k + '" class="elig-f px-3.5 py-2 rounded-lg text-sm font-medium ' +
      (f === k ? 'bg-nomad-500 text-white' : 'bg-gray-100 text-gray-600') + '">' + t + '</button>'

    const bar = document.createElement('div')
    bar.id = 'elig-bar'
    bar.className = 'bg-white rounded-2xl border border-gray-100 p-4 mb-4'
    bar.innerHTML =
      '<div class="flex flex-wrap items-center gap-2">' +
        '<span class="text-sm text-gray-400 font-medium mr-1"><i class="fas fa-location-dot text-nomad-500 mr-1"></i>내 위치</span>' +
        '<select id="elig-tz" class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-nomad-400">' + opts + '</select>' +
        '<div class="h-5 w-px bg-gray-200 mx-1"></div>' +
        btn('all', '전체') + btn('ok', '✅ 지원 가능') + btn('warn', '🕓 확인 필요') + btn('no', '🚫 지원 불가') +
        '<label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">' +
          '<input type="checkbox" id="elig-hide"' + (hideBlocked() ? ' checked' : '') + ' class="w-4 h-4 accent-nomad-500"> 지원 불가 숨기기</label>' +
      '</div>' +
      '<div id="elig-summary" class="mt-2 text-xs text-gray-400"></div>'
    host.insertBefore(bar, host.firstChild)

    document.getElementById('elig-tz').onchange = function () {
      localStorage.setItem(KEY_TZ, this.value)
      const b = document.getElementById('elig-bar'); if (b) b.remove()
      refresh(true)
    }
    document.getElementById('elig-hide').onchange = function () {
      localStorage.setItem(KEY_HIDE, this.checked ? '1' : '0')
      const b = document.getElementById('elig-bar'); if (b) b.remove()
      refresh(true)
    }
    bar.querySelectorAll('.elig-f').forEach(function (b) {
      b.onclick = function () {
        localStorage.setItem(KEY_FILTER, b.dataset.f)
        const bar2 = document.getElementById('elig-bar'); if (bar2) bar2.remove()
        refresh(true)
      }
    })
  }

  // ---- 카드에 판정 결과 표시 + 필터 적용 ----
  function decorate(force) {
    const jobs = (window.state && window.state.jobs) || []
    if (!jobs.length) return
    const my = myOffset()
    const f = getFilter()
    const hide = hideBlocked()
    let counts = { ok: 0, warn: 0, no: 0 }

    document.querySelectorAll('#app .job-card').forEach(function (card) {
      const oc = card.getAttribute('onclick') || ''
      const m = oc.match(/loadJobDetail\('([^']+)'\)/)
      if (!m) return
      const job = jobs.find(function (j) { return j.slug === m[1] })
      if (!job) return
      const v = judge(job, my)
      counts[v.level]++

      // 판정 결과가 바뀜 경우에만 다시 그린다 (불필요한 DOM 변경 방지)
      const sig = v.level + '|' + v.reason
      let box = card.querySelector('.elig-box')
      if (!box || card.dataset.eligSig !== sig) {
        card.dataset.eligSig = sig
        if (box) box.remove()
        box = document.createElement('div')
        box.className = 'elig-box mt-3'
        const pct = v.overlap === null ? 0 : Math.round((v.overlap / 8) * 100)
        const bar = v.overlap === null ? '' :
          '<div class="mt-2"><div class="flex items-center justify-between text-[11px] text-gray-400 mb-1">' +
          '<span>업무시간 겹침</span><span>' + v.overlap + '시간 / 8시간</span></div>' +
          '<div style="height:6px;border-radius:9999px;background:#e5e7eb;overflow:hidden">' +
          '<div style="height:100%;width:' + pct + '%;background:' + BAR[v.level] + ';border-radius:9999px"></div></div></div>'
        box.innerHTML =
          '<div class="flex items-center gap-2">' +
            '<span class="text-xs ' + STYLE[v.level] + ' px-2.5 py-1 rounded-full font-semibold">' + v.label + '</span>' +
            '<span class="text-xs text-gray-500 truncate">' + v.reason + '</span>' +
          '</div>' + bar
        card.appendChild(box)
      }

      // 필터 적용 (카드 숨김/표시)
      let show = true
      if (f !== 'all') show = v.level === f
      else if (hide) show = v.level !== 'no'
      const nextDisplay = show ? '' : 'none'
      if (card.style.display !== nextDisplay) card.style.display = nextDisplay
      const dim = show && v.level === 'no'
      if (card.classList.contains('opacity-60') !== dim) card.classList.toggle('opacity-60', dim)
    })

    const sum = document.getElementById('elig-summary')
    if (sum) sum.textContent = '이 목록에서 · 지원 가능 ' + counts.ok + '건 · 확인 필요 ' + counts.warn + '건 · 지원 불가 ' + counts.no + '건'
  }

  // ---- 상세 페이지 판정 배너 ----
  let lastDetail = null
  function decorateDetail() {
    const st = window.state
    if (!st || st.page !== 'job-detail' || !st.selectedJob) { lastDetail = null; return }
    const job = st.selectedJob
    if (lastDetail === job.slug && document.getElementById('elig-note')) return
    const host = document.getElementById('main-content') || document.getElementById('app')
    if (!host) return
    lastDetail = job.slug
    const old = document.getElementById('elig-note'); if (old) old.remove()
    const v = judge(job, myOffset())
    const box = document.createElement('div')
    box.id = 'elig-note'
    box.className = 'rounded-2xl p-4 mb-4 ' + STYLE[v.level]
    box.innerHTML =
      '<div class="flex items-center gap-2 font-bold">' +
        '<i class="fas ' + (v.level === 'ok' ? 'fa-circle-check' : v.level === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark') + '"></i>' +
        '<span>' + v.label + '</span></div>' +
      '<div class="text-sm mt-1 opacity-90">' + v.reason + '</div>'
    host.insertBefore(box, host.firstChild)
  }

  // 우리가 DOM을 바꾸는 동안에는 옴저버가 다시 돌지 않도록 (무한 루프 방지)
  let busy = false
  // force=true (사용자가 필터/위치를 바꿔 경우)는 항상 즉시 반영한다.
  function refresh(force) {
    if (busy && !force) return
    busy = true
    try { injectBar(); decorate(force); decorateDetail() }
    finally { setTimeout(function () { busy = false }, 0) }
  }

  function start() {
    const root = document.getElementById('app')
    if (!root) { setTimeout(start, 300); return }
    const obs = new MutationObserver(function (muts) {
      // 우리 모듈이 만든 요소만 바뀐 경우는 무시
      const ours = muts.every(function (m) {
        const t = m.target
        return t && t.closest && (t.closest('.elig-box') || t.closest('#elig-bar') || t.closest('#elig-note'))
      })
      if (ours) return
      refresh(false)
    })
    obs.observe(root, { childList: true, subtree: true })
    refresh(false)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
