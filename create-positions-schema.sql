-- ============================================================================
-- UPDATED SCHEMA FOR POSITIONS (COMPLETED TRADES)
-- ============================================================================
-- Run this in your Supabase SQL Editor to update the schema

-- Drop the old deals table and create a new trades table based on Positions data
-- ============================================================================
DROP TABLE IF EXISTS public.deals CASCADE;

-- Create the trades table matching Positions structure
-- ============================================================================
CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trading_account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    
    -- Position/Trade identification
    position bigint NOT NULL, -- Position ID from MT5
    ticket bigint, -- Same as position for most brokers
    
    -- Basic trade info
    symbol text NOT NULL,
    type text CHECK (type IN ('buy', 'sell')) NOT NULL,
    volume decimal NOT NULL,
    
    -- Entry details
    open_time timestamptz NOT NULL, -- First "Time" column
    open_price decimal NOT NULL, -- "Price" column
    
    -- Exit details  
    close_time timestamptz, -- Second "Time" column
    close_price decimal, -- Second "Price" column
    
    -- Risk management
    stop_loss decimal, -- "S / L" column
    take_profit decimal, -- "T / P" column
    
    -- Financial results
    commission decimal DEFAULT 0,
    swap decimal DEFAULT 0,
    profit decimal DEFAULT 0,
    
    -- Metadata
    comment text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure unique positions per account
    UNIQUE(trading_account_id, position)
);

-- Create indexes for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trades_trading_account_id ON public.trades(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_type ON public.trades(type);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON public.trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON public.trades(close_time);
CREATE INDEX IF NOT EXISTS idx_trades_profit ON public.trades(profit);

-- Enable Row Level Security
-- ============================================================================
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for trades
-- ============================================================================
CREATE POLICY "Users can view trades from own accounts" 
ON public.trades FOR SELECT 
USING (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert trades to own accounts" 
ON public.trades FOR INSERT 
WITH CHECK (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update trades from own accounts" 
ON public.trades FOR UPDATE 
USING (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete trades from own accounts" 
ON public.trades FOR DELETE 
USING (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

-- ============================================================================
-- SCHEMA UPDATE COMPLETE!
-- ============================================================================
-- The trades table now matches the Positions section structure:
-- 1. Two time columns: open_time and close_time  
-- 2. Two price columns: open_price and close_price
-- 3. Position ID as the main identifier
-- 4. Stop loss and take profit levels
-- 5. Commission, swap, and profit tracking
-- ============================================================================