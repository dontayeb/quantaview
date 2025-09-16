-- Create users profile table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Update trading_accounts table to include user ownership
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS trading_accounts CASCADE;

-- Recreate trading_accounts with user ownership
CREATE TABLE trading_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_number bigint NOT NULL,
    account_name text NOT NULL,
    password text NOT NULL,
    server text NOT NULL,
    broker text,
    currency text DEFAULT 'USD',
    account_type text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, account_number) -- Account numbers must be unique per user
);

-- Recreate deals table
CREATE TABLE deals (
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
    UNIQUE(trading_account_id, deal_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- RLS Policies for trading_accounts
CREATE POLICY "Users can view own trading accounts" 
ON trading_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading accounts" 
ON trading_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading accounts" 
ON trading_accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trading accounts" 
ON trading_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for deals
CREATE POLICY "Users can view deals from own accounts" 
ON deals FOR SELECT 
USING (
    trading_account_id IN (
        SELECT id FROM trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert deals to own accounts" 
ON deals FOR INSERT 
WITH CHECK (
    trading_account_id IN (
        SELECT id FROM trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update deals from own accounts" 
ON deals FOR UPDATE 
USING (
    trading_account_id IN (
        SELECT id FROM trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete deals from own accounts" 
ON deals FOR DELETE 
USING (
    trading_account_id IN (
        SELECT id FROM trading_accounts WHERE user_id = auth.uid()
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_account_number ON trading_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_deals_trading_account_id ON deals(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(type);
CREATE INDEX IF NOT EXISTS idx_deals_time ON deals(time);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();