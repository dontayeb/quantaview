'use client'

import { Trade } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react'

interface MetricsCardsProps {
  trades: Trade[]
}

export function MetricsCards({ trades }: MetricsCardsProps) {
  const completedTrades = trades.filter(trade => trade.close_time)
  const totalProfit = completedTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
  const winningTrades = completedTrades.filter(trade => (trade.profit || 0) > 0)
  const losingTrades = completedTrades.filter(trade => (trade.profit || 0) < 0)
  const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0
  
  const totalVolume = trades.reduce((sum, trade) => sum + trade.volume, 0)

  const metrics = [
    {
      title: 'Total Profit/Loss',
      value: `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}`,
      change: totalProfit >= 0 ? 'positive' : 'negative',
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: totalProfit >= 0 ? 'green' : 'red'
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      change: winRate >= 50 ? 'positive' : 'negative',
      icon: Target,
      color: winRate >= 50 ? 'green' : 'red'
    },
    {
      title: 'Total Trades',
      value: completedTrades.length.toString(),
      change: 'neutral',
      icon: Activity,
      color: 'blue'
    },
    {
      title: 'Total Volume',
      value: totalVolume.toFixed(2),
      change: 'neutral',
      icon: Activity,
      color: 'purple'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        const colorClasses = {
          green: 'bg-green-50 text-dashboard-success',
          red: 'bg-red-50 text-red-600',
          blue: 'bg-blue-50 text-blue-600',
          purple: 'bg-primary-50 text-primary-500'
        }

        return (
          <div key={index} className="bg-dashboard-card rounded-xl shadow-dashboard border border-gray-100 p-6 hover:shadow-dashboard-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dashboard-textLight">{metric.title}</p>
                <p className={`text-2xl font-bold mt-2 ${
                  metric.change === 'positive' ? 'text-dashboard-success' :
                  metric.change === 'negative' ? 'text-red-600' :
                  'text-dashboard-text'
                }`}>
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${colorClasses[metric.color as keyof typeof colorClasses]}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}