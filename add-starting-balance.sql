-- Add starting_balance field to trading_accounts table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.trading_accounts 
ADD COLUMN starting_balance decimal DEFAULT 10000;

-- Add a comment to document the field
COMMENT ON COLUMN public.trading_accounts.starting_balance IS 'Initial account balance for balance progression calculations';