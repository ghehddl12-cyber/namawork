import { Hono } from 'hono'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()

// 공고 목록 조회 (필터 + 검색)
app.get('/', async (c) => {
  const db = c.env.DB
  const {
    q, category, remote_type, contract_type,
    experience_level, timezone, salary_min,
    page = '1', limit = '12', featured
  } = c.req.query()

  let query = `
    SELECT j.*, 
      co.name as company_name, co.logo_url, co.industry,
      co.headquarters_country, co.headquarters_city,
      co.rating as company_rating, co.remote_policy
    FROM jobs j
    JOIN companies co ON j.company_id = co.id
    WHERE j.is_active = 1
  `
  const params: any[] = []

  if (q) {
    query += ` AND (j.title LIKE ? OR co.name LIKE ? OR j.skills_required LIKE ?)`
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (category) { query += ` AND j.category = ?`; params.push(category) }
  if (remote_type) { query += ` AND j.remote_type = ?`; params.push(remote_type) }
  if (contract_type) { query += ` AND j.contract_type = ?`; params.push(contract_type) }
  if (experience_level) { query += ` AND j.experience_level = ?`; params.push(experience_level) }
  if (featured === 'true') { query += ` AND j.is_featured = 1` }
  if (salary_min) {
    query += ` AND (j.salary_max >= ? OR j.salary_period = 'hourly')`
    params.push(parseInt(salary_min))
  }

  // 타임존 필터
  if (timezone) {
    query += ` AND (j.required_timezone IS NULL OR j.required_timezone = ? OR j.preferred_timezones LIKE ?)`
    params.push(timezone, `%${timezone}%`)
  }

  // 총 개수
  const countQuery = query.replace(
    `j.*, \n      co.name as company_name, co.logo_url, co.industry,\n      co.headquarters_country, co.headquarters_city,\n      co.rating as company_rating, co.remote_policy`,
    'COUNT(*) as total'
  )
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total ?? 0

  // 페이지네이션
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const offset = (pageNum - 1) * limitNum
  query += ` ORDER BY j.is_featured DESC, j.posted_at DESC LIMIT ? OFFSET ?`
  params.push(limitNum, offset)

  const { results } = await db.prepare(query).bind(...params).all()

  // 스킬/툴 파싱
  const jobs = results.map((job: any) => ({
    ...job,
    skills_required: safeJsonParse(job.skills_required, []),
    skills_preferred: safeJsonParse(job.skills_preferred, []),
    tools: safeJsonParse(job.tools, []),
    preferred_timezones: safeJsonParse(job.preferred_timezones, []),
    languages_required: safeJsonParse(job.languages_required, [])
  }))

  return c.json({
    jobs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum)
    }
  })
})

// 공고 상세
app.get('/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')

  const job = await db.prepare(`
    SELECT j.*,
      co.name as company_name, co.logo_url, co.website, co.size as company_size,
      co.industry, co.description as company_description,
      co.headquarters_country, co.headquarters_city, co.timezone as company_timezone,
      co.rating as company_rating, co.review_count, co.remote_policy, co.founded_year
    FROM jobs j
    JOIN companies co ON j.company_id = co.id
    WHERE j.slug = ? AND j.is_active = 1
  `).bind(slug).first()

  if (!job) return c.json({ error: 'Job not found' }, 404)

  // 조회수 증가
  await db.prepare(`UPDATE jobs SET view_count = view_count + 1 WHERE slug = ?`).bind(slug).run()

  const result: any = {
    ...job,
    skills_required: safeJsonParse((job as any).skills_required, []),
    skills_preferred: safeJsonParse((job as any).skills_preferred, []),
    tools: safeJsonParse((job as any).tools, []),
    preferred_timezones: safeJsonParse((job as any).preferred_timezones, []),
    languages_required: safeJsonParse((job as any).languages_required, [])
  }

  // 유사 공고
  const similar = await db.prepare(`
    SELECT j.id, j.title, j.slug, j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
      j.remote_type, j.contract_type, j.experience_level,
      co.name as company_name, co.headquarters_country
    FROM jobs j
    JOIN companies co ON j.company_id = co.id
    WHERE j.is_active = 1 AND j.slug != ? AND j.category = ?
    ORDER BY RANDOM() LIMIT 3
  `).bind(slug, (job as any).category).all()

  result.similar_jobs = similar.results

  return c.json(result)
})

// 카테고리 목록
app.get('/meta/categories', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM jobs WHERE is_active = 1 
    GROUP BY category ORDER BY count DESC
  `).all()
  return c.json(results)
})

// 타임존 목록
app.get('/meta/timezones', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare(`
    SELECT * FROM timezones ORDER BY offset_hours
  `).all()
  return c.json(results)
})

function safeJsonParse(val: any, fallback: any) {
  try { return JSON.parse(val) } catch { return fallback }
}

export default app
