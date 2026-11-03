import { prisma } from './prisma.js'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:4000'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    baseURL,
    ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})
