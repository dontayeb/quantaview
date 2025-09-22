'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContextRailway'
import { AccountSelector } from '@/components/AccountSelector'
import { TradesList } from '@/components/TradesList'
import { TradesMetrics } from '@/components/TradesMetrics'
import { TradingStats } from '@/components/TradingStats'
import { BalanceChart } from '@/components/BalanceChart'
import { PairReturns } from '@/components/PairReturns'
import { TradeFiltersComponent } from '@/components/TradeFilters'
import { useTrades } from '@/hooks/useTradesRailway'
import { UserNav } from '@/components/UserNav'
import { AIInsights } from '@/components/AIInsights'
import { ProfitabilityHeatmap } from '@/components/ProfitabilityHeatmap'
import { PlusIcon, Cog6ToothIcon, BoltIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { 
    trades, 
    allTrades,
    tradingAccounts, 
    selectedAccount, 
    loading, 
    error, 
    metrics,
    filters,
    setFilters,
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
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Error Loading Data</div>
          <div className="text-dashboard-textLight">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Navigation */}
      <nav className="bg-dashboard-card shadow-dashboard border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-dashboard-text">QuantaView</h1>
            </div>
            <div className="flex items-center">
              <UserNav />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header with Account Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-dashboard-text">Trading Dashboard</h2>
              <p className="text-dashboard-textLight mt-1">Monitor and analyze your trading performance</p>
            </div>
            
            <div className="flex items-center gap-4">
              {tradingAccounts.length > 0 && (
                <AccountSelector
                  accounts={tradingAccounts}
                  selectedAccount={selectedAccount}
                  onSelect={selectAccount}
                  loading={loading}
                />
              )}
              
              <Link
                href="/dashboard/accounts"
                className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg shadow-dashboard text-dashboard-textLight bg-dashboard-card hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap transition-all duration-200"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                Manage Accounts
              </Link>

              <Link
                href="/dashboard/ea-setup"
                className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg shadow-dashboard text-dashboard-textLight bg-dashboard-card hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap transition-all duration-200"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                EA Setup
              </Link>
              
              <Link
                href="/dashboard/accounts/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-dashboard text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Account
              </Link>
            </div>
          </div>

          {selectedAccount ? (
            <>
              {/* Filters */}
              <TradeFiltersComponent 
                trades={allTrades}
                filters={filters}
                onFiltersChange={setFilters}
                loading={loading}
              />

              {/* Balance Chart */}
              <BalanceChart 
                trades={trades} 
                loading={loading}
                currency={selectedAccount.currency}
                initialBalance={selectedAccount.starting_balance}
              />

              {/* Full Width Layout */}
              <div className="space-y-6">
                {/* Metrics */}
                <TradesMetrics metrics={metrics} loading={loading} />

                {/* Main Dashboard Grid - 2 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Everything except AI */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Trading Charts - Side by Side */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <TradingStats trades={trades} metrics={metrics} loading={loading} />
                      <PairReturns trades={trades} loading={loading} currency={selectedAccount.currency} />
                    </div>
                    
                    {/* Heatmaps - Stacked Vertically */}
                    <div className="space-y-6">
                      <ProfitabilityHeatmap accountId={selectedAccount.id} type="hourly" loading={loading} />
                      <ProfitabilityHeatmap accountId={selectedAccount.id} type="daily" loading={loading} />
                    </div>
                  </div>

                  {/* Right Column - AI Insights */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-6">
                      <AIInsights accountId={selectedAccount.id} loading={loading} />
                    </div>
                  </div>
                </div>

                {/* Trades List - Full Width */}
                <TradesList trades={trades} loading={loading} />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="text-gray-400 text-xl mb-4">No Trading Accounts Found</div>
              <div className="text-gray-600 mb-6">
                Add your first trading account to get started with the dashboard
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 max-w-md mx-auto shadow-dashboard">
                <p className="text-primary-700 font-medium mb-4">Get Started:</p>
                <div className="space-y-2 text-primary-600 text-sm text-left">
                  <p>1. Click "Add Account" above</p>
                  <p>2. Enter your trading account details</p>
                  <p>3. Import your trading history (XLSX)</p>
                  <p>4. View your performance dashboard!</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard/accounts/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-dashboard text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Your First Account
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}