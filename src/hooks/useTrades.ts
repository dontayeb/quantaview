'use client'

import { useState, useEffect } from 'react'
import { quantaAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContextRailway'
import type { Trade, TradingAccount } from '@/lib/supabase'
import { applyFilters, type TradeFilters } from '@/components/TradeFilters'

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
    sessions: []
  })

  // Apply filters to get filtered trades
  const trades = applyFilters(allTrades, filters)

  const fetchTradingAccounts = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('account_name', { ascending: true })

      if (error) throw error
      setTradingAccounts(data || [])
      
      // Check if currently selected account still exists
      if (selectedAccount && data) {
        const stillExists = data.find(acc => acc.id === selectedAccount.id)
        if (!stillExists) {
          // Selected account was deleted, select first available account
          if (data.length > 0) {
            setSelectedAccount(data[0])
          } else {
            setSelectedAccount(null)
          }
        }
      }
      
      // Handle account selection priority:
      // 1. URL parameter (tradingAccountId)
      // 2. Restore last selected account from localStorage
      // 3. No automatic selection
      if (tradingAccountId && data) {
        const account = data.find(acc => acc.id === tradingAccountId)
        if (account) setSelectedAccount(account)
      } else if (!selectedAccount && data && data.length > 0 && typeof window !== 'undefined') {
        // Try to restore last selected account
        const lastSelectedId = localStorage.getItem('quantaview-selected-account')
        if (lastSelectedId) {
          const lastAccount = data.find(acc => acc.id === lastSelectedId)
          if (lastAccount) {
            setSelectedAccount(lastAccount)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trading accounts')
      console.error('Error fetching trading accounts:', err)
    }
  }

  const fetchTrades = async (accountId?: string, isRealTimeUpdate = false) => {
    if (!accountId && !selectedAccount) return

    try {
      // Only show loading for initial fetches, not real-time updates
      if (!isRealTimeUpdate) {
        setLoading(true)
      }
      setError(null)
      const targetAccountId = accountId || selectedAccount?.id
      
      console.log(`Fetching trades for account: ${targetAccountId}`)
      
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('trading_account_id', targetAccountId)
        .order('open_time', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log(`Fetched ${data?.length || 0} trades`)
      setAllTrades(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
      console.error('Error fetching trades:', err)
      // Don't clear trades on error, keep showing existing data
    } finally {
      // Always set loading to false, regardless of real-time update flag
      setLoading(false)
    }
  }

  const selectAccount = (account: TradingAccount) => {
    setSelectedAccount(account)
    // Remember the selected account
    if (typeof window !== 'undefined') {
      localStorage.setItem('quantaview-selected-account', account.id)
    }
    // fetchTrades already handles loading state internally
    fetchTrades(account.id)
  }

  const refetch = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchTradingAccounts(),
        selectedAccount ? fetchTrades(selectedAccount.id, true) : Promise.resolve()
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        await fetchTradingAccounts()
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user, tradingAccountId])

  useEffect(() => {
    if (selectedAccount) {
      // fetchTrades already handles loading state internally
      fetchTrades(selectedAccount.id)
    }
  }, [selectedAccount])

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !selectedAccount) return

    let isMounted = true
    const selectedAccountId = selectedAccount.id
    const userId = user.id

    console.log(`Setting up subscriptions for account: ${selectedAccountId}`)

    // Use unique channel names with timestamp to prevent conflicts
    const timestamp = Date.now()
    const tradesChannelName = `trades-${selectedAccountId}-${timestamp}`
    const accountsChannelName = `accounts-${userId}-${timestamp}`

    const tradesChannel = supabase
      .channel(tradesChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        (payload) => {
          if (!isMounted) return
          
          console.log('Trades change detected:', payload.eventType)
          const newRecord = payload.new as any
          const oldRecord = payload.old as any
          
          if (newRecord?.trading_account_id === selectedAccountId || 
              oldRecord?.trading_account_id === selectedAccountId) {
            console.log('Refetching trades due to subscription update')
            fetchTrades(selectedAccountId, true)
          }
        }
      )
      .subscribe((status) => {
        console.log(`Trades subscription status: ${status}`)
        // Don't let subscription errors affect loading state
        if (status === 'CHANNEL_ERROR') {
          console.warn('Trades subscription error - continuing without real-time updates')
        }
      })

    const accountsChannel = supabase
      .channel(accountsChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_accounts' },
        () => {
          if (!isMounted) return
          console.log('Trading accounts change detected')
          fetchTradingAccounts()
        }
      )
      .subscribe((status) => {
        console.log(`Accounts subscription status: ${status}`)
        // Don't let subscription errors affect loading state
        if (status === 'CHANNEL_ERROR') {
          console.warn('Accounts subscription error - continuing without real-time updates')
        }
      })

    return () => {
      console.log(`Cleaning up subscriptions for account: ${selectedAccountId}`)
      isMounted = false
      
      // Immediate cleanup
      tradesChannel.unsubscribe()
      accountsChannel.unsubscribe()
      
      // Additional cleanup with slight delay
      setTimeout(() => {
        supabase.removeChannel(tradesChannel)
        supabase.removeChannel(accountsChannel)
      }, 50)
    }
  }, [selectedAccount?.id, user?.id])

  // Handle window focus and visibility changes to ensure data is current when switching back to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedAccount && !loading) {
        // Force loading state to false when tab becomes visible (safety net)
        if (loading) {
          setLoading(false)
        }
        
        // Refresh data if older than 30 seconds
        const thirtySecondsAgo = Date.now() - 30000
        const lastUpdate = localStorage.getItem(`quantaview-last-update-${selectedAccount.id}`)
        
        if (!lastUpdate || parseInt(lastUpdate) < thirtySecondsAgo) {
          fetchTrades(selectedAccount.id, true) // Use true to avoid showing loading spinner
          localStorage.setItem(`quantaview-last-update-${selectedAccount.id}`, Date.now().toString())
        }
      }
    }

    const handleFocus = () => {
      // Force loading state to false when window regains focus (safety net)
      if (loading) {
        console.log('Forcing loading to false on window focus')
        setLoading(false)
      }
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [selectedAccount, loading])

  // Computed metrics
  const metrics = {
    totalTrades: trades.length,
    buyTrades: trades.filter(t => t.type === 'buy').length,
    sellTrades: trades.filter(t => t.type === 'sell').length,
    totalProfit: (() => {
      const filteredTrades = trades.filter(trade => trade.close_time || trade.open_time)
      return filteredTrades.reduce((sum, trade) => {
        const profit = trade.profit || 0
        const commission = trade.commission || 0
        const swap = trade.swap || 0
        return sum + profit + commission + swap
      }, 0)
    })(),
    totalCommission: trades.reduce((sum, trade) => sum + trade.commission, 0),
    totalSwap: trades.reduce((sum, trade) => sum + trade.swap, 0),
    winningTrades: trades.filter(t => t.profit > 0).length,
    losingTrades: trades.filter(t => t.profit < 0).length,
    winRate: trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0,
    profitFactor: (() => {
      const grossProfit = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0)
      const grossLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
      return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
    })(),
    closedTrades: trades.filter(t => t.close_time).length,
    averageProfit: trades.length > 0 ? trades.reduce((sum, trade) => sum + trade.profit, 0) / trades.length : 0,
    largestWin: trades.length > 0 ? Math.max(...trades.map(t => t.profit)) : 0,
    largestLoss: trades.length > 0 ? Math.min(...trades.map(t => t.profit)) : 0,
    averageRRR: (() => {
      const tradesWithSL = trades.filter(t => t.stop_loss && t.open_price && t.close_price)
      if (tradesWithSL.length === 0) return 0
      
      const rrrSum = tradesWithSL.reduce((sum, trade) => {
        // Risk: Distance from entry to stop loss (in price points)
        const riskDistance = Math.abs(trade.open_price - trade.stop_loss!)
        
        // Actual reward: Distance from entry to actual close (in price points)  
        const actualRewardDistance = Math.abs(trade.close_price! - trade.open_price)
        
        // Calculate actual RRR
        const rrr = riskDistance > 0 ? actualRewardDistance / riskDistance : 0
        return sum + rrr
      }, 0)
      
      return rrrSum / tradesWithSL.length
    })(),
    tradesPerDay: (() => {
      if (trades.length === 0) return 0
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      const firstDate = new Date(sortedTrades[0].close_time || sortedTrades[0].open_time)
      const lastDate = new Date(sortedTrades[sortedTrades.length - 1].close_time || sortedTrades[sortedTrades.length - 1].open_time)
      const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)))
      
      return trades.length / daysDiff
    })(),
    tradesPerWeek: (() => {
      if (trades.length === 0) return 0
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      const firstDate = new Date(sortedTrades[0].close_time || sortedTrades[0].open_time)
      const lastDate = new Date(sortedTrades[sortedTrades.length - 1].close_time || sortedTrades[sortedTrades.length - 1].open_time)
      const weeksDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7)))
      
      return trades.length / weeksDiff
    })(),
    tradesPerMonth: (() => {
      if (trades.length === 0) return 0
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      const firstDate = new Date(sortedTrades[0].close_time || sortedTrades[0].open_time)
      const lastDate = new Date(sortedTrades[sortedTrades.length - 1].close_time || sortedTrades[sortedTrades.length - 1].open_time)
      const monthsDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))) // Average days per month
      
      return trades.length / monthsDiff
    })(),
    maxDrawdown: (() => {
      if (trades.length === 0) return 0
      
      // Sort trades by close time or open time
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      let runningBalance = selectedAccount?.starting_balance || 0
      let peak = runningBalance
      let maxDrawdown = 0
      
      for (const trade of sortedTrades) {
        runningBalance += trade.profit
        
        if (runningBalance > peak) {
          peak = runningBalance
        }
        
        const drawdown = peak - runningBalance
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      }
      
      return maxDrawdown
    })(),
    maxDrawdownPercent: (() => {
      if (trades.length === 0) return 0
      
      // Sort trades by close time or open time
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      let runningBalance = selectedAccount?.starting_balance || 0
      let peak = runningBalance
      let maxDrawdownPercent = 0
      
      for (const trade of sortedTrades) {
        runningBalance += trade.profit
        
        if (runningBalance > peak) {
          peak = runningBalance
        }
        
        if (peak > 0) {
          const drawdownPercent = ((peak - runningBalance) / peak) * 100
          if (drawdownPercent > maxDrawdownPercent) {
            maxDrawdownPercent = drawdownPercent
          }
        }
      }
      
      return maxDrawdownPercent
    })(),
    currentDrawdown: (() => {
      if (trades.length === 0) return 0
      
      // Sort trades by close time or open time
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      let runningBalance = selectedAccount?.starting_balance || 0
      let peak = runningBalance
      
      for (const trade of sortedTrades) {
        runningBalance += trade.profit
        
        if (runningBalance > peak) {
          peak = runningBalance
        }
      }
      
      return peak - runningBalance
    })(),
    currentDrawdownPercent: (() => {
      if (trades.length === 0) return 0
      
      // Sort trades by close time or open time
      const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })
      
      if (sortedTrades.length === 0) return 0
      
      let runningBalance = selectedAccount?.starting_balance || 0
      let peak = runningBalance
      
      for (const trade of sortedTrades) {
        runningBalance += trade.profit
        
        if (runningBalance > peak) {
          peak = runningBalance
        }
      }
      
      return peak > 0 ? ((peak - runningBalance) / peak) * 100 : 0
    })(),
    recoveryFactor: (() => {
      const netProfit = trades.reduce((sum, trade) => sum + trade.profit, 0)
      const maxDD = (() => {
        if (trades.length === 0) return 0
        
        const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
          const dateA = new Date(a.close_time || a.open_time).getTime()
          const dateB = new Date(b.close_time || b.open_time).getTime()
          return dateA - dateB
        })
        
        if (sortedTrades.length === 0) return 0
        
        let runningBalance = selectedAccount?.starting_balance || 0
        let peak = runningBalance
        let maxDrawdown = 0
        
        for (const trade of sortedTrades) {
          runningBalance += trade.profit
          
          if (runningBalance > peak) {
            peak = runningBalance
          }
          
          const drawdown = peak - runningBalance
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown
          }
        }
        
        return maxDrawdown
      })()
      
      return maxDD > 0 ? netProfit / maxDD : netProfit > 0 ? 999 : 0
    })(),
    totalBalance: (() => {
      const startingBalance = selectedAccount?.starting_balance || 0
      
      // Calculate what the balance would be starting with the original deposit
      // but only executing the filtered trades (when filters are applied)
      // This shows "what would happen to my deposit if I only traded these pairs/dates"
      const filteredTrades = trades.filter(trade => trade.close_time || trade.open_time)
      
      // Debug logging when filters are applied
      const hasActiveFilters = filters.symbols.length > 0 || 
                               filters.sessions.length > 0 || 
                               filters.dateRange.start || 
                               filters.dateRange.end
      
      // Debug logging removed
      
      const totalNetResult = filteredTrades.reduce((sum, trade) => {
        const profit = trade.profit || 0
        const commission = trade.commission || 0
        const swap = trade.swap || 0
        return sum + profit + commission + swap
      }, 0)
      
      // Debug logging removed
      
      return startingBalance + totalNetResult
    })()
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