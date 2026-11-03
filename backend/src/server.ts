import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRoutes } from './routes/auth.routes.js'
import { userRoutes } from './routes/user.routes.js'
import { requireAuth } from './middleware/auth.middleware.js'

const requiredEnv = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)
}

const app = express()
const port = Number(process.env.PORT ?? 4000)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'

app.disable('x-powered-by')
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', requireAuth, userRoutes)

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

app.listen(port, () => console.log(`Pricing Platform API listening on http://localhost:${port}`))
