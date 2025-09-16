'use client'

import { Trade } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface ProfitChartProps {
  trades: Trade[]
}

export function ProfitChart({ trades }: ProfitChartProps) {
  const completedTrades = trades
    .filter(trade => trade.close_time && trade.profit !== null)
    .sort((a, b) => new Date(a.close_time!).getTime() - new Date(b.close_time!).getTime())

  let cumulativeProfit = 0
  const profitData = completedTrades.map((trade, index) => {
    cumulativeProfit += trade.profit || 0
    return {
      date: trade.close_time!,
      profit: trade.profit || 0,
      cumulativeProfit,
      tradeIndex: index + 1
    }
  })

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd')
    } catch {
      return dateString.slice(0, 10)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Profit/Loss</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={profitData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date"
            tickFormatter={formatDate}
            fontSize={12}
          />
          <YAxis 
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            fontSize={12}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              name === 'cumulativeProfit' ? `$${value.toFixed(2)}` : `$${value.toFixed(2)}`,
              name === 'cumulativeProfit' ? 'Cumulative P&L' : 'Trade P&L'
            ]}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Line 
            type="monotone" 
            dataKey="cumulativeProfit" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={false}
            name="Cumulative P&L"
          />
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="#10b981" 
            strokeWidth={1}
            dot={{ r: 2 }}
            name="Individual Trade"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}