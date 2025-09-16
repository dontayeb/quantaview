'use client'

import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'

interface DealsMetricsProps {
  metrics: {
    totalDeals: number
    buyDeals: number
    sellDeals: number
    totalProfit: number
    totalCommission: number
    totalSwap: number
    winningDeals: number
    losingDeals: number
    winRate: number
  }
  loading?: boolean
}

export function DealsMetrics({ metrics, loading }: DealsMetricsProps) {
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
      title: 'Total Profit',
      value: formatCurrency(metrics.totalProfit),
      icon: CurrencyDollarIcon,
      color: metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: metrics.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100',
      change: `${metrics.totalDeals} total deals`
    },
    {
      title: 'Win Rate',
      value: formatPercentage(metrics.winRate),
      icon: ArrowTrendingUpIcon,
      color: metrics.winRate >= 50 ? 'text-green-600' : 'text-orange-600',
      bgColor: metrics.winRate >= 50 ? 'bg-green-100' : 'bg-orange-100',
      change: `${metrics.winningDeals}W / ${metrics.losingDeals}L`
    },
    {
      title: 'Buy vs Sell',
      value: `${metrics.buyDeals}B / ${metrics.sellDeals}S`,
      icon: CalculatorIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `${((metrics.buyDeals / metrics.totalDeals) * 100 || 0).toFixed(1)}% buy trades`
    },
    {
      title: 'Fees & Costs',
      value: formatCurrency(metrics.totalCommission + metrics.totalSwap),
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: `Commission: ${formatCurrency(metrics.totalCommission)}`
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-2">{card.change}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}