import { Router } from 'express'
import { getUser } from '../lib/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

export const userRoutes = Router()

userRoutes.get('/me', async (request, response) => {
  const user = await getUser((request as AuthenticatedRequest).userId as string)
  response.json({ user })
})
