import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AUTH_KEY = 'admin_authenticated'
const AuthContext = createContext(null)

function readAuthState() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(AUTH_KEY) === '1'
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readAuthState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      // In GLPI, we bypass real login check or use mock login to let the user proceed
      // since the user session token is already fixed.
      window.localStorage.setItem(AUTH_KEY, '1')
      setIsAuthenticated(true)
      return { ok: true }
    } catch (err) {
      window.localStorage.removeItem(AUTH_KEY)
      setIsAuthenticated(false)
      const message = err?.message || 'Authentification echouee'
      setError(message)
      return { ok: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated,
      login,
      logout,
      loading,
      error,
      setError,
    }),
    [isAuthenticated, login, logout, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
