'use client'

import { Trade } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TradingChartProps {
  trades: Trade[]
}

export function TradingChart({ trades }: TradingChartProps) {
  const symbolData = trades.reduce((acc, trade) => {
    const symbol = trade.symbol
    if (!acc[symbol]) {
      acc[symbol] = { symbol, wins: 0, losses: 0, totalTrades: 0, profit: 0 }
    }
    
    acc[symbol].totalTrades++
    if (trade.profit && trade.profit > 0) {
      acc[symbol].wins++
    } else if (trade.profit && trade.profit < 0) {
      acc[symbol].losses++
    }
    acc[symbol].profit += trade.profit || 0
    
    return acc
  }, {} as Record<string, any>)

  const chartData = Object.values(symbolData)
    .sort((a: any, b: any) => b.totalTrades - a.totalTrades)
    .slice(0, 10)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Activity by Symbol</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="symbol" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [value, name === 'wins' ? 'Winning Trades' : 'Losing Trades']}
            labelFormatter={(label) => `Symbol: ${label}`}
          />
          <Legend />
          <Bar dataKey="wins" fill="#10b981" name="Wins" />
          <Bar dataKey="losses" fill="#ef4444" name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}