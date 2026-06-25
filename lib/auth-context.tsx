'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from './types'

const DEMO_USERS: User[] = [
  { id: 'u1', name: 'Abraham Ayegba', email: 'abraham@virtualfs.co.uk', role: 'admin', initials: 'AA' },
  { id: 'u2', name: 'Grant Currie', email: 'grant@virtualfs.co.uk', role: 'admin', initials: 'GC' },
]

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const s = sessionStorage.getItem('vfs_user')
    if (s) setUser(JSON.parse(s))
  }, [])

  async function login(email: string, password: string) {
    const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!found) return { error: 'No account found with that email.' }
    if (password !== 'password') return { error: 'Incorrect password.' }
    sessionStorage.setItem('vfs_user', JSON.stringify(found))
    setUser(found)
    return {}
  }

  function logout() {
    sessionStorage.removeItem('vfs_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
