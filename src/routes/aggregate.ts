import { Hono } from 'hono'

type Bindings = { DB: D1Database; SYNC_KEY?: string }
const app = new Hono<{ Bindings: Bindings }>()

// ===== 유틸 =====
function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim()
}
function slugify(s: string, id: string): string {
  const base = (s || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return (base || 'job') + '-' + id
}
// RSS/XML에서 태그 내용 추출 (CDATA 지원)
function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i'))
  if (!m) return ''
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
}
function items(xml: string): string[] {
  const out: string[] = []
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null) out.push(m[1])
  return out
}

// 카테고리 정규화
function normCategory(raw: string): string {
  const s = (raw || '').toLowerCase()
  if (/(engineer|developer|programming|software|devops|data|backend|frontend|full.?stack)/.test(s)) return 'Engineering'
  if (/(design|ux|ui|product design)/.test(s)) return 'Design'
  if (/(market|growth|seo|content)/.test(s)) return 'Marketing'
  if (/(sales|account executive|business development)/.test(s)) return 'Sales'
  if (/(support|customer|success)/.test(s)) return 'Customer Support'
  if (/(product manager|product management)/.test(s)) return 'Product'
  if (/(finance|account|hr|people|legal|operations)/.test(s)) return 'Operations'
  return 'Other'
}

// 위치 문구에서 근무 가능 범위 추정
function normRemote(location: string): { remote_type: string; required_timezone: string | null } {
  const s = (location || '').toLowerCase()
  if (!s || /anywhere|worldwide|global|any location/.test(s)) return { remote_type: 'fully_remote', required_timezone: null }
  if (/(utc|gmt|cet|est|pst|timezone|time zone)/.test(s)) return { remote_type: 'timezone_limited', required_timezone: location.slice(0, 40) }
  // 특정 국가/지역 한정
  return { remote_type: 'timezone_limited', required_timezone: location.slice(0, 40) }
}

type Norm = {
  external_id: string; source: string; title: string; company: string
  description: string; location: string; url: string
  salary_min: number | null; salary_max: number | null
  category: string; skills: string[]
}

// ===== 파서: Remote OK (JSON) =====
export function parseRemoteOK(json: any[]): Norm[] {
  const out: Norm[] = []
  for (const j of json || []) {
    if (!j || !j.id || !j.position) continue // 첫 항목은 안내(legal) 객체라 걸러짐
    out.push({
      external_id: String(j.id), source: 'remoteok',
      title: String(j.position).slice(0, 200),
      company: String(j.company || 'Unknown').slice(0, 120),
      description: stripHtml(j.description || '').slice(0, 4000),
      location: String(j.location || '').slice(0, 120),
      url: j.url || ('https://remoteok.com/remote-jobs/' + j.id),
      salary_min: typeof j.salary_min === 'number' && j.salary_min > 0 ? j.salary_min : null,
      salary_max: typeof j.salary_max === 'number' && j.salary_max > 0 ? j.salary_max : null,
      category: normCategory((j.tags || []).join(' ') + ' ' + j.position),
      skills: Array.isArray(j.tags) ? j.tags.slice(0, 8) : []
    })
  }
  return out
}

// ===== 파서: RSS (WWR / Himalayas 공통) =====
export function parseRss(xml: string, source: string): Norm[] {
  const out: Norm[] = []
  for (const it of items(xml)) {
    const rawTitle = stripHtml(tag(it, 'title'))
    const link = stripHtml(tag(it, 'link')) || stripHtml(tag(it, 'guid'))
    if (!rawTitle || !link) continue
    // WWR 제목 형식: "회사명: 직무명"
    let company = 'Unknown', title = rawTitle
    const idx = rawTitle.indexOf(':')
    if (idx > 0 && idx < 60) { company = rawTitle.slice(0, idx).trim(); title = rawTitle.slice(idx + 1).trim() }
    const desc = stripHtml(tag(it, 'description')).slice(0, 4000)
    const region = stripHtml(tag(it, 'region')) || stripHtml(tag(it, 'category'))
    const id = (link.match(/([a-z0-9-]+)\/?$/i) || [, link])[1]
    out.push({
      external_id: String(id).slice(0, 120), source,
      title: title.slice(0, 200), company: company.slice(0, 120),
      description: desc, location: (region || '').slice(0, 120), url: link,
      salary_min: null, salary_max: null,
      category: normCategory(rawTitle + ' ' + region), skills: []
    })
  }
  return out
}

