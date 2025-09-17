'use client'

import { useState, useEffect } from 'react'
import { quantaAPI, type Trade, type TradingAccount } from '@/lib/api'
import { applyFilters, type TradeFilters } from '@/components/TradeFilters'
import { useAuth } from '@/contexts/AuthContextRailway'

export function useTrades(tradingAccountId?: string) {
  const { user } = useAuth()
  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Safety mechanism to prevent loading state from getting stuck
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading state was stuck, forcing it to false')
        setLoading(false)
      }, 10000) // 10 second timeout

      return () => clearTimeout(timeout)
    }
  }, [loading])

  const [filters, setFilters] = useState<TradeFilters>({
    dateRange: { start: '', end: '' },
    symbols: [],
    profitRange: { min: '', max: '' },
    tradeTypes: []
  })

  // Load trading accounts
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        setError(null)
        
        const accounts = await quantaAPI.getTradingAccounts(user.id)
        setTradingAccounts(accounts)
        
        // Select account if specified or use first account
        if (tradingAccountId) {
          const account = accounts.find(acc => acc.id === tradingAccountId)
          setSelectedAccount(account || null)
        } else if (accounts.length > 0) {
          setSelectedAccount(accounts[0])
        }
      } catch (err) {
        console.error('Failed to load trading accounts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load accounts')
        setTradingAccounts([])
      } finally {
        setLoading(false)
      }
    }

    loadAccounts()
  }, [user, tradingAccountId])

  // Load trades for selected account
  useEffect(() => {
    const loadTrades = async () => {
      if (!selectedAccount) {
        setAllTrades([])
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const trades = await quantaAPI.getTrades(selectedAccount.id)
        setAllTrades(trades)
      } catch (err) {
        console.error('Failed to load trades:', err)
        setError(err instanceof Error ? err.message : 'Failed to load trades')
        setAllTrades([])
      } finally {
        setLoading(false)
      }
    }

    loadTrades()
  }, [selectedAccount])

  // Apply filters to trades
  const trades = applyFilters(allTrades, filters)

  // Calculate metrics
  const metrics = {
    totalTrades: trades.length,
    buyTrades: trades.filter(t => t.type === 'buy').length,
    sellTrades: trades.filter(t => t.type === 'sell').length,
    totalProfit: trades.reduce((sum, t) => sum + t.profit, 0),
    totalCommission: trades.reduce((sum, t) => sum + t.commission, 0),
    totalSwap: trades.reduce((sum, t) => sum + t.swap, 0),
    winningTrades: trades.filter(t => t.profit > 0).length,
    losingTrades: trades.filter(t => t.profit < 0).length,
    winRate: trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0,
    profitFactor: (() => {
      const grossProfit = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
      const grossLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
      return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
    })(),
    closedTrades: trades.filter(t => t.close_time).length,
    averageProfit: trades.length > 0 ? trades.reduce((sum, t) => sum + t.profit, 0) / trades.length : 0,
    largestWin: trades.length > 0 ? Math.max(...trades.map(t => t.profit)) : 0,
    largestLoss: trades.length > 0 ? Math.min(...trades.map(t => t.profit)) : 0,
    averageRRR: 0, // Simplified for now
    tradesPerDay: 0, // Simplified for now
    tradesPerWeek: 0, // Simplified for now
    tradesPerMonth: 0, // Simplified for now
    maxDrawdown: 0, // Simplified for now
    maxDrawdownPercent: 0, // Simplified for now
    currentDrawdown: 0, // Simplified for now
    currentDrawdownPercent: 0, // Simplified for now
    recoveryFactor: 0, // Simplified for now
    totalBalance: selectedAccount ? selectedAccount.starting_balance + trades.reduce((sum, t) => sum + t.profit, 0) : 0
  }

  const selectAccount = (account: TradingAccount) => {
    setSelectedAccount(account)
  }

  const refetch = async () => {
    // Reload accounts and trades
    if (selectedAccount && user) {
      try {
        setLoading(true)
        const [accounts, trades] = await Promise.all([
          quantaAPI.getTradingAccounts(user.id),
          quantaAPI.getTrades(selectedAccount.id)
        ])
        setTradingAccounts(accounts)
        setAllTrades(trades)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refetch data')
      } finally {
        setLoading(false)
      }
    }
  }

  return {
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
  }
}