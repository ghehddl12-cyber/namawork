import { Hono } from 'hono'
import { getUserFromToken } from './auth'

type Bindings = { DB: D1Database; JWT_SECRET?: string }
const app = new Hono<{ Bindings: Bindings }>()

function slugify(name: string): string {
  const base = (name || 'spot').toLowerCase().replace(/[^a-z0-9가-훿]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return (base || 'spot') + '-' + Math.random().toString(36).slice(2, 7)
}
function toJsonArray(v: any): string {
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'string') return JSON.stringify(v.split(',').map((s) => s.trim()).filter(Boolean))
  return '[]'
}

// 평점 평균을 함께 조회하는 공통 SELECT
const SPOT_SELECT = `
  SELECT s.*,
    COUNT(r.id) as review_count,
    ROUND(AVG(r.r_wifi), 1) as avg_wifi,
    ROUND(AVG(r.r_quiet), 1) as avg_quiet,
    ROUND(AVG(r.r_seat), 1) as avg_seat,
    ROUND(AVG(r.r_toilet), 1) as avg_toilet,
    ROUND(AVG(r.r_clean), 1) as avg_clean,
    ROUND((AVG(r.r_wifi) + AVG(r.r_quiet) + AVG(r.r_seat) + AVG(r.r_toilet) + AVG(r.r_clean)) / 5.0, 1) as avg_total
  FROM spots s
  LEFT JOIN spot_reviews r ON r.spot_id = s.id
`

// ===== 도시 목록 =====
app.get('/cities', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ct.*, (SELECT COUNT(*) FROM spots s WHERE s.city = ct.key) as spot_count
     FROM spot_cities ct ORDER BY ct.sort_order, ct.name`
  ).all()
  return c.json({ cities: rows.results || [] })
})

// ===== 장소 목록 (도시/유형/조건 필터) =====
app.get('/', async (c) => {
  const { city, type, wifi, toilet, quiet } = c.req.query()
  let sql = SPOT_SELECT + ' WHERE 1=1'
  const params: any[] = []
  if (city) { sql += ' AND s.city = ?'; params.push(city) }
  if (type) { sql += ' AND s.type = ?'; params.push(type) }
  sql += ' GROUP BY s.id'
  // 후기 평균 기준 필터 (후기가 없으면 제외하지 않음)
  const having: string[] = []
  if (wifi === 'true') having.push('(avg_wifi IS NULL OR avg_wifi >= 4)')
  if (toilet === 'true') having.push('(avg_toilet IS NULL OR avg_toilet >= 4)')
  if (quiet === 'true') having.push('(avg_quiet IS NULL OR avg_quiet >= 4)')
  if (having.length) sql += ' HAVING ' + having.join(' AND ')
  sql += ' ORDER BY avg_total DESC NULLS LAST, s.created_at DESC'

  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  const spots = (rows.results || []).map((s: any) => ({
    ...s,
    tags: safeJson(s.tags),
  }))
  return c.json({ spots })
})

function safeJson(v: any) { try { const a = JSON.parse(v); return Array.isArray(a) ? a : [] } catch { return [] } }

// ===== 장소 상세 (후기 포함) =====
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const spot = await c.env.DB.prepare(SPOT_SELECT + ' WHERE s.slug = ? GROUP BY s.id').bind(slug).first<any>()
  if (!spot) return c.json({ error: '장소를 찾을 수 없습니다.' }, 404)

  const reviews = await c.env.DB.prepare(
    `SELECT r.*, u.name as user_name FROM spot_reviews r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.spot_id = ? ORDER BY r.created_at DESC LIMIT 20`
  ).bind(spot.id).all()

  return c.json({
    spot: { ...spot, tags: safeJson(spot.tags) },
    reviews: (reviews.results || []).map((r: any) => ({ ...r, user_name: r.user_name || '노마드' })),
  })
})

// ===== 장소 등록 (로그인 필요) =====
app.post('/', async (c) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  let b: any
  try { b = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const name = (b.name || '').trim()
  const city = (b.city || '').trim()
  if (!name || !city) return c.json({ error: '장소 이름과 도시는 필수입니다.' }, 400)

  const cityRow = await c.env.DB.prepare('SELECT name FROM spot_cities WHERE key = ?').bind(city).first<any>()
  const slug = slugify(name)

  await c.env.DB.prepare(
    `INSERT INTO spots (name, slug, city, city_name, type, area, address, price_note, hours, wifi_mbps, tags, map_url, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    name, slug, city, cityRow ? cityRow.name : city,
    b.type === 'cowork' ? 'cowork' : 'cafe',
    b.area || null, b.address || null, b.price_note || null, b.hours || null,
    b.wifi_mbps ? parseInt(b.wifi_mbps) : null,
    toJsonArray(b.tags), b.map_url || null, user.id
  ).run()

  const spot = await c.env.DB.prepare('SELECT * FROM spots WHERE slug = ?').bind(slug).first()

  // 등록과 함께 첫 후기도 남긴 경우
  if (b.review && spot) {
    const r = b.review
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO spot_reviews (spot_id, user_id, r_wifi, r_quiet, r_seat, r_toilet, r_clean, comment)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind((spot as any).id, user.id, clamp(r.wifi), clamp(r.quiet), clamp(r.seat), clamp(r.toilet), clamp(r.clean), r.comment || null).run()
  }

  return c.json({ spot }, 201)
})

function clamp(v: any): number {
  const n = parseInt(v)
  if (isNaN(n)) return 3
  return Math.min(5, Math.max(1, n))
}

// ===== 후기 작성/수정 (로그인 필요) =====
app.post('/:slug/reviews', async (c) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const slug = c.req.param('slug')
  const spot = await c.env.DB.prepare('SELECT id FROM spots WHERE slug = ?').bind(slug).first<any>()
  if (!spot) return c.json({ error: '장소를 찾을 수 없습니다.' }, 404)

  let b: any
  try { b = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const exists = await c.env.DB.prepare('SELECT id FROM spot_reviews WHERE spot_id = ? AND user_id = ?')
    .bind(spot.id, user.id).first()

  if (exists) {
    await c.env.DB.prepare(
      `UPDATE spot_reviews SET r_wifi=?, r_quiet=?, r_seat=?, r_toilet=?, r_clean=?, comment=?, created_at=CURRENT_TIMESTAMP
       WHERE spot_id=? AND user_id=?`
    ).bind(clamp(b.wifi), clamp(b.quiet), clamp(b.seat), clamp(b.toilet), clamp(b.clean), b.comment || null, spot.id, user.id).run()
    return c.json({ updated: true })
  }

  await c.env.DB.prepare(
    `INSERT INTO spot_reviews (spot_id, user_id, r_wifi, r_quiet, r_seat, r_toilet, r_clean, comment)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(spot.id, user.id, clamp(b.wifi), clamp(b.quiet), clamp(b.seat), clamp(b.toilet), clamp(b.clean), b.comment || null).run()
  return c.json({ created: true }, 201)
})

// 후기 삭제 (본인 것만)
app.delete('/:slug/reviews', async (c) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const spot = await c.env.DB.prepare('SELECT id FROM spots WHERE slug = ?').bind(c.req.param('slug')).first<any>()
  if (!spot) return c.json({ error: '장소를 찾을 수 없습니다.' }, 404)
  await c.env.DB.prepare('DELETE FROM spot_reviews WHERE spot_id = ? AND user_id = ?').bind(spot.id, user.id).run()
  return c.json({ deleted: true })
})

export default app
