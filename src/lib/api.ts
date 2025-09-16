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

class QuantaViewAPI {
  private baseUrl: string

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // AI Insights
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

  // Health Check
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request('/health')
  }
}

export const quantaAPI = new QuantaViewAPI()

export type { PatternInsight, TimeAnalysis, PairAnalysis, HeatmapData }