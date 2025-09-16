'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function NewAccountPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Debug function to test auth context
  const testAuth = () => {
    console.log('Current user:', user)
    console.log('User ID:', user?.id)
    console.log('User email:', user?.email)
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    password: '',
    server: '',
    broker: '',
    currency: 'USD',
    account_type: 'demo',
    starting_balance: '10000'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    // Client-side validation
    const accountNum = parseInt(formData.account_number)
    if (!formData.account_name.trim()) {
      setError('Account name is required')
      setLoading(false)
      return
    }
    if (isNaN(accountNum) || accountNum <= 0) {
      setError('Please enter a valid account number')
      setLoading(false)
      return
    }
    const startingBalance = parseFloat(formData.starting_balance)
    if (isNaN(startingBalance) || startingBalance <= 0) {
      setError('Please enter a valid starting balance')
      setLoading(false)
      return
    }
    if (!formData.password.trim()) {
      setError('Account password is required')
      setLoading(false)
      return
    }
    if (!formData.server.trim()) {
      setError('Server is required')
      setLoading(false)
      return
    }

    try {
      console.log('🔍 Step 1: Checking for existing account...', {
        user_id: user.id,
        account_number: accountNum
      })

      // Step 1: Check if account already exists
      const { data: existingAccount, error: checkError } = await supabase
        .from('trading_accounts')
        .select('id, account_name, account_number')
        .eq('user_id', user.id)
        .eq('account_number', accountNum)
        .maybeSingle()

      if (checkError) {
        console.error('❌ Error checking existing account:', checkError)
        if (checkError.code === '42P01') {
          setError('Database tables not set up. Please run the database schema first.')
          return
        }
        throw checkError
      }

      if (existingAccount) {
        console.log('❌ Account already exists:', existingAccount)
        setError(`Account #${accountNum} already exists (${existingAccount.account_name}). Each account number can only be added once.`)
        return
      }

      console.log('✅ Account number is available')
      console.log('🔍 Step 2: Inserting new account...')

      // Step 2: Insert new account with timeout protection
      const insertPromise = supabase
        .from('trading_accounts')
        .insert({
          user_id: user.id,
          account_number: accountNum,
          account_name: formData.account_name.trim(),
          password: formData.password,
          server: formData.server.trim(),
          broker: formData.broker?.trim() || null,
          currency: formData.currency,
          account_type: formData.account_type,
          starting_balance: startingBalance,
          is_active: true
        })
        .select()
        .single()

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - operation took too long (10s)')), 10000)
      )

      const result = await Promise.race([insertPromise, timeoutPromise])
      const { data, error } = result
      console.log('✅ Supabase insert response:', { data, error })

      if (error) {
        console.error('❌ Insert error:', error)
        
        // Handle specific error codes
        switch (error.code) {
          case '23505':
            if (error.message.includes('account_number')) {
              setError('This account number is already registered. Please use a different account number.')
            } else {
              setError('This account already exists with these details.')
            }
            break
          case '23503':
            setError('Invalid user session. Please logout and login again.')
            break
          case '42P01':
            setError('Database tables not set up properly. Please contact support.')
            break
          case '23514':
            setError('Invalid account data. Please check all fields are filled correctly.')
            break
          default:
            setError(`Database error (${error.code}): ${error.message}`)
        }
      } else if (data) {
        console.log('🎉 Account created successfully:', data)
        router.push('/dashboard?success=account_added')
      } else {
        setError('Account was created but no data returned. Please refresh the page.')
      }

    } catch (err) {
      console.error('❌ Unexpected error:', err)
      
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          setError('The request took too long to complete. Please check your internet connection and try again.')
        } else if (err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection.')
        } else {
          setError(`Error: ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
      console.log('🏁 Account creation process completed')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-lg font-medium text-gray-900">Add Trading Account</h1>
            <p className="mt-1 text-sm text-gray-600">
              Add a new trading account to import and track your trades
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="account_name" className="block text-sm font-medium text-gray-700">
                Account Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="account_name"
                  id="account_name"
                  required
                  value={formData.account_name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., My FTMO Account"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">A friendly name for this account</p>
            </div>

            <div>
              <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
                Account Number *
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="account_number"
                  id="account_number"
                  required
                  value={formData.account_number}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., 520313495"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Account Password *
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Account password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="server" className="block text-sm font-medium text-gray-700">
                Server *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="server"
                  id="server"
                  required
                  value={formData.server}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., FTMO-Server2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="broker" className="block text-sm font-medium text-gray-700">
                Broker
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="broker"
                  id="broker"
                  value={formData.broker}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., FTMO Global Markets Ltd"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency *
                </label>
                <div className="mt-1">
                  <select
                    name="currency"
                    id="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">
                  Account Type *
                </label>
                <div className="mt-1">
                  <select
                    name="account_type"
                    id="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="demo">Demo</option>
                    <option value="live">Live</option>
                    <option value="challenge">Challenge</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="starting_balance" className="block text-sm font-medium text-gray-700">
                Starting Balance *
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="starting_balance"
                  id="starting_balance"
                  required
                  min="0"
                  step="0.01"
                  value={formData.starting_balance}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., 10000"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">The account balance when you started trading (for chart calculations)</p>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Next Steps:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Add your trading account details above</li>
            <li>2. Export your trading history as XLSX from MT5</li>
            <li>3. Use the updated importer to import your deals</li>
            <li>4. View your performance on the dashboard!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}