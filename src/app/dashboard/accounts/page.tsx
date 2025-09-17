'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContextRailway'
import { AccountManager } from '@/components/AccountManager'
import { useTrades } from '@/hooks/useTrades'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ManageAccountsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { 
    tradingAccounts, 
    selectedAccount, 
    loading, 
    selectAccount,
    refetch
  } = useTrades()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Trading Accounts</h1>
              <p className="mt-1 text-sm text-gray-600">
                Edit, delete, and manage your trading accounts
              </p>
            </div>
            <Link
              href="/dashboard/accounts/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Account
            </Link>
          </div>
        </div>

        {/* Account Management Component */}
        <AccountManager
          accounts={tradingAccounts}
          selectedAccount={selectedAccount}
          onSelect={selectAccount}
          onAccountsChange={refetch}
          loading={loading}
        />

        {tradingAccounts.length > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Account Management Tips:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Each account number can only be added once per user</li>
              <li>• Deleting an account will also delete all associated trading data</li>
              <li>• Use meaningful account names to easily identify your accounts</li>
              <li>• Click on an account to select it for viewing in the dashboard</li>
              <li>• Use the edit button to modify account details inline</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}