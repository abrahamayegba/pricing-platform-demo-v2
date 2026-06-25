'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user && !sessionStorage.getItem('vfs_user')) {
      router.replace('/')
    }
  }, [hydrated, user, router])

  if (!hydrated || !user) return null

  return <AppShell>{children}</AppShell>
}
