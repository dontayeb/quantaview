-- Railway PostgreSQL Database Schema Migration
-- This creates the complete QuantaView database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table (for Supabase auth compatibility)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (for Railway auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trading_accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    account_number BIGINT NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    server VARCHAR(255) NOT NULL,
    broker VARCHAR(255),
    currency VARCHAR(10) NOT NULL,
    account_type VARCHAR(50),
    starting_balance DECIMAL(15,2) NOT NULL,
    balance DECIMAL(15,2),
    equity DECIMAL(15,2),
    free_margin DECIMAL(15,2),
    margin_level DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_number)
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
    
    -- Trade identification
    position INTEGER,
    ticket BIGINT,
    magic_number INTEGER, -- EA/Algorithm identifier
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL, -- 'buy' or 'sell'
    
    -- Trade metrics
    volume DECIMAL(10,2) NOT NULL, -- Lot size
    open_price DECIMAL(12,5) NOT NULL,
    close_price DECIMAL(12,5),
    stop_loss DECIMAL(12,5),
    take_profit DECIMAL(12,5),
    
    -- Financial results
    profit DECIMAL(12,2) DEFAULT 0.0,
    commission DECIMAL(12,2) DEFAULT 0.0,
    swap DECIMAL(12,2) DEFAULT 0.0,
    
    -- Timing
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    close_time TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create deals table (legacy compatibility)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
    deal_id BIGINT NOT NULL,
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    volume DECIMAL(10,2) NOT NULL,
    price DECIMAL(12,5) NOT NULL,
    order_id BIGINT,
    commission DECIMAL(12,2) DEFAULT 0.0,
    fee DECIMAL(12,2) DEFAULT 0.0,
    swap DECIMAL(12,2) DEFAULT 0.0,
    profit DECIMAL(12,2) DEFAULT 0.0,
    balance DECIMAL(15,2),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trading_algorithms table
CREATE TABLE IF NOT EXISTS trading_algorithms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    magic_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_magic UNIQUE(user_id, magic_number)
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_trading_account_id ON trades(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_type ON trades(type);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON trades(close_time);
CREATE INDEX IF NOT EXISTS idx_trades_magic_number ON trades(magic_number);

CREATE INDEX IF NOT EXISTS idx_deals_trading_account_id ON deals(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_time ON deals(time);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_algorithms_user_id ON trading_algorithms(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_algorithms_magic_number ON trading_algorithms(magic_number);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update triggers (drop and recreate to handle existing triggers)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_trading_accounts_updated_at ON trading_accounts;
DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
DROP TRIGGER IF EXISTS update_trading_algorithms_updated_at ON trading_algorithms;
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_accounts_updated_at BEFORE UPDATE ON trading_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_algorithms_updated_at BEFORE UPDATE ON trading_algorithms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a test user (optional)
INSERT INTO user_profiles (id, email, full_name) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test@example.com', 'Test User')
ON CONFLICT (email) DO NOTHING;

COMMIT;