import { Hono } from 'hono'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()

// 기업 목록
app.get('/', async (c) => {
  const db = c.env.DB
  const { q, remote_policy, industry } = c.req.query()

  let query = `SELECT *, (SELECT COUNT(*) FROM jobs WHERE company_id = companies.id AND is_active = 1) as job_count FROM companies WHERE 1=1`
  const params: any[] = []

  if (q) { query += ` AND name LIKE ?`; params.push(`%${q}%`) }
  if (remote_policy) { query += ` AND remote_policy = ?`; params.push(remote_policy) }
  if (industry) { query += ` AND industry LIKE ?`; params.push(`%${industry}%`) }

  query += ` ORDER BY rating DESC LIMIT 20`
  const { results } = await db.prepare(query).bind(...params).all()
  return c.json(results)
})

// 기업 상세
app.get('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const company = await db.prepare(`SELECT * FROM companies WHERE id = ?`).bind(id).first()
  if (!company) return c.json({ error: 'Company not found' }, 404)

  const { results: jobs } = await db.prepare(`
    SELECT id, title, slug, category, remote_type, contract_type,
      experience_level, salary_min, salary_max, salary_currency, salary_period,
      posted_at, is_featured
    FROM jobs WHERE company_id = ? AND is_active = 1
    ORDER BY is_featured DESC, posted_at DESC
  `).bind(id).all()

  return c.json({ ...company, jobs })
})

export default app
