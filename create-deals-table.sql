-- Create the deals table only
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
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(type);
CREATE INDEX IF NOT EXISTS idx_deals_time ON deals(time);