import type { Response } from 'express'
import { getUser } from '../lib/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

export async function getCurrentUser(request: AuthenticatedRequest, response: Response) {
  const user = await getUser(request.userId)
  response.json({ user })
}
