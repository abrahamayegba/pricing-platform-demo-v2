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

  // Keep the entry route useful while sessionStorage is being read. Returning null
  // here made the preview appear completely blank if hydration was delayed.
  if (!hydrated) return <LoginPage />
  if (user) return null
  return <LoginPage />
}
