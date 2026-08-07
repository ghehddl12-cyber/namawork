import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'

type Bindings = { DB: D1Database; JWT_SECRET?: string }
const app = new Hono<{ Bindings: Bindings }>()

// 로컬 개발용 폴백 시크릿 (실제 배포 시 wrangler secret / .dev.vars 로 JWT_SECRET 설정)
const getSecret = (c: any): string => c.env.JWT_SECRET || 'nomawork-dev-secret-change-me'

// ===== 비밀번호 해싱 (PBKDF2 / Web Crypto) =====
const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16)
  return arr
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  )
  // 형식: pbkdf2$<iterations>$<saltHex>$<hashHex>
  return `pbkdf2$100000$${toHex(salt.buffer)}$${toHex(bits)}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const iterations = parseInt(iterStr)
    const salt = fromHex(saltHex)
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    )
    const computed = toHex(bits)
    // 상수 시간 비교
    if (computed.length !== hashHex.length) return false
    let diff = 0
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i)
    return diff === 0
  } catch {
    return false
  }
}

// 응답에서 민감 필드 제거
function safeUser(row: any) {
  if (!row) return null
  const { password_hash, ...rest } = row
  return rest
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// ===== 회원가입 =====
app.post('/signup', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const name = (body.name || '').trim() || null
  const current_timezone = body.current_timezone || null

  if (!isEmail(email)) return c.json({ error: '올바른 이메일을 입력하세요.' }, 400)
  if (password.length < 8) return c.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, 400)

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: '이미 가입된 이메일입니다.' }, 409)

  const password_hash = await hashPassword(password)
  const result = await db
    .prepare('INSERT INTO users (email, password_hash, name, current_timezone) VALUES (?, ?, ?, ?)')
    .bind(email, password_hash, name, current_timezone)
    .run()

  const userId = result.meta.last_row_id
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
  const token = await sign({ sub: userId, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, getSecret(c))

  return c.json({ token, user: safeUser(user) }, 201)
})

// ===== 로그인 =====
app.post('/login', async (c) => {
  const db = c.env.DB
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  if (!email || !password) return c.json({ error: '이메일과 비밀번호를 입력하세요.' }, 400)

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
  }

  const token = await sign({ sub: user.id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, getSecret(c))
  return c.json({ token, user: safeUser(user) })
})

// ===== 토큰에서 사용자 추출 (미들웨어 겸용 헬퍼) =====
export async function getUserFromToken(c: any): Promise<any | null> {
  const auth = c.req.header('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const payload = await verify(token, getSecret(c), 'HS256')
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first()
    return safeUser(user)
  } catch {
    return null
  }
}

// ===== 내 정보 조회 =====
app.get('/me', async (c) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  return c.json({ user })
})

// ===== 내 프로필 수정 (타임존/스킬/희망연봉 등) =====
app.put('/me', async (c) => {
  const user = await getUserFromToken(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: '잘못된 요청입니다.' }, 400) }

  const fields: string[] = []
  const params: any[] = []
  const allowed = ['name', 'current_timezone', 'preferred_timezones', 'skills', 'experience_level', 'preferred_salary_min']
  for (const key of allowed) {
    if (key in body) {
      let v = body[key]
      if ((key === 'preferred_timezones' || key === 'skills') && Array.isArray(v)) v = JSON.stringify(v)
      fields.push(`${key} = ?`)
      params.push(v)
    }
  }
  if (fields.length === 0) return c.json({ error: '수정할 항목이 없습니다.' }, 400)

  params.push(user.id)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
  const updated = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first()
  return c.json({ user: safeUser(updated) })
})

export default app
