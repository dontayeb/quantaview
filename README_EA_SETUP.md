# QuantaView EA Setup Guide

## Overview
The QuantaView EA automatically sends your completed trades from MT5 to your QuantaView dashboard in real-time.

## Setup Steps

### 1. Database Setup
```sql
-- First, run this in your Supabase SQL Editor:
-- (Copy contents of insert_trade_from_mt5.sql)
```

### 2. Dashboard Setup
1. Open your QuantaView dashboard at `http://localhost:3000`
2. Login to your account
3. Click "Add Account" 
4. Enter your MT5 account details:
   - **Account Number**: Must match your MT5 account exactly (e.g., 12345678)
   - **Account Name**: Any name you want (e.g., "Live Account")
   - **Server**: Your broker's server name
   - **Currency**: Account base currency (USD, EUR, etc.)

### 3. MT5 EA Configuration
1. Open the `quanta.mq5` file
2. Add your Supabase credentials:
   ```mql5
   #define SUPABASE_URL    "https://your-project.supabase.co"
   #define SUPABASE_ANON_KEY "your-anon-key-here"
   ```

### 4. MT5 WebRequest Setup
1. In MT5: **Tools** → **Options** → **Expert Advisors** 
2. Click the **WebRequest** tab
3. Check "Allow WebRequest for listed URL"
4. Add your Supabase URL: `https://your-project.supabase.co`
5. Click **OK**

### 5. Install EA in MT5
1. Copy `quanta.mq5` to your MT5 **MQL5/Experts** folder
2. Compile the EA (F7 in MetaEditor)
3. Drag the EA onto any chart
4. Allow auto-trading and live trading
5. Check the **Experts** tab for initialization messages

## How It Works

1. **Trade Detection**: EA monitors for completed trades every 10 seconds
2. **Data Collection**: Gathers all trade details (entry, exit, P&L, etc.)
3. **Account Matching**: Finds your dashboard account by MT5 account number
4. **Data Sync**: Sends trade to dashboard via secure API call
5. **Real-time Display**: Trade appears immediately in your dashboard

## Troubleshooting

### "Trading account not found" error
- Make sure the account number in your dashboard exactly matches your MT5 account
- Verify the account is marked as "Active" in the dashboard

### "WebRequest failed" error
- Check that your Supabase URL is added to MT5 WebRequest whitelist
- Verify your Supabase credentials are correct
- Ensure you have internet connection

### EA not detecting trades
- Make sure the EA is running (green smiley face icon)
- Check that auto-trading is enabled
- Verify EA is attached to a chart with active symbol

## Verification

After setup, close a trade in MT5 and check:
1. **MT5 Experts Tab**: Should show "SUCCESS: Trade sent to dashboard"
2. **QuantaView Dashboard**: Trade should appear immediately in your trades list
3. **Charts/Metrics**: Should update with new trade data

## Support

The EA logs all activity to the MT5 **Experts** tab. Check there for success/error messages to troubleshoot any issues.