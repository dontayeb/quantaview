'use client'

import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CalculatorIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface TradesMetricsProps {
  metrics: {
    totalTrades: number
    buyTrades: number
    sellTrades: number
    totalProfit: number
    totalCommission: number
    totalSwap: number
    winningTrades: number
    losingTrades: number
    winRate: number
    profitFactor: number
    closedTrades: number
    averageProfit: number
    largestWin: number
    largestLoss: number
    averageRRR: number
    tradesPerDay: number
    tradesPerWeek: number
    tradesPerMonth: number
    maxDrawdown: number
    maxDrawdownPercent: number
    currentDrawdown: number
    currentDrawdownPercent: number
    recoveryFactor: number
    totalBalance: number
  }
  loading?: boolean
}

export function TradesMetrics({ metrics, loading }: TradesMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const cards = [
    {
      title: 'Account Balance',
      value: formatCurrency(metrics.totalBalance),
      icon: BanknotesIcon,
      color: metrics.totalBalance >= 0 ? 'text-dashboard-success' : 'text-red-600',
      bgColor: metrics.totalBalance >= 0 ? 'bg-green-50' : 'bg-red-50',
      change: `${formatCurrency(metrics.totalProfit)} profit`
    },
    {
      title: 'Win Rate',
      value: formatPercentage(metrics.winRate),
      icon: ArrowTrendingUpIcon,
      color: metrics.winRate >= 50 ? 'text-dashboard-success' : 'text-orange-600',
      bgColor: metrics.winRate >= 50 ? 'bg-green-50' : 'bg-orange-50',
      change: `${metrics.winningTrades}W / ${metrics.losingTrades}L`
    },
    {
      title: 'Profit Factor',
      value: metrics.profitFactor >= 999 ? '∞' : metrics.profitFactor.toFixed(2),
      icon: ChartBarIcon,
      color: metrics.profitFactor > 1 ? 'text-dashboard-success' : metrics.profitFactor === 1 ? 'text-yellow-600' : 'text-red-600',
      bgColor: metrics.profitFactor > 1 ? 'bg-green-50' : metrics.profitFactor === 1 ? 'bg-yellow-50' : 'bg-red-50',
      change: `${metrics.profitFactor > 1 ? 'Profitable' : metrics.profitFactor === 1 ? 'Break-even' : 'Losing'} strategy`
    },
    {
      title: 'Average RRR',
      value: metrics.averageRRR > 0 ? `1:${metrics.averageRRR.toFixed(2)}` : 'N/A',
      icon: CalculatorIcon,
      color: metrics.averageRRR >= 2 ? 'text-dashboard-success' : metrics.averageRRR >= 1 ? 'text-yellow-600' : 'text-red-600',
      bgColor: metrics.averageRRR >= 2 ? 'bg-green-50' : metrics.averageRRR >= 1 ? 'bg-yellow-50' : 'bg-red-50',
      change: `${metrics.tradesPerDay.toFixed(1)} trades/day`
    },
    {
      title: 'Max Drawdown',
      value: formatPercentage(metrics.maxDrawdownPercent),
      icon: ArrowTrendingDownIcon,
      color: metrics.maxDrawdownPercent <= 5 ? 'text-dashboard-success' : metrics.maxDrawdownPercent > 20 ? 'text-red-600' : 'text-orange-600',
      bgColor: metrics.maxDrawdownPercent <= 5 ? 'bg-green-50' : metrics.maxDrawdownPercent > 20 ? 'bg-red-50' : 'bg-orange-50',
      change: `${formatCurrency(metrics.maxDrawdown)} worst loss`
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="bg-dashboard-card rounded-xl shadow-dashboard p-6 hover:shadow-dashboard-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-dashboard-textLight">{card.title}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
                <p className="text-xs text-dashboard-textLight mt-2">{card.change}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}