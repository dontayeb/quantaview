-- ============================================================================
-- SUPABASE FUNCTION: insert_trade_from_mt5
-- ============================================================================
-- This function receives trade data from MT5 EA and inserts it into the trades table
-- It automatically finds the correct trading_account_id based on account_number
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_trade_from_mt5(
    trade_position bigint,
    ticket bigint,
    symbol text,
    trade_type text,
    volume decimal,
    open_time timestamptz,
    open_price decimal,
    close_time timestamptz,
    close_price decimal,
    account_number bigint,
    stop_loss decimal DEFAULT NULL,
    take_profit decimal DEFAULT NULL,
    commission decimal DEFAULT 0,
    swap decimal DEFAULT 0,
    profit decimal DEFAULT 0,
    comment text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trading_account_id uuid;
    v_trade_id uuid;
    v_result json;
BEGIN
    -- Find the trading account by account_number
    SELECT id INTO v_trading_account_id 
    FROM public.trading_accounts 
    WHERE trading_accounts.account_number = insert_trade_from_mt5.account_number 
      AND trading_accounts.is_active = true
    LIMIT 1;
    
    -- Check if trading account exists
    IF v_trading_account_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Trading account not found',
            'message', 'No active trading account found with account number: ' || account_number,
            'account_number', account_number
        );
    END IF;
    
    -- Insert the trade with conflict handling
    INSERT INTO public.trades (
        trading_account_id,
        position,
        ticket,
        symbol,
        type,
        volume,
        open_time,
        open_price,
        close_time,
        close_price,
        stop_loss,
        take_profit,
        commission,
        swap,
        profit,
        comment,
        updated_at
    ) VALUES (
        v_trading_account_id,
        trade_position,
        ticket,
        symbol,
        trade_type,
        volume,
        open_time,
        open_price,
        close_time,
        close_price,
        stop_loss,
        take_profit,
        commission,
        swap,
        profit,
        comment,
        now()
    )
    ON CONFLICT (trading_account_id, position) 
    DO UPDATE SET
        ticket = EXCLUDED.ticket,
        symbol = EXCLUDED.symbol,
        type = EXCLUDED.type,
        volume = EXCLUDED.volume,
        open_time = EXCLUDED.open_time,
        open_price = EXCLUDED.open_price,
        close_time = EXCLUDED.close_time,
        close_price = EXCLUDED.close_price,
        stop_loss = EXCLUDED.stop_loss,
        take_profit = EXCLUDED.take_profit,
        commission = EXCLUDED.commission,
        swap = EXCLUDED.swap,
        profit = EXCLUDED.profit,
        comment = EXCLUDED.comment,
        updated_at = now()
    RETURNING id INTO v_trade_id;
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', 'Trade inserted/updated successfully',
        'trade_id', v_trade_id,
        'trading_account_id', v_trading_account_id,
        'position', trade_position,
        'symbol', symbol,
        'profit', profit
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error response
    RETURN json_build_object(
        'success', false,
        'error', 'Database error',
        'message', SQLERRM,
        'position', trade_position,
        'account_number', account_number
    );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow anonymous access (since MT5 EA uses anon key)
GRANT EXECUTE ON FUNCTION public.insert_trade_from_mt5 TO anon;
GRANT EXECUTE ON FUNCTION public.insert_trade_from_mt5 TO authenticated;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Update your MT5 EA with your Supabase URL and anon key
-- 3. The EA will automatically call this function when trades close
-- 4. The function finds the right trading account and inserts the trade
-- 5. Check the trades table in your dashboard to see real-time data!
-- ============================================================================