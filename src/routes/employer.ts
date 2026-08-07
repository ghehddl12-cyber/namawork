import { Hono } from 'hono'
import { getUserFromToken } from './auth'

type Bindings = { DB: D1Database; JWT_SECRET?: string }
const app = new Hono<{ Bindings: Bindings }>()

// 로그인 필요
app.use('*', async (c, next) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  c.set('user' as never, user as never)
  await next()
})
const getUser = (c: any) => c.get('user')

// slug 생성 (제목 기반 + 고유 접미사)
function makeSlug(title: string): string {
  const base = (title || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return (base || 'job') + '-' + suffix
}

function toJsonArray(v: any): string {
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'string') {
    const arr = v.split(',').map((s) => s.trim()).filter(Boolean)
    return JSON.stringify(arr)
  }
  return '[]'
}

// ===== 내 회사 프로필 =====
app.get('/company', async (c) => {
  const user = getUser(c)
  if (!user.company_id) return c.json({ company: null })
  const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(user.company_id).first()
  return c.json({ company: company || null })
})

// 회사 프로필 생성/수정 (사용자당 1개)
app.post('/company', async (c) => {
  const user = getUser(c)
  let b: any
  try { b = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const name = (b.name || '').trim()
  const industry = (b.industry || '').trim()
  const country = (b.headquarters_country || '').trim()
  if (!name || !industry || !country) return c.json({ error: '회사명, 산업, 국가는 필수입니다.' }, 400)

  const fields = {
    name,
    industry,
    headquarters_country: country,
    headquarters_city: b.headquarters_city || null,
    size: b.size || null,
    website: b.website || null,
    description: b.description || null,
    timezone: b.timezone || user.current_timezone || 'UTC+9',
    remote_policy: b.remote_policy || null,
    founded_year: b.founded_year || null,
  }

  if (user.company_id) {
    // 수정
    await c.env.DB.prepare(
      `UPDATE companies SET name=?, industry=?, headquarters_country=?, headquarters_city=?, size=?, website=?, description=?, timezone=?, remote_policy=?, founded_year=? WHERE id=?`
    ).bind(fields.name, fields.industry, fields.headquarters_country, fields.headquarters_city, fields.size, fields.website, fields.description, fields.timezone, fields.remote_policy, fields.founded_year, user.company_id).run()
    const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(user.company_id).first()
    return c.json({ company })
  } else {
    // 생성 + 사용자에 연결
    const res = await c.env.DB.prepare(
      `INSERT INTO companies (name, industry, headquarters_country, headquarters_city, size, website, description, timezone, remote_policy, founded_year) VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(fields.name, fields.industry, fields.headquarters_country, fields.headquarters_city, fields.size, fields.website, fields.description, fields.timezone, fields.remote_policy, fields.founded_year).run()
    const companyId = res.meta.last_row_id
    await c.env.DB.prepare('UPDATE users SET company_id = ? WHERE id = ?').bind(companyId, user.id).run()
    const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(companyId).first()
    return c.json({ company }, 201)
  }
})

// ===== 내 공고 목록 =====
app.get('/jobs', async (c) => {
  const user = getUser(c)
  const rows = await c.env.DB.prepare(
    `SELECT j.id, j.slug, j.title, j.category, j.remote_type, j.contract_type, j.experience_level,
       j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.required_timezone,
       j.description, j.requirements, j.nice_to_have, j.skills_required,
       j.is_active, j.applicant_count, j.view_count, j.posted_at
     FROM jobs j WHERE j.posted_by = ? ORDER BY j.posted_at DESC`
  ).bind(user.id).all()
  return c.json({ jobs: rows.results || [] })
})

// 공고 등록
app.post('/jobs', async (c) => {
  const user = getUser(c)
  if (!user.company_id) return c.json({ error: '먼저 회사 프로필을 등록해주세요.' }, 400)
  let b: any
  try { b = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const title = (b.title || '').trim()
  const category = (b.category || '').trim()
  const description = (b.description || '').trim()
  const requirements = (b.requirements || '').trim()
  const remote_type = b.remote_type || 'fully_remote'
  const contract_type = b.contract_type || 'full_time'
  if (!title || !category || !description || !requirements) {
    return c.json({ error: '제목, 직무, 설명, 자격요건은 필수입니다.' }, 400)
  }

  const slug = makeSlug(title)
  await c.env.DB.prepare(
    `INSERT INTO jobs (company_id, title, slug, category, description, requirements, nice_to_have,
       remote_type, contract_type, experience_level, salary_min, salary_max, salary_currency, salary_period,
       required_timezone, skills_required, skills_preferred, is_active, posted_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`
  ).bind(
    user.company_id, title, slug, category, description, requirements, b.nice_to_have || null,
    remote_type, contract_type, b.experience_level || 'any',
    b.salary_min || null, b.salary_max || null, b.salary_currency || 'USD', b.salary_period || 'yearly',
    b.required_timezone || null, toJsonArray(b.skills_required), toJsonArray(b.skills_preferred), user.id
  ).run()

  const job = await c.env.DB.prepare('SELECT id, slug, title FROM jobs WHERE slug = ?').bind(slug).first()
  return c.json({ job }, 201)
})

// 공고 수정 (본인 것만)
app.put('/jobs/:id', async (c) => {
  const user = getUser(c)
  const id = parseInt(c.req.param('id'))
  const owned = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ? AND posted_by = ?').bind(id, user.id).first()
  if (!owned) return c.json({ error: '수정 권한이 없습니다.' }, 403)
  let b: any
  try { b = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const map: Record<string, any> = {}
  const simple = ['title', 'category', 'description', 'requirements', 'nice_to_have', 'remote_type', 'contract_type', 'experience_level', 'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'required_timezone', 'is_active']
  for (const k of simple) if (k in b) map[k] = b[k]
  if ('skills_required' in b) map['skills_required'] = toJsonArray(b.skills_required)
  if ('skills_preferred' in b) map['skills_preferred'] = toJsonArray(b.skills_preferred)

  const keys = Object.keys(map)
  if (!keys.length) return c.json({ error: '수정할 항목이 없습니다.' }, 400)
  const setSql = keys.map((k) => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE jobs SET ${setSql} WHERE id = ?`).bind(...keys.map((k) => map[k]), id).run()
  const job = await c.env.DB.prepare('SELECT id, slug, title FROM jobs WHERE id = ?').bind(id).first()
  return c.json({ job })
})

// 공고 삭제 (본인 것만)
app.delete('/jobs/:id', async (c) => {
  const user = getUser(c)
  const id = parseInt(c.req.param('id'))
  const owned = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ? AND posted_by = ?').bind(id, user.id).first()
  if (!owned) return c.json({ error: '삭제 권한이 없습니다.' }, 403)
  await c.env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run()
  return c.json({ deleted: true })
})

export default app
