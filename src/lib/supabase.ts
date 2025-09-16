import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface TradingAccount {
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

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  trading_account_id: string
  position: number
  ticket?: number
  symbol: string
  type: 'buy' | 'sell'
  volume: number
  open_time: string
  open_price: number
  close_time?: string
  close_price?: number
  stop_loss?: number
  take_profit?: number
  commission: number
  swap: number
  profit: number
  comment?: string
  created_at: string
  updated_at: string
}

// Legacy interface for backward compatibility
export interface Deal {
  id: string
  trading_account_id: string
  deal_id: number
  time: string
  symbol: string
  type: string
  direction: string
  volume: number
  price: number
  order_id?: number
  commission: number
  fee: number
  swap: number
  profit: number
  balance?: number
  comment: string
  created_at: string
}