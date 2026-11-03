import 'dotenv/config'
import express, { type Request } from 'express'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'

const requiredEnv = ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)
}

const app = express()
const port = Number(process.env.PORT ?? 4000)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'

app.disable('x-powered-by')
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.all('/api/auth/*splat', toNodeHandler(auth))

function requestHeaders(request: Request): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  return headers
}

app.get('/api/me', async (request, response) => {
  const session = await auth.api.getSession({ headers: requestHeaders(request) })
  if (!session) {
    response.status(401).json({ error: 'Unauthenticated' })
    return
  }
  response.json({ user: session.user, session: session.session })
})

app.listen(port, () => {
  console.log(`Pricing Platform API listening on http://localhost:${port}`)
})
