'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { quantaAPI } from '@/lib/api'

interface User {
  id: string
  email: string
  full_name?: string
  is_active?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<{ error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (token) {
          const currentUser = await quantaAPI.getCurrentUser()
          setUser(currentUser)
        }
      } catch (error) {
        // Token is invalid, remove it
        localStorage.removeItem('access_token')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await quantaAPI.register(email, password, fullName)
      localStorage.setItem('access_token', response.access_token)
      setUser(response.user)
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Registration failed' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const response = await quantaAPI.login(email, password)
      localStorage.setItem('access_token', response.access_token)
      setUser(response.user)
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Login failed' }
    }
  }

  const signOut = async () => {
    try {
      await quantaAPI.logout()
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token')
      setUser(null)
    }
    return {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}