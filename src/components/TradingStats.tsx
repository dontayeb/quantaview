'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import type { Trade } from '@/lib/supabase'

interface TradingStatsProps {
  trades: Trade[]
  metrics: {
    totalTrades: number
    tradesPerDay: number
    tradesPerWeek: number
    tradesPerMonth: number
    averageRRR: number
    winRate: number
  }
  loading?: boolean
}

interface DailyTradeData {
  date: string
  trades: number
  dayOfWeek: string
}

export function TradingStats({ trades, metrics, loading }: TradingStatsProps) {
  const dailyTradeData = useMemo(() => {
    if (!trades.length) return []

    // Group trades by day
    const tradesByDay = new Map<string, number>()
    
    trades.forEach(trade => {
      const tradeDate = new Date(trade.close_time || trade.open_time)
      const dayKey = format(tradeDate, 'yyyy-MM-dd')
      
      tradesByDay.set(dayKey, (tradesByDay.get(dayKey) || 0) + 1)
    })

    // Convert to array and sort by date
    const dailyData: DailyTradeData[] = Array.from(tradesByDay.entries())
      .map(([date, count]) => ({
        date: format(new Date(date), 'MMM dd'),
        trades: count,
        dayOfWeek: format(new Date(date), 'EEE')
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return dailyData
  }, [trades])

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

  if (!dailyTradeData.length && !loading) {
    console.warn('TradingStats: No daily data but not loading. Trades count:', trades.length)
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trading Activity</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          {trades.length > 0 ? 'Processing trade data...' : 'No trading data available'}
        </div>
      </div>
    )
  }

  const maxTrades = Math.max(...dailyTradeData.map(d => d.trades))
  const avgTrades = dailyTradeData.reduce((sum, d) => sum + d.trades, 0) / dailyTradeData.length

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Daily Trading Activity</h3>
          <div className="flex items-center space-x-4 mt-2">
            <div className="text-sm text-gray-600">
              Average: <span className="font-medium text-gray-900">{avgTrades.toFixed(1)} trades/day</span>
            </div>
            <div className="text-sm text-gray-600">
              Peak: <span className="font-medium text-gray-900">{maxTrades} trades</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {dailyTradeData.length}
          </div>
          <div className="text-sm text-gray-500">
            trading days
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyTradeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              allowDecimals={false}
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
                          <span className="text-gray-600">Trades:</span>{' '}
                          <span className="font-medium text-blue-600">{data.trades}</span>
                        </p>
                        <p className="text-sm text-gray-500">{data.dayOfWeek}</p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="trades"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t pt-4">
        <div>
          <div className="text-sm text-gray-600">Total Days</div>
          <div className="font-medium text-gray-900">{dailyTradeData.length}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Daily Average</div>
          <div className="font-medium text-blue-600">{avgTrades.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Most Active Day</div>
          <div className="font-medium text-green-600">{maxTrades} trades</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Average RRR</div>
          <div className={`font-medium ${
            metrics.averageRRR >= 2 ? 'text-green-600' : 
            metrics.averageRRR >= 1 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {metrics.averageRRR > 0 ? `1:${metrics.averageRRR.toFixed(2)}` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}