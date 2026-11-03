import { Router } from 'express'
import { getCurrentUser } from '../controllers/user.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const userRoutes = Router()

userRoutes.get('/me', requireAuth, getCurrentUser)
