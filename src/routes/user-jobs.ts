import { Hono } from 'hono'
import { getUserFromToken } from './auth'

type Bindings = { DB: D1Database; JWT_SECRET?: string }
const app = new Hono<{ Bindings: Bindings }>()

// 저장/지원 목록에서 카드 표시에 필요한 공고 필드 (+ 회사 정보)
const JOB_SELECT = `
  SELECT j.id, j.slug, j.title, j.category, j.remote_type, j.contract_type,
    j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
    j.required_timezone, j.preferred_timezones,
    co.name as company_name, co.logo_url, co.industry,
    co.headquarters_country, co.headquarters_city
  FROM jobs j JOIN companies co ON j.company_id = co.id
`

// 모든 라우트는 로그인 필요
app.use('*', async (c, next) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  c.set('user' as never, user as never)
  await next()
})
const getUser = (c: any) => c.get('user')

// ===== 저장한 공고 =====
app.get('/saved', async (c) => {
  const user = getUser(c)
  const rows = await c.env.DB.prepare(
    `${JOB_SELECT} JOIN saved_jobs s ON s.job_id = j.id WHERE s.user_id = ? ORDER BY s.created_at DESC`
  ).bind(user.id).all()
  return c.json({ jobs: rows.results || [] })
})

app.post('/saved/:jobId', async (c) => {
  const user = getUser(c)
  const jobId = parseInt(c.req.param('jobId'))
  if (!jobId) return c.json({ error: '잘못된 공고입니다.' }, 400)
  await c.env.DB.prepare('INSERT OR IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)').bind(user.id, jobId).run()
  return c.json({ saved: true })
})

app.delete('/saved/:jobId', async (c) => {
  const user = getUser(c)
  const jobId = parseInt(c.req.param('jobId'))
  await c.env.DB.prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?').bind(user.id, jobId).run()
  return c.json({ saved: false })
})

// ===== 지원 =====
app.get('/applications', async (c) => {
  const user = getUser(c)
  const rows = await c.env.DB.prepare(
    `SELECT j.id, j.slug, j.title, j.category, j.remote_type, j.contract_type,
       j.experience_level, j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
       j.required_timezone, j.preferred_timezones,
       co.name as company_name, co.logo_url, co.industry,
       co.headquarters_country, co.headquarters_city,
       a.status as application_status, a.created_at as applied_at
     FROM jobs j
     JOIN companies co ON j.company_id = co.id
     JOIN job_applications a ON a.job_id = j.id
     WHERE a.user_id = ? ORDER BY a.created_at DESC`
  ).bind(user.id).all()
  return c.json({ jobs: rows.results || [] })
})

app.post('/applications/:jobId', async (c) => {
  const user = getUser(c)
  const jobId = parseInt(c.req.param('jobId'))
  if (!jobId) return c.json({ error: '잘못된 공고입니다.' }, 400)
  let note: string | null = null
  try { const b = await c.req.json(); note = (b && b.cover_note) || null } catch { /* body 없음 허용 */ }

  const exists = await c.env.DB.prepare('SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?').bind(user.id, jobId).first()
  if (exists) return c.json({ error: '이미 지원한 공고입니다.', applied: true }, 409)

  await c.env.DB.prepare('INSERT INTO job_applications (user_id, job_id, cover_note) VALUES (?, ?, ?)').bind(user.id, jobId, note).run()
  return c.json({ applied: true }, 201)
})

app.delete('/applications/:jobId', async (c) => {
  const user = getUser(c)
  const jobId = parseInt(c.req.param('jobId'))
  await c.env.DB.prepare('DELETE FROM job_applications WHERE user_id = ? AND job_id = ?').bind(user.id, jobId).run()
  return c.json({ applied: false })
})

// ===== 특정 공고의 저장/지원 상태 (상세페이지 버튼용) =====
app.get('/status/:jobId', async (c) => {
  const user = getUser(c)
  const jobId = parseInt(c.req.param('jobId'))
  const saved = await c.env.DB.prepare('SELECT 1 FROM saved_jobs WHERE user_id = ? AND job_id = ?').bind(user.id, jobId).first()
  const applied = await c.env.DB.prepare('SELECT 1 FROM job_applications WHERE user_id = ? AND job_id = ?').bind(user.id, jobId).first()
  return c.json({ saved: !!saved, applied: !!applied })
})

export default app
