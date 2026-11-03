import type { NextFunction, Request, Response } from 'express'
import { getUser, verifyAccessToken } from '../lib/auth.js'

export type AuthenticatedRequest = Request & {
  userId?: string
}

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    response.status(401).json({ error: 'Unauthenticated' })
    return
  }

  try {
    const payload = verifyAccessToken(token)
    const user = await getUser(payload.sub)
    if (!user) throw new Error('User not found')
    request.userId = user.id
    next()
  } catch {
    response.status(401).json({ error: 'Unauthenticated' })
  }
}
