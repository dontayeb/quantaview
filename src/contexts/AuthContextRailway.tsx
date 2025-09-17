'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<{ error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for Railway demo
const MOCK_USER: User = {
  id: '5190d7da-2172-42d2-bb85-a9056b4a6527',
  email: 'demo@quantaview.com',
  full_name: 'Demo User'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Auto-login with mock user for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setUser(MOCK_USER)
      setLoading(false)
    }, 1000) // Simulate loading time

    return () => clearTimeout(timer)
  }, [])

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Mock signup - just set user
    setUser({
      id: '5190d7da-2172-42d2-bb85-a9056b4a6527',
      email,
      full_name: fullName
    })
    return {}
  }

  const signIn = async (email: string, password: string) => {
    // Mock login - just set user
    setUser(MOCK_USER)
    return {}
  }

  const signOut = async () => {
    setUser(null)
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