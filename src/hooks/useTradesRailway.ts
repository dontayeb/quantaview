'use client'

import { useState, useEffect } from 'react'
import { quantaAPI, type Trade, type TradingAccount } from '@/lib/api'
import { applyFilters, type TradeFilters } from '@/components/TradeFilters'

// Mock user for now - in real app this would come from auth
const MOCK_USER_ID = '5190d7da-2172-42d2-bb85-a9056b4a6527'

export function useTrades(tradingAccountId?: string) {
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
      try {
        setLoading(true)
        setError(null)
        
        const accounts = await quantaAPI.getTradingAccounts(MOCK_USER_ID)
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
  }, [tradingAccountId])

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
    winningTrades: trades.filter(t => t.profit > 0).length,
    losingTrades: trades.filter(t => t.profit < 0).length,
    totalProfit: trades.reduce((sum, t) => sum + t.profit, 0),
    totalCommission: trades.reduce((sum, t) => sum + t.commission, 0),
    totalSwap: trades.reduce((sum, t) => sum + t.swap, 0),
    winRate: trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0,
    averageWin: (() => {
      const winningTrades = trades.filter(t => t.profit > 0)
      return winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length : 0
    })(),
    averageLoss: (() => {
      const losingTrades = trades.filter(t => t.profit < 0)
      return losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length : 0
    })(),
    largestWin: trades.length > 0 ? Math.max(...trades.map(t => t.profit)) : 0,
    largestLoss: trades.length > 0 ? Math.min(...trades.map(t => t.profit)) : 0,
  }

  const selectAccount = (account: TradingAccount) => {
    setSelectedAccount(account)
  }

  const refetch = async () => {
    // Reload accounts and trades
    if (selectedAccount) {
      try {
        setLoading(true)
        const [accounts, trades] = await Promise.all([
          quantaAPI.getTradingAccounts(MOCK_USER_ID),
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