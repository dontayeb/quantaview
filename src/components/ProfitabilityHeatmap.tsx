'use client'

import { useState, useEffect } from 'react'
import { FireIcon, ClockIcon } from '@heroicons/react/24/outline'
import { quantaAPI, type HeatmapData } from '@/lib/api'

interface ProfitabilityHeatmapProps {
  accountId: string
  type: 'hourly' | 'daily'
  loading?: boolean
}

export function ProfitabilityHeatmap({ accountId, type, loading = false }: ProfitabilityHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [heatmapLoading, setHeatmapLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHeatmapData = async () => {
      if (!accountId) return
      
      try {
        setHeatmapLoading(true)
        setError(null)
        
        const data = type === 'hourly' 
          ? await quantaAPI.getHourlyHeatmap(accountId)
          : await quantaAPI.getDailyHeatmap(accountId)
          
        setHeatmapData(data)
      } catch (err) {
        // Check if this is a network/API unavailable error
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch heatmap data'
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
          setError('Analytics service unavailable - heatmap data requires backend connection')
        } else {
          setError(errorMessage)
        }
        // Only log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Heatmap error:', err)
        }
      } finally {
        setHeatmapLoading(false)
      }
    }

    fetchHeatmapData()
  }, [accountId, type])

  const getHeatmapColor = (profit: number, maxProfit: number, minProfit: number) => {
    if (profit === 0) return 'bg-gray-100 text-gray-500'
    
    const range = maxProfit - minProfit
    const normalizedValue = range === 0 ? 0 : (profit - minProfit) / range
    
    if (profit > 0) {
      // Green for profit
      const intensity = Math.min(normalizedValue * 100, 100)
      if (intensity > 80) return 'bg-green-600 text-white'
      if (intensity > 60) return 'bg-green-500 text-white'
      if (intensity > 40) return 'bg-green-400 text-white'
      if (intensity > 20) return 'bg-green-300 text-green-800'
      return 'bg-green-100 text-green-700'
    } else {
      // Red for loss
      const intensity = Math.min(Math.abs(normalizedValue) * 100, 100)
      if (intensity > 80) return 'bg-red-600 text-white'
      if (intensity > 60) return 'bg-red-500 text-white'
      if (intensity > 40) return 'bg-red-400 text-white'
      if (intensity > 20) return 'bg-red-300 text-red-800'
      return 'bg-red-100 text-red-700'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading || heatmapLoading) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
        <div className="flex items-center gap-3 mb-4">
          <FireIcon className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-dashboard-text">
            {type === 'hourly' ? 'Hourly' : 'Daily'} Profitability Heatmap
          </h3>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {[...Array(type === 'hourly' ? 24 : 7)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
        <div className="flex items-center gap-3 mb-4">
          <FireIcon className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-dashboard-text">
            {type === 'hourly' ? 'Hourly' : 'Daily'} Profitability Heatmap
          </h3>
        </div>
        <div className="text-center text-dashboard-textLight">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <FireIcon className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-orange-700 mb-1">Analytics Unavailable</p>
            <p className="text-xs text-orange-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!heatmapData || heatmapData.data.length === 0) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
        <div className="flex items-center gap-3 mb-4">
          <FireIcon className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-dashboard-text">
            {type === 'hourly' ? 'Hourly' : 'Daily'} Profitability Heatmap
          </h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm">No trading data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FireIcon className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-dashboard-text">
            {type === 'hourly' ? 'Hourly' : 'Daily'} Profitability Heatmap
          </h3>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Loss</span>
          </div>
        </div>
      </div>

      <div className={`grid gap-2 ${
        type === 'hourly' 
          ? 'grid-cols-6 md:grid-cols-8 lg:grid-cols-12' 
          : 'grid-cols-7'
      }`}>
        {heatmapData.data.map((item, index) => {
          const label = type === 'hourly' 
            ? `${item.hour}:00` 
            : item.day
            
          const colorClass = getHeatmapColor(
            item.profit, 
            heatmapData.max_profit, 
            heatmapData.min_profit
          )
          
          return (
            <div
              key={index}
              className={`p-2 rounded-lg text-center transition-transform hover:scale-105 cursor-pointer ${colorClass}`}
              title={`${label}: ${formatCurrency(item.profit)} (${item.trade_count} trades, ${item.win_rate.toFixed(1)}% win rate)`}
            >
              <div className="text-xs font-medium mb-1">{label}</div>
              <div className="text-xs font-bold">
                {formatCurrency(item.profit)}
              </div>
              <div className="text-xs opacity-75 mt-1">
                {item.trade_count} trades
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Best: {formatCurrency(heatmapData.max_profit)} | 
        Worst: {formatCurrency(heatmapData.min_profit)} | 
        Hover for details
      </div>
    </div>
  )
}