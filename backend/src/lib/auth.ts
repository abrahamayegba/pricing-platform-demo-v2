import bcrypt from 'bcryptjs'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { prisma } from './prisma.js'

const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'replace-access-secret'
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'replace-refresh-secret'
const accessTtl = '15m'
const refreshTtlDays = 30

type TokenPayload = JwtPayload & { sub: string; type: 'access' | 'refresh' }

function signToken(userId: string, type: TokenPayload['type']) {
  return jwt.sign({ sub: userId, type }, type === 'access' ? accessSecret : refreshSecret, {
    expiresIn: type === 'access' ? accessTtl : `${refreshTtlDays}d`,
  })
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, accessSecret) as TokenPayload
  if (payload.type !== 'access' || !payload.sub) throw new Error('Invalid access token')
  return payload
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('Unable to create account')

  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash: await bcrypt.hash(input.password, 12) },
  })
  return createTokenPair(user.id)
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error('Invalid credentials')
  return createTokenPair(user.id)
}

export async function createTokenPair(userId: string) {
  const refreshToken = signToken(userId, 'refresh')
  await prisma.refreshToken.create({
    data: {
      tokenHash: await bcrypt.hash(refreshToken, 10),
      userId,
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    },
  })
  return { accessToken: signToken(userId, 'access'), refreshToken }
}

export async function rotateRefreshToken(token: string) {
  const payload = jwt.verify(token, refreshSecret) as TokenPayload
  if (payload.type !== 'refresh' || !payload.sub) throw new Error('Invalid refresh token')
  const candidates = await prisma.refreshToken.findMany({ where: { userId: payload.sub, revokedAt: null } })
  const stored = await Promise.any(candidates.map(async (candidate) => (await bcrypt.compare(token, candidate.tokenHash)) ? candidate : Promise.reject()))
  if (stored.expiresAt <= new Date()) throw new Error('Refresh token expired')
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
  return createTokenPair(payload.sub)
}

export async function revokeRefreshToken(token: string) {
  try {
    const payload = jwt.verify(token, refreshSecret) as TokenPayload
    const candidates = await prisma.refreshToken.findMany({ where: { userId: payload.sub, revokedAt: null } })
    for (const candidate of candidates) if (await bcrypt.compare(token, candidate.tokenHash)) {
      await prisma.refreshToken.update({ where: { id: candidate.id }, data: { revokedAt: new Date() } })
      break
    }
  } catch {
    // Logout is idempotent and does not reveal token validity.
  }
}

export async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } })
}

export { randomUUID }
