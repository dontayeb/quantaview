/**
 * FastAPI backend client for AI analytics with comprehensive error handling
 */

import { 
  AppError, 
  parseAPIError, 
  withRetry, 
  logError, 
  ErrorContext,
  NetworkError 
} from './error-handler'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

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
    const context: ErrorContext = {
      endpoint,
      method: options?.method || 'GET',
      requestData: options?.body ? (() => {
        try {
          return JSON.parse(options.body as string)
        } catch {
          return options.body
        }
      })() : undefined
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : 'Bearer test_token',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })
      
      // Handle successful responses
      if (response.ok) {
        try {
          return await response.json()
        } catch (parseError) {
          throw new AppError('Invalid JSON response from server', 'PARSE_ERROR', 500, undefined, context)
        }
      }
      
      // Handle error responses
      let errorData: any
      try {
        errorData = await response.json()
      } catch {
        // If response body is not JSON, create error from status
        const error = parseAPIError(response, context)
        logError(error)
        throw error
      }
      
      const error = parseAPIError(errorData, context)
      logError(error)
      throw error
      
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new NetworkError('Unable to connect to server', context)
        logError(networkError)
        throw networkError
      }
      
      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error
      }
      
      // Handle other errors
      const appError = parseAPIError(error, context)
      logError(appError)
      throw appError
    }
  }

  private async requestWithRetry<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const context: ErrorContext = {
      endpoint,
      method: options?.method || 'GET'
    }

    return withRetry(
      () => this.request<T>(endpoint, options),
      3, // maxRetries
      1000, // delay
      context
    )
  }

  // AI Insights (from Railway database)
  async getTradingInsights(accountId: string): Promise<PatternInsight[]> {
    return this.requestWithRetry(`/api/v1/analytics/insights/${accountId}`)
  }

  // Time Analysis
  async getTimeAnalysis(accountId: string): Promise<TimeAnalysis[]> {
    return this.requestWithRetry(`/api/v1/analytics/time-analysis/${accountId}`)
  }

  // Pair Analysis
  async getPairAnalysis(accountId: string): Promise<PairAnalysis[]> {
    return this.requestWithRetry(`/api/v1/analytics/pair-analysis/${accountId}`)
  }

  // Heatmaps
  async getHourlyHeatmap(accountId: string): Promise<HeatmapData> {
    return this.requestWithRetry(`/api/v1/analytics/heatmap/hourly/${accountId}`)
  }

  async getDailyHeatmap(accountId: string): Promise<HeatmapData> {
    return this.requestWithRetry(`/api/v1/analytics/heatmap/daily/${accountId}`)
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

  async verifyEmail(token: string): Promise<{ message: string; user?: any }> {
    return this.request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    })
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    return this.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    })
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request('/health')
  }
}

export const quantaAPI = new QuantaViewAPI()

export type { PatternInsight, TimeAnalysis, PairAnalysis, HeatmapData, TradingAccount, Trade }