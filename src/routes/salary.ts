import { Hono } from 'hono'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()

// 실시간 환율 (외부 API 없이 고정값 사용 - 실제로는 외부 API 연동)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  KRW: 1315,
  JPY: 149,
  SGD: 1.34,
  AUD: 1.53,
  CAD: 1.36,
  THB: 35.1,
  VND: 24500,
  IDR: 15600,
  BRL: 4.97,
  MXN: 17.15,
  PLN: 3.98,
  GEL: 2.71
}

// 생활비 지수 (뉴욕=100 기준, 편안한 생활 월 예산 USD)
const CITY_COST_INDEX: Record<string, { index: number, monthly_budget: number }> = {
  'New York': { index: 100, monthly_budget: 4500 },
  'San Francisco': { index: 105, monthly_budget: 4800 },
  'London': { index: 88, monthly_budget: 3800 },
  'Berlin': { index: 68, monthly_budget: 2800 },
  'Amsterdam': { index: 78, monthly_budget: 3200 },
  'Lisbon': { index: 55, monthly_budget: 2200 },
  'Barcelona': { index: 60, monthly_budget: 2400 },
  'Bangkok': { index: 38, monthly_budget: 1500 },
  'Chiang Mai': { index: 32, monthly_budget: 1200 },
  'Ho Chi Minh City': { index: 30, monthly_budget: 1100 },
  'Bali': { index: 35, monthly_budget: 1300 },
  'Mexico City': { index: 42, monthly_budget: 1600 },
  'Medellin': { index: 35, monthly_budget: 1300 },
  'Seoul': { index: 80, monthly_budget: 3000 },
  'Tokyo': { index: 82, monthly_budget: 3200 },
  'Singapore': { index: 95, monthly_budget: 4000 },
  'Sydney': { index: 90, monthly_budget: 3800 },
  'Toronto': { index: 82, monthly_budget: 3400 },
  'Warsaw': { index: 48, monthly_budget: 1900 },
  'Tbilisi': { index: 38, monthly_budget: 1400 },
  'Tallinn': { index: 55, monthly_budget: 2200 },
  'Dubai': { index: 72, monthly_budget: 3000 },
  'Austin': { index: 75, monthly_budget: 3200 },
  'Chicago': { index: 80, monthly_budget: 3400 }
}

// 급여 계산 API
app.post('/calculate', async (c) => {
  const { salary, currency = 'USD', period = 'yearly', city, target_currency = 'USD' } = await c.req.json()

  // 연봉 기준으로 환산
  let annualSalaryUSD = salary
  if (period === 'monthly') annualSalaryUSD = salary * 12
  if (period === 'hourly') annualSalaryUSD = salary * 40 * 52 // 주 40시간

  // 원화 환산
  const rate = EXCHANGE_RATES[currency] || 1
  const annualSalaryOriginal = annualSalaryUSD / (EXCHANGE_RATES[currency] || 1)

  // 타겟 통화로 환산
  const targetRate = EXCHANGE_RATES[target_currency] || 1
  const annualTargetCurrency = (annualSalaryUSD / rate) * targetRate

  // 도시 생활비 기반 실질 구매력
  let purchasing_power_ratio = 1
  let monthly_budget = null
  let city_cost_index = null

  if (city && CITY_COST_INDEX[city]) {
    const cityData = CITY_COST_INDEX[city]
    // 뉴욕 대비 실질 구매력
    purchasing_power_ratio = 100 / cityData.index
    monthly_budget = cityData.monthly_budget
    city_cost_index = cityData.index
  }

  const monthlyUSD = annualSalaryUSD / 12
  const adjustedMonthly = monthlyUSD * purchasing_power_ratio

  // 세금 추정 (매우 단순화)
  const estimatedTaxRate = annualSalaryUSD > 100000 ? 0.30 :
                           annualSalaryUSD > 60000 ? 0.25 :
                           annualSalaryUSD > 30000 ? 0.20 : 0.15

  const afterTaxMonthly = monthlyUSD * (1 - estimatedTaxRate)
  const savingsRatio = monthly_budget ? Math.max(0, (afterTaxMonthly - monthly_budget) / afterTaxMonthly) : null

  return c.json({
    input: { salary, currency, period, city, target_currency },
    annual_usd: Math.round(annualSalaryUSD),
    monthly_usd: Math.round(monthlyUSD),
    annual_target: Math.round(annualTargetCurrency),
    monthly_target: Math.round(annualTargetCurrency / 12),
    after_tax_monthly_usd: Math.round(afterTaxMonthly),
    purchasing_power_ratio: Math.round(purchasing_power_ratio * 100) / 100,
    adjusted_monthly_usd: Math.round(adjustedMonthly),
    city_cost_index,
    monthly_living_budget_usd: monthly_budget,
    estimated_savings_ratio: savingsRatio ? Math.round(savingsRatio * 100) : null,
    estimated_tax_rate: Math.round(estimatedTaxRate * 100),
    exchange_rates: EXCHANGE_RATES
  })
})

// 도시 목록
app.get('/cities', (c) => {
  const cities = Object.entries(CITY_COST_INDEX).map(([name, data]) => ({
    name,
    index: data.index,
    monthly_budget: data.monthly_budget
  })).sort((a, b) => a.index - b.index)
  return c.json(cities)
})

// 환율 정보
app.get('/rates', (c) => {
  return c.json(EXCHANGE_RATES)
})

export default app
