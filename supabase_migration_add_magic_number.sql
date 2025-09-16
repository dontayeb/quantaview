-- Add magic_number column to trades table
-- This column is used to identify trades that belong to specific Expert Advisors (EAs) or trading algorithms

ALTER TABLE trades 
ADD COLUMN magic_number INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN trades.magic_number IS 'EA/Algorithm identifier - used to link trades to specific Expert Advisors or trading algorithms';

-- Optional: Create an index for better query performance when filtering by magic_number
CREATE INDEX IF NOT EXISTS idx_trades_magic_number ON trades(magic_number);