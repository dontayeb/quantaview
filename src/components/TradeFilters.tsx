'use client'

import { CalendarIcon, CurrencyDollarIcon, FunnelIcon, ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import type { Trade } from '@/lib/supabase'

export interface TradeFilters {
  dateRange: {
    start: string
    end: string
  }
  symbols: string[]
  sessions: string[]
}

interface TradeFiltersProps {
  trades: Trade[]
  filters: TradeFilters
  onFiltersChange: (filters: TradeFilters) => void
  loading?: boolean
}

export function TradeFiltersComponent({ trades, filters, onFiltersChange, loading }: TradeFiltersProps) {
  
  // Get unique symbols from trades
  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol))).sort()

  // Trading sessions
  const tradingSessions = [
    { id: 'asian', name: 'Asian Session', time: '23:00-08:00 UTC' },
    { id: 'london', name: 'London Session', time: '08:00-17:00 UTC' },
    { id: 'ny', name: 'New York Session', time: '13:00-22:00 UTC' }
  ]

  // Get date range from trades
  const sortedTrades = trades.filter(t => t.close_time || t.open_time).sort((a, b) => {
    const dateA = new Date(a.close_time || a.open_time).getTime()
    const dateB = new Date(b.close_time || b.open_time).getTime()
    return dateA - dateB
  })

  const minDate = sortedTrades.length > 0 
    ? new Date(sortedTrades[0].close_time || sortedTrades[0].open_time).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]
    
  const maxDate = sortedTrades.length > 0
    ? new Date(sortedTrades[sortedTrades.length - 1].close_time || sortedTrades[sortedTrades.length - 1].open_time).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const handleFilterChange = (key: keyof TradeFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const resetFilters = () => {
    onFiltersChange({
      dateRange: {
        start: '',
        end: ''
      },
      symbols: [],
      sessions: []
    })
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.dateRange.start || filters.dateRange.end) count++
    if (filters.symbols.length > 0) count++
    if (filters.sessions.length > 0) count++
    return count
  }

  if (loading) {
    return (
      <div className="bg-dashboard-card rounded-xl shadow-dashboard p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dashboard-card rounded-xl shadow-dashboard p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FunnelIcon className="h-5 w-5 text-dashboard-textLight" />
          <h3 className="text-lg font-medium text-dashboard-text">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-600">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        <button
          onClick={resetFilters}
          className="text-sm text-dashboard-textLight hover:text-dashboard-text transition-colors duration-200"
          disabled={getActiveFilterCount() === 0}
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Symbol Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-dashboard-text">
              <GlobeAltIcon className="inline h-4 w-4 mr-1" />
              Trading Pairs
            </label>
            
            {/* Select All / Clear All Controls */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFilterChange('symbols', uniqueSymbols)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                disabled={filters.symbols.length === uniqueSymbols.length}
              >
                Select All
              </button>
              <span className="text-xs text-gray-300">|</span>
              <button
                type="button"
                onClick={() => handleFilterChange('symbols', [])}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                disabled={filters.symbols.length === 0}
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 border border-gray-200 rounded-lg p-3">
            {uniqueSymbols.map(symbol => (
              <label key={symbol} className="flex items-center cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={filters.symbols.includes(symbol)}
                  onChange={(e) => {
                    const newSymbols = e.target.checked 
                      ? [...filters.symbols, symbol]
                      : filters.symbols.filter(s => s !== symbol)
                    handleFilterChange('symbols', newSymbols)
                  }}
                  className="mr-2 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">{symbol}</span>
              </label>
            ))}
            {uniqueSymbols.length === 0 && (
              <div className="px-3 py-2 text-sm text-dashboard-textLight">No symbols available</div>
            )}
          </div>
          {filters.symbols.length > 0 ? (
            <div className="mt-1 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded">
              {filters.symbols.length} of {uniqueSymbols.length} pairs selected
              {filters.symbols.length === 1 && (
                <span className="ml-1 font-medium">({filters.symbols[0]} only)</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-dashboard-textLight">
              Showing all {uniqueSymbols.length} pairs
            </div>
          )}
        </div>

        {/* Session Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="inline h-4 w-4 mr-1" />
            Trading Sessions
          </label>
          <div className="flex flex-wrap gap-3">
            {tradingSessions.map(session => (
              <label key={session.id} className="flex items-center cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors duration-200 border border-gray-200">
                <input
                  type="checkbox"
                  checked={filters.sessions.includes(session.id)}
                  onChange={(e) => {
                    const newSessions = e.target.checked 
                      ? [...filters.sessions, session.id]
                      : filters.sessions.filter(s => s !== session.id)
                    handleFilterChange('sessions', newSessions)
                  }}
                  className="mr-2 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dashboard-text">{session.name}</div>
                  <div className="text-xs text-dashboard-textLight">{session.time}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CalendarIcon className="inline h-4 w-4 mr-1" />
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              placeholder="Start date"
              value={filters.dateRange.start}
              onChange={(e) => handleFilterChange('dateRange', {
                ...filters.dateRange,
                start: e.target.value
              })}
              min={minDate}
              max={maxDate}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              placeholder="End date"
              value={filters.dateRange.end}
              onChange={(e) => handleFilterChange('dateRange', {
                ...filters.dateRange,
                end: e.target.value
              })}
              min={minDate}
              max={maxDate}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get trading session for a given time
function getTradingSession(date: Date): string[] {
  const utcHour = date.getUTCHours()
  const sessions: string[] = []
  
  // Asian Session: 23:00-08:00 UTC (overlaps midnight)
  if (utcHour >= 23 || utcHour < 8) {
    sessions.push('asian')
  }
  
  // London Session: 08:00-17:00 UTC
  if (utcHour >= 8 && utcHour < 17) {
    sessions.push('london')
  }
  
  // New York Session: 13:00-22:00 UTC
  if (utcHour >= 13 && utcHour < 22) {
    sessions.push('ny')
  }
  
  return sessions
}

// Helper function to apply filters to trades
export function applyFilters(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter(trade => {
    // Symbol filter
    if (filters.symbols.length > 0 && !filters.symbols.includes(trade.symbol)) {
      return false
    }

    // Date range filter
    const tradeDate = new Date(trade.close_time || trade.open_time)
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start)
      if (tradeDate < startDate) return false
    }
    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date
      if (tradeDate > endDate) return false
    }

    // Session filter
    if (filters.sessions.length > 0) {
      const tradeSessions = getTradingSession(new Date(trade.open_time))
      const hasMatchingSession = filters.sessions.some(session => 
        tradeSessions.includes(session)
      )
      if (!hasMatchingSession) return false
    }

    return true
  })
}