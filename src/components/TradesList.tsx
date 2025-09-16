'use client'

import { useState } from 'react'
import { Trade } from '@/lib/supabase'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'

interface TradesListProps {
  trades: Trade[]
  loading?: boolean
}

export function TradesList({ trades, loading }: TradesListProps) {
  const [sortField, setSortField] = useState<keyof Trade>('close_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showAll, setShowAll] = useState(false)

  const handleSort = (field: keyof Trade) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTrades = [...trades].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1
    
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const displayTrades = showAll ? sortedTrades : sortedTrades.slice(0, 20)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Open'
    try {
      return new Date(dateString).toLocaleDateString() + ' ' + 
             new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateString
    }
  }

  const SortButton = ({ field, children }: { field: keyof Trade; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dashboard-card rounded-xl shadow-dashboard border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dashboard-text">Recent Trades</h3>
          <span className="text-sm text-dashboard-textLight">{trades.length} total trades</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <SortButton field="position">Position</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="symbol">Symbol</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="type">Type</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="volume">Volume</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="open_price">Open Price</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="close_price">Close Price</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="profit">Profit</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="commission">Commission</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="swap">Swap</SortButton>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="open_time">Open Time</SortButton>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayTrades.map((trade, index) => (
              <tr key={trade.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                  {trade.position}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {trade.symbol}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.type === 'buy' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {trade.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {trade.volume.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                  {trade.open_price.toFixed(5)}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                  {trade.close_price ? trade.close_price.toFixed(5) : '-'}
                </td>
                <td className="px-6 py-4 text-sm font-semibold">
                  {trade.profit !== null && trade.profit !== undefined ? (
                    <span className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-semibold">
                  {trade.commission !== null && trade.commission !== undefined ? (
                    <span className={trade.commission >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {trade.commission >= 0 ? '+' : ''}{trade.commission.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-semibold">
                  {trade.swap !== null && trade.swap !== undefined ? (
                    <span className={trade.swap >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {trade.swap >= 0 ? '+' : ''}{trade.swap.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(trade.open_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length > 20 && (
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors duration-200"
          >
            {showAll ? 'Show less' : `Show all ${trades.length} trades`}
          </button>
        </div>
      )}
    </div>
  )
}