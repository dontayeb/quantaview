/**
 * FastAPI backend client for AI analytics
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PatternInsight {
  type: string
  title: string
  description: string
  value: number
  confidence: number
  recommendation?: string
}

interface TimeAnalysis {
  hour: number
  profit: number
  trade_count: number
  win_rate: number
  avg_profit: number
}

interface PairAnalysis {
  symbol: string
  profit: number
  trade_count: number
  win_rate: number
  avg_profit: number
  risk_score: number
}

interface HeatmapData {
  data: Array<{
    hour?: number
    day?: string
    day_index?: number
    profit: number
    trade_count: number
    avg_profit: number
    win_rate: number
  }>
  max_profit: number
  min_profit: number
}

interface TradingAccount {
  id: string
  user_id: string
  account_number: number
  account_name: string
  password: string
  server: string
  broker?: string
  currency: string
  account_type?: string
  starting_balance: number
  balance?: number
  equity?: number
  free_margin?: number
  margin_level?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Trade {
  id: string
  trading_account_id: string
  position: number
  ticket?: number
  magic_number?: number
  symbol: string
  type: 'buy' | 'sell'
  volume: number
  open_time: string
  open_price: number
  close_time?: string
  close_price?: number
  stop_loss?: number
  take_profit?: number
  profit: number
  commission: number
  swap: number
  comment?: string
  created_at: string
  updated_at: string
}

class QuantaViewAPI {
  private baseUrl: string

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : 'Bearer test_token',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // AI Insights (from Railway database)
  async getTradingInsights(accountId: string): Promise<PatternInsight[]> {
    return this.request(`/api/v1/analytics/insights/${accountId}`)
  }

  // Time Analysis
  async getTimeAnalysis(accountId: string): Promise<TimeAnalysis[]> {
    return this.request(`/api/v1/analytics/time-analysis/${accountId}`)
  }

  // Pair Analysis
  async getPairAnalysis(accountId: string): Promise<PairAnalysis[]> {
    return this.request(`/api/v1/analytics/pair-analysis/${accountId}`)
  }

  // Heatmaps
  async getHourlyHeatmap(accountId: string): Promise<HeatmapData> {
    return this.request(`/api/v1/analytics/heatmap/hourly/${accountId}`)
  }

  async getDailyHeatmap(accountId: string): Promise<HeatmapData> {
    return this.request(`/api/v1/analytics/heatmap/daily/${accountId}`)
  }

  // Lot Size Analysis
  async getLotSizeAnalysis(accountId: string): Promise<{
    analysis: Array<{
      lot_range: string
      total_profit: number
      avg_profit: number
      profit_std: number
      trade_count: number
      win_rate: number
      risk_ratio: number
    }>
    insights: PatternInsight[]
  }> {
    return this.request(`/api/v1/analytics/lot-size-analysis/${accountId}`)
  }

  // Trading Accounts
  async getTradingAccounts(userId: string): Promise<TradingAccount[]> {
    return this.request(`/api/v1/accounts/${userId}`)
  }

  async getTradingAccount(accountId: string): Promise<TradingAccount> {
    return this.request(`/api/v1/accounts/account/${accountId}`)
  }

  async createTradingAccount(account: {
    user_id: string
    account_number: number
    account_name: string
    password: string
    server: string
    broker?: string
    currency: string
    account_type?: string
    starting_balance: number
  }): Promise<TradingAccount> {
    return this.request('/api/v1/accounts/', {
      method: 'POST',
      body: JSON.stringify(account)
    })
  }

  async updateTradingAccount(accountId: string, updates: {
    account_name?: string
    account_number?: number
    server?: string
    broker?: string
    currency?: string
    account_type?: string
    starting_balance?: number
  }): Promise<TradingAccount> {
    return this.request(`/api/v1/accounts/account/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteTradingAccount(accountId: string): Promise<{ message: string }> {
    return this.request(`/api/v1/accounts/account/${accountId}`, {
      method: 'DELETE'
    })
  }

  // Trades
  async getTrades(accountId: string): Promise<Trade[]> {
    return this.request(`/api/v1/trades/${accountId}`)
  }

  async getTrade(tradeId: string): Promise<Trade> {
    return this.request(`/api/v1/trades/trade/${tradeId}`)
  }

  // Authentication
  async register(email: string, password: string, fullName?: string): Promise<{
    access_token: string
    token_type: string
    user: {
      id: string
      email: string
      full_name?: string
      is_active: boolean
    }
  }> {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName
      })
    })
  }

  async login(email: string, password: string): Promise<{
    access_token: string
    token_type: string
    user: {
      id: string
      email: string
      full_name?: string
      is_active: boolean
    }
  }> {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    })
  }

  async getCurrentUser(): Promise<{
    id: string
    email: string
    full_name?: string
    is_active: boolean
    created_at: string
  }> {
    return this.request('/api/v1/auth/me')
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/api/v1/auth/logout', {
      method: 'POST'
    })
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request('/health')
  }
}

export const quantaAPI = new QuantaViewAPI()

export type { PatternInsight, TimeAnalysis, PairAnalysis, HeatmapData, TradingAccount, Trade }