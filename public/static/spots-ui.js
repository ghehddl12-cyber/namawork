// ===== NomaWork 워케이션 장소 (독립 모듈) =====
// app.js를 수정하지 않고, 네비게이션에 "워케이션" 진입점을 넣고 전체화면 오버레이로 장소를 보여준다.
(function () {
  const API = '/api/spots'
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-nomad-400'
  const RATING = [
    { k: 'wifi', icon: 'fa-wifi', label: '와이파이' },
    { k: 'quiet', icon: 'fa-volume-low', label: '조용함' },
    { k: 'seat', icon: 'fa-chair', label: '의자/책상' },
    { k: 'toilet', icon: 'fa-restroom', label: '화장실' },
    { k: 'clean', icon: 'fa-broom', label: '청결도' },
  ]

  let el = null
  let cities = []
  let city = null
  let ftype = 'all'
  const filters = { wifi: false, toilet: false, quiet: false }

  function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  function stars(n) { if (!n) return '평가 없음'; const f = Math.round(n); return '★'.repeat(f) + '☆'.repeat(5 - f) }
  function close() { if (el) { el.remove(); el = null } }

  // ---- 오버레이 열기 ----
  async function open() {
    close()
    el = document.createElement('div')
    el.className = 'fixed inset-0 z-[92] bg-black/40 overflow-y-auto'
    el.onclick = function (e) { if (e.target === el) close() }
    el.innerHTML =
      '<div class="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-xl">' +
        '<div class="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">' +
          '<h2 class="text-lg font-bold text-gray-900"><i class="fas fa-mug-hot text-nomad-500 mr-2"></i>워케이션 장소</h2>' +
          '<button id="sp-close" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button></div>' +
        '<div id="sp-body" class="p-6"><div class="flex justify-center py-16"><div class="spinner"></div></div></div></div>'
    document.body.appendChild(el)
    document.getElementById('sp-close').onclick = close
    document.addEventListener('keydown', escClose)
    await loadCities()
    renderList()
  }
  function escClose(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escClose) } }
  const body = () => document.getElementById('sp-body')
  const loading = () => { body().innerHTML = '<div class="flex justify-center py-16"><div class="spinner"></div></div>' }

  async function loadCities() {
    try {
      const res = await axios.get(API + '/cities')
      cities = res.data.cities || []
      if (!city && cities.length) city = cities[0].key
    } catch { cities = [] }
  }

  // ---- 목록 화면 ----
  async function renderList() {
    loading()
    const c = cities.find(function (x) { return x.key === city }) || {}
    let spots = []
    try {
      const q = new URLSearchParams({ city: city || '' })
      if (ftype !== 'all') q.set('type', ftype)
      if (filters.wifi) q.set('wifi', 'true')
      if (filters.toilet) q.set('toilet', 'true')
      if (filters.quiet) q.set('quiet', 'true')
      const res = await axios.get(API + '?' + q.toString())
      spots = res.data.spots || []
    } catch { spots = [] }

    const tabs = cities.map(function (x) {
      const on = x.key === city
      return '<button data-c="' + x.key + '" class="sp-tab px-3.5 py-2 rounded-xl text-sm font-medium ' +
        (on ? 'bg-nomad-500 text-white' : 'bg-gray-100 text-gray-600') + '">' + (x.flag || '') + ' ' + esc(x.name) + '</button>'
    }).join('')

    const summary = c.key ? '<div class="hero-gradient rounded-2xl p-5 text-white mb-4">' +
      '<div class="text-xl font-bold">' + (c.flag || '') + ' ' + esc(c.name) + '</div>' +
      '<div class="text-white/80 text-sm mt-0.5">' + esc(c.note || '') + '</div>' +
      '<div class="flex flex-wrap gap-2 mt-3 text-xs">' +
        (c.monthly_cost_usd ? '<span class="bg-white/20 px-3 py-1.5 rounded-full">💰 월 생활비 ~$' + c.monthly_cost_usd.toLocaleString() + '</span>' : '') +
        (c.avg_wifi_mbps ? '<span class="bg-white/20 px-3 py-1.5 rounded-full">📶 평균 ' + c.avg_wifi_mbps + 'Mbps</span>' : '') +
        (c.timezone ? '<span class="bg-white/20 px-3 py-1.5 rounded-full">🕐 ' + esc(c.timezone) + '</span>' : '') +
        '<span class="bg-white/20 px-3 py-1.5 rounded-full">📍 장소 ' + (c.spot_count || 0) + '곳</span>' +
      '</div></div>' : ''

    const tbtn = (k, t) => '<button data-t="' + k + '" class="sp-type px-3 py-1.5 rounded-lg text-sm font-medium ' +
      (ftype === k ? 'bg-nomad-500 text-white' : 'bg-gray-100 text-gray-600') + '">' + t + '</button>'
    const chk = (k, t) => '<label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">' +
      '<input type="checkbox" data-k="' + k + '" class="sp-chk w-4 h-4 accent-nomad-500"' + (filters[k] ? ' checked' : '') + '> ' + t + '</label>'

    body().innerHTML =
      '<div class="flex flex-wrap gap-2 mb-4">' + tabs + '</div>' + summary +
      '<div class="flex flex-wrap items-center gap-2 mb-4">' +
        tbtn('all', '전체') + tbtn('cowork', '🏢 코워킹') + tbtn('cafe', '☕ 카페') +
        '<div class="h-5 w-px bg-gray-200 mx-1"></div>' +
        chk('wifi', '와이파이 빠름') + chk('toilet', '화장실 깨끗') + chk('quiet', '조용함') +
        '<button id="sp-add" class="ml-auto bg-nomad-500 hover:bg-nomad-600 text-white text-sm font-medium px-4 py-2 rounded-lg"><i class="fas fa-plus mr-1"></i>장소 등록</button>' +
      '</div>' +
      '<div id="sp-list" class="grid sm:grid-cols-2 gap-3">' + (spots.length ? spots.map(card).join('') :
        '<div class="sm:col-span-2 text-center text-gray-400 py-14 text-sm">조건에 맞는 장소가 없습니다.<br>직접 등록해서 첫 번째 정보를 남겨보세요.</div>') + '</div>'

    body().querySelectorAll('.sp-tab').forEach(function (b) { b.onclick = function () { city = b.dataset.c; renderList() } })
    body().querySelectorAll('.sp-type').forEach(function (b) { b.onclick = function () { ftype = b.dataset.t; renderList() } })
    body().querySelectorAll('.sp-chk').forEach(function (b) { b.onchange = function () { filters[b.dataset.k] = b.checked; renderList() } })
    document.getElementById('sp-add').onclick = function () { renderForm() }
    body().querySelectorAll('[data-slug]').forEach(function (n) { n.onclick = function () { renderDetail(n.dataset.slug) } })
  }

  function card(s) {
    const chips = RATING.map(function (m) {
      const v = s['avg_' + m.k]
      if (!v) return ''
      const col = v >= 4 ? 'text-nomad-600 bg-nomad-50' : v >= 3 ? 'text-gray-500 bg-gray-50' : 'text-amber-600 bg-amber-50'
      return '<span class="text-[11px] ' + col + ' px-2 py-1 rounded-lg whitespace-nowrap"><i class="fas ' + m.icon + ' mr-1"></i>' + m.label + ' ' + v + '</span>'
    }).join('')
    const typeTag = s.type === 'cowork'
      ? '<span class="text-[11px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">코워킹</span>'
      : '<span class="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">카페</span>'
    return '<div data-slug="' + esc(s.slug) + '" class="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:border-nomad-300 transition-colors">' +
      '<div class="flex items-start justify-between gap-2">' +
        '<div class="min-w-0"><div class="flex items-center gap-2"><span class="font-bold text-gray-900 truncate">' + esc(s.name) + '</span>' + typeTag + '</div>' +
        '<div class="text-xs text-gray-500 mt-0.5">📍 ' + esc(s.area || '') + (s.hours ? ' · 🕐 ' + esc(s.hours) : '') + '</div>' +
        (s.price_note ? '<div class="text-xs text-nomad-700 font-medium mt-1">' + esc(s.price_note) + '</div>' : '') + '</div>' +
        '<div class="text-right flex-shrink-0"><div class="text-amber-500 text-xs">' + stars(s.avg_total) + '</div>' +
        '<div class="text-[11px] text-gray-400 mt-0.5">' + (s.avg_total ? s.avg_total + ' · ' : '') + '후기 ' + (s.review_count || 0) + '</div></div>' +
      '</div>' +
      (chips ? '<div class="flex flex-wrap gap-1.5 mt-3">' + chips + '</div>' : '<div class="text-[11px] text-gray-400 mt-3">아직 후기가 없어요 · 첫 후기를 남겨보세요</div>') +
      (s.wifi_mbps ? '<div class="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50"><i class="fas fa-gauge-high text-nomad-500 mr-1"></i>실측 ' + s.wifi_mbps + 'Mbps</div>' : '') +
      '</div>'
  }

  // ---- 상세 ----
  async function renderDetail(slug) {
    loading()
    let d
    try { d = (await axios.get(API + '/' + slug)).data } catch { d = null }
    if (!d || !d.spot) {
      body().innerHTML = '<button id="sp-back0" class="text-gray-400 hover:text-gray-600 text-sm mb-4"><i class="fas fa-arrow-left mr-1"></i>목록으로</button>' +
        '<div class="text-center text-red-500 py-10 text-sm">장소 정보를 불러오지 못했습니다.</div>'
      const bk = document.getElementById('sp-back0'); if (bk) bk.onclick = renderList
      return
    }
    const s = d.spot, reviews = d.reviews || []

    const bars = RATING.map(function (m) {
      const v = s['avg_' + m.k] || 0
      return '<div class="mb-2"><div class="flex justify-between text-xs mb-1">' +
        '<span class="text-gray-600"><i class="fas ' + m.icon + ' text-nomad-500 mr-1.5"></i>' + m.label + '</span>' +
        '<span class="font-semibold text-gray-700">' + (v ? v : '-') + '</span></div>' +
        '<div style="height:5px;border-radius:9999px;background:#e5e7eb;overflow:hidden">' +
        '<div style="height:100%;width:' + (v / 5 * 100) + '%;background:#14b8a6;border-radius:9999px"></div></div></div>'
    }).join('')

    const revHtml = reviews.length ? reviews.map(function (r) {
      const avg = (r.r_wifi + r.r_quiet + r.r_seat + r.r_toilet + r.r_clean) / 5
      return '<div class="border-b border-gray-50 py-3 last:border-0">' +
        '<div class="flex items-center gap-2"><div class="w-7 h-7 rounded-full hero-gradient text-white text-xs flex items-center justify-center font-bold">' + esc(r.user_name).charAt(0) + '</div>' +
        '<span class="text-sm font-medium text-gray-800">' + esc(r.user_name) + '</span>' +
        '<span class="text-amber-500 text-xs">' + stars(avg) + '</span>' +
        '<span class="text-xs text-gray-400 ml-auto">' + (r.created_at || '').slice(0, 10) + '</span></div>' +
        (r.comment ? '<p class="text-sm text-gray-600 mt-2 leading-relaxed">' + esc(r.comment) + '</p>' : '') + '</div>'
    }).join('') : '<div class="text-sm text-gray-400 py-6 text-center">아직 후기가 없어요. 첫 후기를 남겨주세요!</div>'

    body().innerHTML =
      '<button id="sp-back" class="text-gray-400 hover:text-gray-600 text-sm mb-4"><i class="fas fa-arrow-left mr-1"></i>목록으로</button>' +
      '<div class="hero-gradient rounded-2xl p-5 text-white mb-4">' +
        '<div class="text-xl font-bold">' + esc(s.name) + '</div>' +
        '<div class="text-white/85 text-sm mt-1">📍 ' + esc(s.area || '') + (s.hours ? ' · 🕐 ' + esc(s.hours) : '') + '</div>' +
        '<div class="flex items-center gap-2 mt-2"><span class="text-amber-300">' + stars(s.avg_total) + '</span>' +
        '<span class="text-sm">' + (s.avg_total ? s.avg_total + ' · ' : '') + '후기 ' + (s.review_count || 0) + '개</span></div></div>' +
      ((s.tags || []).length ? '<div class="flex flex-wrap gap-1.5 mb-4">' + s.tags.map(function (t) { return '<span class="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">' + esc(t) + '</span>' }).join('') + '</div>' : '') +
      '<div class="grid grid-cols-2 gap-3 mb-5">' +
        '<div class="bg-gray-50 rounded-xl p-3"><div class="text-xs text-gray-500">가격</div><div class="font-bold text-gray-800 text-sm mt-0.5">' + esc(s.price_note || '정보 없음') + '</div></div>' +
        '<div class="bg-gray-50 rounded-xl p-3"><div class="text-xs text-gray-500">실측 속도</div><div class="font-bold text-nomad-600 text-sm mt-0.5">' + (s.wifi_mbps ? s.wifi_mbps + ' Mbps' : '정보 없음') + '</div></div></div>' +
      '<div class="font-bold text-gray-900 text-sm mb-3">항목별 평가</div>' + bars +
      '<div class="flex items-center justify-between mt-5 mb-2">' +
        '<div class="font-bold text-gray-900 text-sm">노마드 후기</div>' +
        '<button id="sp-review" class="text-xs bg-nomad-500 text-white px-3 py-1.5 rounded-lg font-medium"><i class="fas fa-pen mr-1"></i>후기 쓰기</button></div>' +
      '<div id="sp-revarea"></div>' + revHtml

    document.getElementById('sp-back').onclick = renderList
    document.getElementById('sp-review').onclick = function () { renderReviewForm(s.slug) }
  }

  // ---- 후기 작성 ----
  function scoreRow(k, icon, label) {
    return '<div class="flex items-center justify-between py-1"><span class="text-sm text-gray-600"><i class="fas ' + icon + ' text-nomad-500 mr-2"></i>' + label + '</span>' +
      '<div class="flex gap-1" data-score="' + k + '">' +
      [1, 2, 3, 4, 5].map(function (n) {
        return '<button data-v="' + n + '" class="sc w-7 h-7 rounded-lg text-xs ' + (n === 3 ? 'bg-nomad-500 text-white' : 'bg-gray-100 text-gray-500') + '">' + n + '</button>'
      }).join('') + '</div></div>'
  }
  function wireScores(host) {
    host.querySelectorAll('[data-score]').forEach(function (g) {
      g.querySelectorAll('.sc').forEach(function (b) {
        b.onclick = function () {
          g.querySelectorAll('.sc').forEach(function (x) { x.className = 'sc w-7 h-7 rounded-lg text-xs bg-gray-100 text-gray-500' })
          b.className = 'sc w-7 h-7 rounded-lg text-xs bg-nomad-500 text-white'
          g.dataset.value = b.dataset.v
        }
      })
      g.dataset.value = '3'
    })
  }
  function readScores(host) {
    const o = {}
    host.querySelectorAll('[data-score]').forEach(function (g) { o[g.dataset.score] = parseInt(g.dataset.value || '3') })
    return o
  }

  function renderReviewForm(slug) {
    const area = document.getElementById('sp-revarea')
    if (!area) return
    if (!(window.state && window.state.user)) {
      area.innerHTML = '<div class="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3 mb-3">후기를 남기려면 로그인이 필요해요.</div>'
      return
    }
    area.innerHTML =
      '<div class="border border-gray-100 rounded-2xl p-4 mb-4">' +
        RATING.map(function (m) { return scoreRow(m.k, m.icon, m.label) }).join('') +
        '<textarea id="sp-comment" rows="3" placeholder="화장실은 깨끗한지, 콘센트는 많은지 등 실제 경험을 알려주세요" class="' + inputCls + ' mt-3"></textarea>' +
        '<div class="flex gap-2 mt-3">' +
          '<button id="sp-cancel" class="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium">취소</button>' +
          '<button id="sp-submit" class="flex-1 bg-nomad-500 text-white py-2 rounded-lg text-sm font-medium">후기 등록</button>' +
        '</div><div id="sp-msg" class="hidden mt-2 text-sm"></div></div>'
    wireScores(area)
    document.getElementById('sp-cancel').onclick = function () { area.innerHTML = '' }
    document.getElementById('sp-submit').onclick = async function () {
      const btn = this; btn.disabled = true; btn.textContent = '등록 중...'
      const sc = readScores(area)
      try {
        await axios.post(API + '/' + slug + '/reviews', {
          wifi: sc.wifi, quiet: sc.quiet, seat: sc.seat, toilet: sc.toilet, clean: sc.clean,
          comment: (document.getElementById('sp-comment').value || '').trim(),
        })
        renderDetail(slug)
      } catch (e) {
        const m = document.getElementById('sp-msg')
        m.className = 'mt-2 text-sm text-red-600'
        m.textContent = (e.response && e.response.data && e.response.data.error) || '등록에 실패했습니다.'
        btn.disabled = false; btn.textContent = '후기 등록'
      }
    }
  }

  // ---- 장소 등록 ----
  function renderForm() {
    if (!(window.state && window.state.user)) {
      body().innerHTML = '<button id="sp-back2" class="text-gray-400 text-sm mb-4"><i class="fas fa-arrow-left mr-1"></i>목록으로</button>' +
        '<div class="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3">장소를 등록하려면 로그인이 필요해요.</div>'
      document.getElementById('sp-back2').onclick = renderList
      return
    }
    const cityOpts = cities.map(function (c) { return '<option value="' + c.key + '"' + (c.key === city ? ' selected' : '') + '>' + (c.flag || '') + ' ' + esc(c.name) + '</option>' }).join('')
    body().innerHTML =
      '<button id="sp-back2" class="text-gray-400 hover:text-gray-600 text-sm mb-4"><i class="fas fa-arrow-left mr-1"></i>목록으로</button>' +
      '<h3 class="font-bold text-gray-900 mb-1">장소 등록</h3>' +
      '<p class="text-sm text-gray-500 mb-4">직접 가본 코워킹/카페를 등록해 다른 노마드에게 알려주세요.</p>' +
      '<div class="space-y-3">' +
        '<input id="f-name" placeholder="장소 이름 *" class="' + inputCls + '">' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<select id="f-city" class="' + inputCls + '">' + cityOpts + '</select>' +
          '<select id="f-type" class="' + inputCls + '"><option value="cowork">코워킹</option><option value="cafe">카페</option></select>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input id="f-area" placeholder="세부 지역 (예: 창구)" class="' + inputCls + '">' +
          '<input id="f-hours" placeholder="영업시간 (예: 09:00-21:00)" class="' + inputCls + '">' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<input id="f-price" placeholder="가격 (예: 1일 $18)" class="' + inputCls + '">' +
          '<input id="f-wifi" type="number" placeholder="와이파이 실측 (Mbps)" class="' + inputCls + '">' +
        '</div>' +
        '<input id="f-tags" placeholder="특징 (쉼표로 구분: 24시간, 전화부스)" class="' + inputCls + '">' +
        '<div class="text-xs font-semibold text-gray-500 pt-2">항목별 평가</div>' +
        '<div id="sp-scores" class="border border-gray-100 rounded-xl p-3">' +
          RATING.map(function (m) { return scoreRow(m.k, m.icon, m.label) }).join('') + '</div>' +
        '<textarea id="f-comment" rows="3" placeholder="한줄 후기 (선택)" class="' + inputCls + '"></textarea>' +
        '<div id="sp-msg2" class="hidden text-sm"></div>' +
        '<button id="sp-save" class="w-full bg-nomad-500 hover:bg-nomad-600 text-white py-2.5 rounded-lg text-sm font-medium">등록하기</button>' +
      '</div>'
    document.getElementById('sp-back2').onclick = renderList
    wireScores(document.getElementById('sp-scores'))
    document.getElementById('sp-save').onclick = save
  }

  async function save() {
    const v = function (id) { return (document.getElementById(id).value || '').trim() }
    const name = v('f-name')
    if (!name) return showMsg('장소 이름을 입력해주세요.')
    const sc = readScores(document.getElementById('sp-scores'))
    const btn = document.getElementById('sp-save'); btn.disabled = true; btn.textContent = '등록 중...'
    try {
      const res = await axios.post(API, {
        name: name, city: document.getElementById('f-city').value, type: document.getElementById('f-type').value,
        area: v('f-area'), hours: v('f-hours'), price_note: v('f-price'),
        wifi_mbps: v('f-wifi') || null, tags: v('f-tags'),
        review: { wifi: sc.wifi, quiet: sc.quiet, seat: sc.seat, toilet: sc.toilet, clean: sc.clean, comment: v('f-comment') },
      })
      city = document.getElementById('f-city').value
      await loadCities()
      const slug = res.data && res.data.spot && res.data.spot.slug
      if (slug) renderDetail(slug); else renderList()
    } catch (e) {
      showMsg((e.response && e.response.data && e.response.data.error) || '등록에 실패했습니다.')
      btn.disabled = false; btn.textContent = '등록하기'
    }
  }
  function showMsg(t) {
    const m = document.getElementById('sp-msg2')
    if (m) { m.className = 'text-sm text-red-600'; m.textContent = t }
  }

  // ---- 네비게이션 진입점 ----
  function injectNav() {
    const container = document.querySelector('nav .gap-3')
    if (!container || document.getElementById('sp-nav-btn')) return
    const b = document.createElement('button')
    b.id = 'sp-nav-btn'
    b.className = 'text-gray-600 hover:text-nomad-600 text-sm font-medium px-2 py-2 transition-colors'
    b.innerHTML = '<i class="fas fa-mug-hot sm:mr-1"></i><span class="hidden sm:inline">워케이션</span>'
    b.onclick = open
    container.insertBefore(b, container.firstChild)
  }

  function start() {
    const root = document.getElementById('app')
    if (!root) { setTimeout(start, 300); return }
    new MutationObserver(function () { injectNav() }).observe(root, { childList: true, subtree: true })
    injectNav()
  }

  window.openSpots = open
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
