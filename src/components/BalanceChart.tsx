'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format } from 'date-fns'
import type { Trade } from '@/lib/supabase'

interface BalanceChartProps {
  trades: Trade[]
  initialBalance?: number
  loading?: boolean
  currency?: string
}

interface BalancePoint {
  date: string
  timestamp: number
  balance: number
  dailyProfit: number
  dailyTrades: number
  cumulative: number
  tradeCount: number
}

export function BalanceChart({ 
  trades, 
  initialBalance = 10000, 
  loading = false,
  currency = 'USD' 
}: BalanceChartProps) {
  
  const balanceData = useMemo(() => {
    if (!trades.length) return []

    // Use the provided initial balance (from account settings)
    const calculatedInitialBalance = initialBalance

    // Sort trades by close time, then open time
    const sortedTrades = [...trades]
      .filter(trade => trade.close_time || trade.open_time)
      .sort((a, b) => {
        const dateA = new Date(a.close_time || a.open_time).getTime()
        const dateB = new Date(b.close_time || b.open_time).getTime()
        return dateA - dateB
      })

    // Group trades by day
    const tradesByDay = new Map<string, Trade[]>()
    
    sortedTrades.forEach(trade => {
      const tradeDate = new Date(trade.close_time || trade.open_time)
      const dayKey = format(tradeDate, 'yyyy-MM-dd')
      
      if (!tradesByDay.has(dayKey)) {
        tradesByDay.set(dayKey, [])
      }
      tradesByDay.get(dayKey)!.push(trade)
    })

    // Convert to array and sort by date
    const dailyTradeEntries = Array.from(tradesByDay.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())

    const points: BalancePoint[] = []
    let runningBalance = calculatedInitialBalance
    let totalTradeCount = 0
    
    // Add starting point (day before first trade)
    if (dailyTradeEntries.length > 0) {
      const firstDay = new Date(dailyTradeEntries[0][0])
      const dayBefore = new Date(firstDay)
      dayBefore.setDate(dayBefore.getDate() - 1)
      
      points.push({
        date: format(dayBefore, 'MMM dd'),
        timestamp: dayBefore.getTime(),
        balance: calculatedInitialBalance,
        dailyProfit: 0,
        dailyTrades: 0,
        cumulative: 0,
        tradeCount: 0
      })
    }

    // Calculate daily balance progression
    dailyTradeEntries.forEach(([dayKey, dayTrades]) => {
      const dayDate = new Date(dayKey)
      let dailyNetResult = 0
      
      // Calculate total daily result
      dayTrades.forEach(trade => {
        const profit = trade.profit || 0
        const commission = trade.commission || 0
        const swap = trade.swap || 0
        const netResult = profit + commission + swap
        dailyNetResult += netResult
      })
      
      runningBalance += dailyNetResult
      totalTradeCount += dayTrades.length
      
      const dailyProfit = dayTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
      
      points.push({
        date: format(dayDate, 'MMM dd'),
        timestamp: dayDate.getTime(),
        balance: runningBalance,
        dailyProfit: dailyProfit,
        dailyTrades: dayTrades.length,
        cumulative: dailyProfit,
        tradeCount: totalTradeCount
      })
    })

    return points
  }, [trades, initialBalance])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatTooltip = (value: any, name: string, props: any) => {
    if (name === 'balance') {
      const point = props.payload
      return [
        <div key="tooltip" className="space-y-1">
          <div className="font-semibold">{formatCurrency(value)}</div>
          <div className="text-xs text-gray-600">
            {point.dailyTrades} trades on this day
          </div>
          <div className="text-xs text-gray-600">
            Daily P&L: {formatCurrency(point.dailyProfit)}
          </div>
        </div>,
        'Daily Balance'
      ]
    }
    return [formatCurrency(value), name]
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (!balanceData.length && !loading) {
    console.warn('BalanceChart: No data but not loading. Trades count:', trades.length)
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Progression</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          {trades.length > 0 ? 'Processing trade data...' : 'No trading data available'}
        </div>
      </div>
    )
  }

  const currentBalance = balanceData[balanceData.length - 1]?.balance || initialBalance
  const totalReturn = currentBalance - initialBalance
  const returnPercentage = ((totalReturn / initialBalance) * 100)
  const isProfit = totalReturn >= 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Balance Progression</h3>
          <div className="flex items-center space-x-4 mt-2">
            <div className="text-sm text-gray-600">
              Current Balance: <span className="font-medium text-gray-900">{formatCurrency(currentBalance)}</span>
            </div>
            <div className="text-sm text-gray-600">
              Total Return: <span className={`font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{formatCurrency(totalReturn)} ({returnPercentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(currentBalance)}
          </div>
          <div className="text-sm text-gray-500">
            {balanceData.length - 1} trades
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={balanceData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={isProfit ? "#10b981" : "#ef4444"} 
                  stopOpacity={0.3}
                />
                <stop 
                  offset="95%" 
                  stopColor={isProfit ? "#10b981" : "#ef4444"} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{label}</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-600">End of Day Balance:</span>{' '}
                          <span className="font-medium">{formatCurrency(data.balance)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Trades This Day:</span>{' '}
                          <span className="font-medium">{data.dailyTrades}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Total Trades:</span>{' '}
                          <span className="font-medium">{data.tradeCount}</span>
                        </p>
                        {data.dailyProfit !== 0 && (
                          <p className="text-sm">
                            <span className="text-gray-600">Daily P&L:</span>{' '}
                            <span className={`font-medium ${data.dailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.dailyProfit >= 0 ? '+' : ''}{formatCurrency(data.dailyProfit)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isProfit ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#balanceGradient)"
              dot={{ r: 2, fill: isProfit ? "#10b981" : "#ef4444" }}
              activeDot={{ r: 4, fill: isProfit ? "#10b981" : "#ef4444" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t pt-4">
        <div>
          <div className="text-sm text-gray-600">Trading Days</div>
          <div className="font-medium">{Math.max(0, balanceData.length - 1)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Total Trades</div>
          <div className="font-medium">{balanceData[balanceData.length - 1]?.tradeCount || 0}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Best Day</div>
          <div className="font-medium text-green-600">
            {formatCurrency(Math.max(...balanceData.map(p => p.dailyProfit)))}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Worst Day</div>
          <div className="font-medium text-red-600">
            {formatCurrency(Math.min(...balanceData.map(p => p.dailyProfit)))}
          </div>
        </div>
      </div>
    </div>
  )
}