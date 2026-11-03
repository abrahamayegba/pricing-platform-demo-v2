import 'dotenv/config'
import express, { type Request } from 'express'
import cors from 'cors'
import { getUser, loginUser, registerUser, revokeRefreshToken, rotateRefreshToken, verifyAccessToken } from './lib/auth.js'

const requiredEnv = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const
for (const name of requiredEnv) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)

const app = express()
const port = Number(process.env.PORT ?? 4000)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'

app.disable('x-powered-by')
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_request, response) => response.json({ status: 'ok' }))

app.post('/api/auth/register', async (request, response) => {
  const { name, email, password } = request.body ?? {}
  if (typeof name !== 'string' || name.trim().length < 2 || typeof email !== 'string' || !email.includes('@') || typeof password !== 'string' || password.length < 8) {
    response.status(400).json({ error: 'Name, valid email, and password of at least 8 characters are required' })
    return
  }
  try { response.status(201).json(await registerUser({ name, email, password })) }
  catch { response.status(400).json({ error: 'Unable to create account' }) }
})

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') { response.status(400).json({ error: 'Email and password are required' }); return }
  try { response.json(await loginUser(email, password)) }
  catch { response.status(401).json({ error: 'Invalid credentials' }) }
})

app.post('/api/auth/refresh', async (request, response) => {
  const { refreshToken } = request.body ?? {}
  if (typeof refreshToken !== 'string') { response.status(400).json({ error: 'Refresh token is required' }); return }
  try { response.json(await rotateRefreshToken(refreshToken)) }
  catch { response.status(401).json({ error: 'Invalid refresh token' }) }
})

app.post('/api/auth/logout', async (request, response) => {
  if (typeof request.body?.refreshToken === 'string') await revokeRefreshToken(request.body.refreshToken)
  response.status(204).send()
})

function bearerToken(request: Request) {
  const value = request.headers.authorization
  return value?.startsWith('Bearer ') ? value.slice(7) : null
}

app.get('/api/me', async (request, response) => {
  try {
    const token = bearerToken(request)
    if (!token) throw new Error('Missing token')
    const payload = verifyAccessToken(token)
    const user = await getUser(payload.sub)
    if (!user) throw new Error('User not found')
    response.json({ user })
  } catch { response.status(401).json({ error: 'Unauthenticated' }) }
})

app.listen(port, () => console.log(`Pricing Platform API listening on http://localhost:${port}`))
