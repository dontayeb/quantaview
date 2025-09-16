'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        // Stay on home page for non-authenticated users
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center pt-16 pb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">QuantaView</h1>
          <p className="text-xl text-gray-600 mb-8">
            Multi-Account Trading Dashboard
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Analyze your trading performance across multiple accounts with advanced metrics, 
            filtering, and real-time updates. Import your MT5 history and gain insights into your trading strategy.
          </p>
        </header>

        {/* Features */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Account Support</h3>
              <p className="text-gray-600">
                Manage multiple trading accounts in one dashboard with user-specific data isolation.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💹</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Track win rates, profit/loss ratios, and performance metrics with interactive charts.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Import</h3>
              <p className="text-gray-600">
                Import your MT5 trading history with our smart XLSX parser that handles any format.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Start Analyzing Your Trades Today
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sign In
              </Link>
            </div>
            
            <div className="mt-8 text-sm text-gray-500">
              Free to use • Secure • Multi-account support
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}