'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoginPage from '@/components/login-page'

export default function RootPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && user) router.replace('/dashboard')
  }, [hydrated, user, router])

  if (!hydrated) return null
  if (user) return null
  return <LoginPage />
}