// ===== 저장 (중복은 건너뜀) =====
async function saveJobs(db: D1Database, list: Norm[]): Promise<{ added: number; skipped: number }> {
  let added = 0, skipped = 0
  for (const n of list) {
    try {
      const exists = await db.prepare('SELECT id FROM jobs WHERE source = ? AND external_id = ?')
        .bind(n.source, n.external_id).first()
      if (exists) { skipped++; continue }

      // 회사 확보 (없으면 생성)
      let company = await db.prepare('SELECT id FROM companies WHERE name = ?').bind(n.company).first<any>()
      let companyId: number
      if (company) companyId = company.id
      else {
        const cr = await db.prepare(
          'INSERT INTO companies (name, industry, headquarters_country, timezone, remote_policy) VALUES (?,?,?,?,?)'
        ).bind(n.company, n.category, n.location || 'Remote', 'UTC+0', 'fully_remote').run()
        companyId = cr.meta.last_row_id as number
      }

      const r = normRemote(n.location)
      await db.prepare(
        `INSERT INTO jobs (company_id, title, slug, category, description, requirements,
           remote_type, contract_type, experience_level, salary_min, salary_max, salary_currency, salary_period,
           required_timezone, skills_required, is_active, source, source_url, external_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`
      ).bind(
        companyId, n.title, slugify(n.title, n.source + '-' + n.external_id), n.category,
        n.description || n.title, '원문 공고를 확인해주세요.',
        r.remote_type, 'full_time', 'any',
        n.salary_min, n.salary_max, 'USD', 'yearly',
        r.required_timezone, JSON.stringify(n.skills),
        n.source, n.url, n.external_id
      ).run()
      added++
    } catch { skipped++ }
  }
  return { added, skipped }
}

async function log(db: D1Database, source: string, added: number, skipped: number, status: string, message?: string) {
  await db.prepare('INSERT INTO sync_logs (source, added, skipped, status, message) VALUES (?,?,?,?,?)')
    .bind(source, added, skipped, status, message || null).run()
}

// ===== 수집 실행 =====
const FEEDS = [
  { key: 'remoteok', url: 'https://remoteok.com/api', type: 'json' },
  { key: 'wwr', url: 'https://weworkremotely.com/remote-jobs.rss', type: 'rss' },
  { key: 'himalayas', url: 'https://himalayas.app/jobs/rss', type: 'rss' },
]

export async function runSync(db: D1Database): Promise<any> {
  const result: any[] = []
  for (const f of FEEDS) {
    try {
      const res = await fetch(f.url, { headers: { 'User-Agent': 'NomaWork/1.0 (+https://nomawork.pages.dev)' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      let list: Norm[]
      if (f.type === 'json') list = parseRemoteOK(await res.json())
      else list = parseRss(await res.text(), f.key)
      list = list.slice(0, 50) // 1회 최대 50건
      const { added, skipped } = await saveJobs(db, list)
      await log(db, f.key, added, skipped, 'ok')
      result.push({ source: f.key, added, skipped, status: 'ok' })
    } catch (e: any) {
      await log(db, f.key, 0, 0, 'error', String(e && e.message).slice(0, 200))
      result.push({ source: f.key, added: 0, skipped: 0, status: 'error', message: String(e && e.message) })
    }
  }
  return result
}

// 수동 실행 (관리자 화면의 "지금 수집하기")
app.post('/run', async (c) => {
  const result = await runSync(c.env.DB)
  return c.json({ result })
})

// 수집 현황 (관리자 화면)
app.get('/status', async (c) => {
  const db = c.env.DB
  const total = await db.prepare('SELECT COUNT(*) as n FROM jobs WHERE is_active = 1').first<any>()
  const bySource = await db.prepare(
    `SELECT source, COUNT(*) as n, MAX(posted_at) as last FROM jobs WHERE is_active = 1 GROUP BY source`
  ).all()
  const today = await db.prepare(
    `SELECT COUNT(*) as n FROM jobs WHERE is_active = 1 AND date(posted_at) = date('now')`
  ).first<any>()
  const logs = await db.prepare('SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10').all()
  return c.json({
    total: total?.n || 0,
    today: today?.n || 0,
    sources: bySource.results || [],
    logs: logs.results || []
  })
})

export default app
