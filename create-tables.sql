-- Create the trades table
CREATE TABLE IF NOT EXISTS trades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket bigint UNIQUE NOT NULL,
    symbol text NOT NULL,
    type text CHECK (type IN ('buy', 'sell')) NOT NULL,
    volume decimal NOT NULL,
    open_price decimal NOT NULL,
    close_price decimal,
    open_time timestamptz,
    close_time timestamptz,
    profit decimal DEFAULT 0,
    commission decimal DEFAULT 0,
    swap decimal DEFAULT 0,
    comment text,
    magic integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create the accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    account_number bigint UNIQUE NOT NULL,
    balance decimal NOT NULL DEFAULT 0,
    equity decimal NOT NULL DEFAULT 0,
    margin decimal NOT NULL DEFAULT 0,
    free_margin decimal NOT NULL DEFAULT 0,
    margin_level decimal NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    server text NOT NULL,
    company text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id bigint UNIQUE NOT NULL,
    open_time timestamptz,
    symbol text NOT NULL,
    type text NOT NULL,
    volume text,
    price decimal,
    stop_loss decimal,
    take_profit decimal,
    time timestamptz,
    state text,
    comment text,
    created_at timestamptz DEFAULT now()
);

-- Create the deals table
CREATE TABLE IF NOT EXISTS deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id bigint UNIQUE NOT NULL,
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
    created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_type ON trades(type);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON trades(close_time);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(type);
CREATE INDEX IF NOT EXISTS idx_deals_time ON deals(time);