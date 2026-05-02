import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { processSyncQueue } from '../db/localDatabase'
import api from '../services/api'

export interface AuthUser {
  id: number
  badge_number: string
  war_name: string
  rank: string
  role: 'agent' | 'inspector' | 'dispatcher' | 'commander'
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  loading: boolean
  login: (badge_number: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('access_token'),
  )
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }, [])

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setUser(res.data)
        setAccessToken(token)
      })
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  // Sync offline queue when online + authenticated
  useEffect(() => {
    if (!accessToken) return
    const sync = () => processSyncQueue(accessToken)
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [accessToken])

  const login = useCallback(async (badge_number: string, password: string) => {
    const res = await api.post('/auth/login', { badge_number, password })
    const { access_token, refresh_token, user: u } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setAccessToken(access_token)
    setUser(u)
  }, [])

  const isAdmin = user?.role === 'commander' || user?.role === 'inspector' || user?.role === 'dispatcher'

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
