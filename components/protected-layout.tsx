'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AppShell } from '@/components/app-shell'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user === null) {
      // Only redirect after the auth state has been initialised (avoids flash on load)
      const t = setTimeout(() => {
        if (!sessionStorage.getItem('sfg20_user')) router.replace('/')
      }, 50)
      return () => clearTimeout(t)
    }
  }, [user, router])

  if (!user) return null

  return <AppShell>{children}</AppShell>
}
