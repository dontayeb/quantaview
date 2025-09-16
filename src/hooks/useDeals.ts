'use client'

// Legacy wrapper for backward compatibility
// Use useTrades instead for new development
import { useTrades } from './useTrades'
import type { Trade, TradingAccount } from '@/lib/supabase'

// Convert Trade to Deal format for backward compatibility
const convertTradeToDeals = (trades: Trade[]) => {
  return trades.map(trade => ({
    id: trade.id,
    trading_account_id: trade.trading_account_id,
    deal_id: trade.position,
    time: trade.open_time,
    symbol: trade.symbol,
    type: trade.type,
    direction: '', // Not available in trades
    volume: trade.volume,
    price: trade.open_price,
    order_id: trade.ticket || null,
    commission: trade.commission,
    fee: 0, // Not available in trades
    swap: trade.swap,
    profit: trade.profit,
    balance: null, // Not available in trades
    comment: trade.comment || '',
    created_at: trade.created_at
  }))
}

export function useDeals(tradingAccountId?: string) {
  const tradesHook = useTrades(tradingAccountId)
  
  // Convert trades to deals format
  const deals = convertTradeToDeals(tradesHook.trades)
  
  // Convert metrics to match old format
  const metrics = {
    totalDeals: tradesHook.metrics.totalTrades,
    buyDeals: tradesHook.metrics.buyTrades,
    sellDeals: tradesHook.metrics.sellTrades,
    totalProfit: tradesHook.metrics.totalProfit,
    totalCommission: tradesHook.metrics.totalCommission,
    totalSwap: tradesHook.metrics.totalSwap,
    winningDeals: tradesHook.metrics.winningTrades,
    losingDeals: tradesHook.metrics.losingTrades,
    winRate: tradesHook.metrics.winRate
  }

  return {
    ...tradesHook,
    deals,
    metrics
  }
}