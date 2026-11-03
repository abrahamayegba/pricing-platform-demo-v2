import type { Request, Response } from 'express'
import { loginUser, registerUser, revokeRefreshToken, rotateRefreshToken } from '../lib/auth.js'

export async function register(request: Request, response: Response) {
  const { name, email, password } = request.body ?? {}
  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    typeof email !== 'string' ||
    !email.includes('@') ||
    typeof password !== 'string' ||
    password.length < 8
  ) {
    response.status(400).json({ error: 'Name, valid email, and password of at least 8 characters are required' })
    return
  }

  try {
    response.status(201).json(await registerUser({ name, email, password }))
  } catch {
    response.status(400).json({ error: 'Unable to create account' })
  }
}

export async function login(request: Request, response: Response) {
  const { email, password } = request.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    response.status(400).json({ error: 'Email and password are required' })
    return
  }

  try {
    response.json(await loginUser(email, password))
  } catch {
    response.status(401).json({ error: 'Invalid credentials' })
  }
}

export async function refresh(request: Request, response: Response) {
  const { refreshToken } = request.body ?? {}
  if (typeof refreshToken !== 'string') {
    response.status(400).json({ error: 'Refresh token is required' })
    return
  }

  try {
    response.json(await rotateRefreshToken(refreshToken))
  } catch {
    response.status(401).json({ error: 'Invalid refresh token' })
  }
}

export async function logout(request: Request, response: Response) {
  if (typeof request.body?.refreshToken === 'string') await revokeRefreshToken(request.body.refreshToken)
  response.status(204).send()
}
