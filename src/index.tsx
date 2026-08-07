import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import jobsRoute from './routes/jobs'
import companiesRoute from './routes/companies'
import salaryRoute from './routes/salary'
import authRoute from './routes/auth'
import userJobsRoute from './routes/user-jobs'
import employerRoute from './routes/employer'
import aggregateRoute from './routes/aggregate'

type Bindings = {
  DB: D1Database
  JWT_SECRET?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 미들웨어
app.use('/api/*', cors())

// API 라우트
app.route('/api/jobs', jobsRoute)
app.route('/api/companies', companiesRoute)
app.route('/api/salary', salaryRoute)
app.route('/api/auth', authRoute)
app.route('/api/user', userJobsRoute)
app.route('/api/employer', employerRoute)
app.route('/api/aggregate', aggregateRoute)

// 헬스체크
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'NomaWork API' }))

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './' }))

// SPA 폴백 - 모든 경로를 index.html로
app.get('*', async (c) => {
  const html = getIndexHTML()
  return c.html(html)
})

function getIndexHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NomaWork - 디지털 노마드 채용 플랫폼</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="/static/styles.css">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            nomad: {
              50: '#f0fdf9',
              100: '#ccfbef',
              200: '#99f6df',
              300: '#5eead4',
              400: '#2dd4bf',
              500: '#14b8a6',
              600: '#0d9488',
              700: '#0f766e',
              800: '#115e59',
              900: '#134e4a',
            }
          },
          fontFamily: {
            sans: ['Pretendard', '-apple-system', 'sans-serif']
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gray-50 font-sans">
  <div id="app"></div>
  <script src="/static/app.js"></script>
  <script src="/static/auth-ui.js"></script>
  <script src="/static/employer-ui.js"></script>
  <script src="/static/source-ui.js"></script>
  <script src="/static/eligibility-ui.js"></script>
</body>
</html>`
}

export default app
