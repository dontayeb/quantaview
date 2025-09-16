'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import type { Deal } from '@/lib/supabase'

interface DealsListProps {
  deals: Deal[]
  loading?: boolean
}

type SortField = 'time' | 'symbol' | 'profit' | 'volume'
type SortDirection = 'asc' | 'desc'
type FilterType = 'all' | 'buy' | 'sell' | 'profitable' | 'losing'

export function DealsList({ deals, loading }: DealsListProps) {
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    // Search filter
    if (searchTerm && !deal.symbol.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Type filter
    switch (filter) {
      case 'buy':
        return deal.type === 'buy'
      case 'sell':
        return deal.type === 'sell'
      case 'profitable':
        return deal.profit > 0
      case 'losing':
        return deal.profit < 0
      default:
        return true
    }
  })

  // Sort deals
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortField) {
      case 'time':
        aValue = new Date(a.time).getTime()
        bValue = new Date(b.time).getTime()
        break
      case 'symbol':
        aValue = a.symbol
        bValue = b.symbol
        break
      case 'profit':
        aValue = a.profit
        bValue = b.profit
        break
      case 'volume':
        aValue = a.volume
        bValue = b.volume
        break
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss')
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === 'asc' ? 
        <ArrowUpIcon className="h-4 w-4" /> : 
        <ArrowDownIcon className="h-4 w-4" />
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Deals ({filteredDeals.length})
          </h3>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Deals</option>
                <option value="buy">Buy Only</option>
                <option value="sell">Sell Only</option>
                <option value="profitable">Profitable</option>
                <option value="losing">Losing</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <SortButton field="time">Time</SortButton>
              </th>
              <th className="px-6 py-3 text-left">Deal ID</th>
              <th className="px-6 py-3 text-left">
                <SortButton field="symbol">Symbol</SortButton>
              </th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Direction</th>
              <th className="px-6 py-3 text-left">
                <SortButton field="volume">Volume</SortButton>
              </th>
              <th className="px-6 py-3 text-left">Price</th>
              <th className="px-6 py-3 text-left">
                <SortButton field="profit">Profit</SortButton>
              </th>
              <th className="px-6 py-3 text-left">Commission</th>
              <th className="px-6 py-3 text-left">Swap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedDeals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDateTime(deal.time)}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-600">
                  {deal.deal_id}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {deal.symbol}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    deal.type === 'buy' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {deal.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                  {deal.direction}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                  {deal.volume.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                  {deal.price.toFixed(5)}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${
                    deal.profit > 0 
                      ? 'text-green-600' 
                      : deal.profit < 0 
                      ? 'text-red-600' 
                      : 'text-gray-600'
                  }`}>
                    {formatCurrency(deal.profit)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                  {formatCurrency(deal.commission)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                  {formatCurrency(deal.swap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedDeals.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No deals found</div>
            <div className="text-gray-500 text-sm">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Import some trading data to get started'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}