'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import type { Trade } from '@/lib/supabase'

interface PairReturnsProps {
  trades: Trade[]
  loading?: boolean
  currency?: string
}

interface PairData {
  symbol: string
  totalProfit: number
  totalCommission: number
  totalSwap: number
  netTotal: number
  tradeCount: number
  winRate: number
  avgProfit: number
  winningTrades: number
  losingTrades: number
}

export function PairReturns({ trades, loading = false, currency = 'USD' }: PairReturnsProps) {
  
  const pairData = useMemo(() => {
    if (!trades.length) return []

    // Group trades by symbol
    const tradesByPair = new Map<string, Trade[]>()
    
    trades.forEach(trade => {
      const symbol = trade.symbol.toUpperCase()
      if (!tradesByPair.has(symbol)) {
        tradesByPair.set(symbol, [])
      }
      tradesByPair.get(symbol)!.push(trade)
    })

    // Calculate statistics for each pair
    const pairStats: PairData[] = Array.from(tradesByPair.entries())
      .map(([symbol, pairTrades]) => {
        const totalProfit = pairTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
        const totalCommission = pairTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0)
        const totalSwap = pairTrades.reduce((sum, trade) => sum + (trade.swap || 0), 0)
        const netTotal = totalProfit + totalCommission + totalSwap
        
        const winningTrades = pairTrades.filter(t => t.profit > 0).length
        const losingTrades = pairTrades.filter(t => t.profit < 0).length
        const winRate = pairTrades.length > 0 ? (winningTrades / pairTrades.length) * 100 : 0
        const avgProfit = pairTrades.length > 0 ? netTotal / pairTrades.length : 0

        return {
          symbol,
          totalProfit,
          totalCommission,
          totalSwap,
          netTotal,
          tradeCount: pairTrades.length,
          winRate,
          avgProfit,
          winningTrades,
          losingTrades
        }
      })
      .sort((a, b) => b.netTotal - a.netTotal) // Sort by net total descending

    return pairStats
  }, [trades])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-80 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (!pairData.length) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
        <h3 className="text-lg font-semibold text-dashboard-text mb-4">Returns by Trading Pair</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          {trades.length > 0 ? 'Processing pair data...' : 'No trading data available'}
        </div>
      </div>
    )
  }

  const bestPair = pairData[0]
  const worstPair = pairData[pairData.length - 1]
  const totalTrades = pairData.reduce((sum, pair) => sum + pair.tradeCount, 0)
  const totalProfit = pairData.reduce((sum, pair) => sum + pair.totalProfit, 0)
  const totalCommission = pairData.reduce((sum, pair) => sum + pair.totalCommission, 0)
  const totalSwap = pairData.reduce((sum, pair) => sum + pair.totalSwap, 0)
  const totalNet = totalProfit + totalCommission + totalSwap

  return (
    <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-dashboard-text">Returns by Trading Pair</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {pairData.length}
          </div>
          <div className="text-sm text-gray-500">
            pairs traded
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pairData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="symbol"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
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
                  const data = payload[0].payload as PairData
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">{label}</p>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-600">Raw Profit:</span>{' '}
                          <span className={`font-medium ${data.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(data.totalProfit)}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Commission:</span>{' '}
                          <span className={`font-medium ${data.totalCommission >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(data.totalCommission)}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Swap:</span>{' '}
                          <span className={`font-medium ${data.totalSwap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(data.totalSwap)}
                          </span>
                        </p>
                        <div className="border-t pt-1 mt-2">
                          <p className="text-sm font-medium">
                            <span className="text-gray-600">Net Total:</span>{' '}
                            <span className={`font-bold ${data.netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(data.netTotal)}
                            </span>
                          </p>
                        </div>
                        <p className="text-sm">
                          <span className="text-gray-600">Trades:</span>{' '}
                          <span className="font-medium">{data.tradeCount}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Win Rate:</span>{' '}
                          <span className={`font-medium ${data.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.winRate.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {/* Three bars: Profit (green), Commission (red), Swap (orange) */}
            <Bar dataKey="totalProfit" fill="#10b981" name="Profit" radius={[2, 2, 0, 0]} />
            <Bar dataKey="totalCommission" fill="#ef4444" name="Commission" radius={[2, 2, 0, 0]} />
            <Bar dataKey="totalSwap" fill="#f59e0b" name="Swap" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>


      {/* Top performing pairs */}
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Top Performers</h4>
        <div className="space-y-2">
          {pairData.slice(0, 3).map((pair, index) => (
            <div key={pair.symbol} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className={`text-sm font-medium px-2 py-1 rounded ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  #{index + 1}
                </div>
                <div className="font-medium text-gray-900">{pair.symbol}</div>
                <div className="text-sm text-gray-500">{pair.tradeCount} trades</div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${pair.netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pair.netTotal)}
                </div>
                <div className="text-xs text-gray-500">
                  {pair.winRate.toFixed(1)}% win rate
                </div>
                <div className="text-xs text-gray-400">
                  P:{formatCurrency(pair.totalProfit)} C:{formatCurrency(pair.totalCommission)} S:{formatCurrency(pair.totalSwap)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}