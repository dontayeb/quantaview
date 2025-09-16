-- ============================================================================
-- SUPABASE AUTHENTICATION SCHEMA SETUP
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- This sets up user profiles, trading accounts, and deals with proper RLS

-- 1. Create users profile table (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Drop existing tables if they exist (to recreate with user ownership)
-- ============================================================================
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.trading_accounts CASCADE;

-- 3. Create trading_accounts table with user ownership
-- ============================================================================
CREATE TABLE public.trading_accounts (
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
    UNIQUE(user_id, account_number)
);

-- 4. Create deals table
-- ============================================================================
CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trading_account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
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

-- 5. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for user_profiles
-- ============================================================================
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 7. Create RLS Policies for trading_accounts
-- ============================================================================
CREATE POLICY "Users can view own trading accounts" 
ON public.trading_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading accounts" 
ON public.trading_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading accounts" 
ON public.trading_accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trading accounts" 
ON public.trading_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Create RLS Policies for deals
-- ============================================================================
CREATE POLICY "Users can view deals from own accounts" 
ON public.deals FOR SELECT 
USING (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert deals to own accounts" 
ON public.deals FOR INSERT 
WITH CHECK (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update deals from own accounts" 
ON public.deals FOR UPDATE 
USING (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete deals from own accounts" 
ON public.deals FOR DELETE 
USING (
    trading_account_id IN (
        SELECT id FROM public.trading_accounts WHERE user_id = auth.uid()
    )
);

-- 9. Create indexes for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_account_number ON public.trading_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_deals_trading_account_id ON public.deals(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON public.deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_type ON public.deals(type);
CREATE INDEX IF NOT EXISTS idx_deals_time ON public.deals(time);

-- 10. Function to automatically create user profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for new user signup
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Your authentication system is now ready:
-- 1. Users can register and login
-- 2. Each user has isolated data (RLS enabled)
-- 3. Users can add multiple trading accounts
-- 4. Deals are linked to user accounts
-- 5. All data is properly secured
-- ============================================================================