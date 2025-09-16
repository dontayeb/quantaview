'use client'

import { useState, useEffect } from 'react'
import { 
  LightBulbIcon, 
  ClockIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
import { quantaAPI, type PatternInsight } from '@/lib/api'

interface AIInsightsProps {
  accountId: string
  loading?: boolean
}

export function AIInsights({ accountId, loading = false }: AIInsightsProps) {
  const [insights, setInsights] = useState<PatternInsight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      if (!accountId) return
      
      try {
        setInsightsLoading(true)
        setError(null)
        const data = await quantaAPI.getTradingInsights(accountId)
        setInsights(data)
      } catch (err) {
        // Check if this is a network/API unavailable error
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch AI insights'
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
          setError('AI analytics service unavailable - insights require backend connection')
        } else {
          setError(errorMessage)
        }
        // Only log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('AI Insights error:', err)
        }
      } finally {
        setInsightsLoading(false)
      }
    }

    fetchInsights()
  }, [accountId])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'time_pattern':
      case 'session_pattern':
        return ClockIcon
      case 'pair_performance':
        return ChartBarIcon
      case 'risk_analysis':
        return ExclamationTriangleIcon
      default:
        return LightBulbIcon
    }
  }

  const getInsightColor = (confidence: number, value: number) => {
    if (confidence >= 0.8) {
      return value >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
    } else if (confidence >= 0.6) {
      return 'text-yellow-600 bg-yellow-100'
    } else {
      return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading || insightsLoading) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
        <div className="flex items-center gap-3 mb-4">
          <LightBulbIcon className="h-6 w-6 text-primary-500" />
          <h3 className="text-lg font-semibold text-dashboard-text">AI Trading Insights</h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
        <div className="flex items-center gap-3 mb-4">
          <LightBulbIcon className="h-6 w-6 text-primary-500" />
          <h3 className="text-lg font-semibold text-dashboard-text">AI Trading Insights</h3>
        </div>
        <div className="text-center text-dashboard-textLight">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <LightBulbIcon className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-orange-700 mb-1">AI Analytics Unavailable</p>
            <p className="text-xs text-orange-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
      <div className="flex items-center gap-3 mb-6">
        <LightBulbIcon className="h-6 w-6 text-primary-500" />
        <h3 className="text-lg font-semibold text-dashboard-text">AI Trading Insights</h3>
        <span className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded-full">
          {insights.length} insights
        </span>
      </div>

      {insights.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <LightBulbIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm">No insights available yet</p>
          <p className="text-xs mt-1">More data needed for AI analysis</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type)
            const colorClasses = getInsightColor(insight.confidence, insight.value)
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${colorClasses.split(' ')[1]}`}>
                    <Icon className={`h-5 w-5 ${colorClasses.split(' ')[0]}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {insight.title}
                      </h4>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                        {Math.round(insight.confidence * 100)}% confident
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {insight.description}
                    </p>
                    
                    {insight.recommendation && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                        <div className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-800">
                            <strong>Recommendation:</strong> {insight.recommendation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}