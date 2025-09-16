-- Create the trading_accounts table (user account info)
CREATE TABLE IF NOT EXISTS trading_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    account_number bigint UNIQUE NOT NULL,
    account_name text NOT NULL,
    password text NOT NULL,
    server text NOT NULL,
    broker text,
    currency text DEFAULT 'USD',
    account_type text, -- demo, live, etc.
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create the deals table (linked to trading accounts)
CREATE TABLE IF NOT EXISTS deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trading_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    deal_id bigint NOT NULL,
    time timestamptz,
    symbol text,
    type text,
    direction text,
    volume decimal,
    price decimal,
    order_id bigint,
    commission decimal DEFAULT 0,
    fee decimal DEFAULT 0,
    swap decimal DEFAULT 0,
    profit decimal DEFAULT 0,
    balance decimal,
    comment text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(trading_account_id, deal_id) -- Unique per account
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trading_accounts_account_number ON trading_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_deals_trading_account_id ON deals(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(type);
CREATE INDEX IF NOT EXISTS idx_deals_time ON deals(time);