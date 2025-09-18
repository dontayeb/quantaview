# QuantaView EA Setup Guide

## Overview
The QuantaView EA automatically sends your completed trades from MT4/MT5 to your QuantaView dashboard in real-time using the Railway backend API.

## Setup Steps

### 1. Dashboard Setup
1. Open your QuantaView dashboard at `https://your-frontend.railway.app`
2. Register and verify your email account
3. Click "Add Account" 
4. Enter your MT4/MT5 account details:
   - **Account Number**: Must match your MT4/MT5 account exactly (e.g., 12345678)
   - **Account Name**: Any name you want (e.g., "Live Account")
   - **Server**: Your broker's server name
   - **Currency**: Account base currency (USD, EUR, etc.)
5. Copy the **Trading Account ID** from the dashboard

### 2. API Key Generation
1. In the dashboard, go to **API Keys** section
2. Click **"Create New API Key"**
3. Select **"EA Integration"** preset
4. Copy the generated API key (starts with `qv_`)

### 3. MT4 EA Configuration
1. Open the `QuantaViewEA.mq4` file in MetaEditor
2. Configure the input parameters:
   ```mql4
   input string QuantaViewAPIKey = "qv_your_actual_api_key_here";
   input string TradingAccountID = "your-trading-account-id-from-dashboard";
   input string APIBaseURL = "https://grateful-mindfulness-production-868e.up.railway.app";
   ```

### 4. MT4 WebRequest Setup
1. In MT4: **Tools** → **Options** → **Expert Advisors** 
2. Click the **WebRequest** tab
3. Check "Allow WebRequest for listed URL"
4. Add the Railway backend URL: `https://grateful-mindfulness-production-868e.up.railway.app`
5. Click **OK** and restart MT4

### 5. Install EA in MT4
1. Copy `QuantaViewEA.mq4` to your MT4 **MQL4/Experts** folder
2. Compile the EA (F7 in MetaEditor)
3. Drag the EA onto any chart
4. Configure parameters in the EA settings dialog
5. Enable auto-trading and live trading
6. Check the **Experts** tab for initialization messages

## How It Works

1. **Historical Sync**: On first run, imports all your trading history
2. **Real-time Monitoring**: Detects new completed trades automatically  
3. **Data Collection**: Gathers all trade details (entry, exit, P&L, etc.)
4. **API Authentication**: Uses secure API key authentication
5. **Batch Processing**: Sends trades efficiently to Railway backend
6. **Real-time Display**: Trades appear immediately in your dashboard

## Troubleshooting

### "Invalid API key" error
- Verify your API key starts with `qv_` and is copied correctly
- Check that the API key has `trades:write` permission
- Generate a new API key if needed

### "Trading account not found" error  
- Make sure the Trading Account ID from dashboard matches exactly
- Verify the account is marked as "Active" in the dashboard
- Check that account number in dashboard matches your MT4 account

### "WebRequest failed" error
- Check that Railway URL is added to MT4 WebRequest whitelist
- Verify you have internet connection
- Ensure Railway backend is running

### EA not detecting trades
- Make sure the EA is running (green smiley face icon)
- Check that auto-trading is enabled
- Verify EA is attached to a chart with active symbol
- Look for error messages in Experts tab

## Verification

After setup, close a trade in MT4 and check:
1. **MT4 Experts Tab**: Should show "✅ Successfully sent batch to QuantaView"
2. **QuantaView Dashboard**: Trade should appear immediately in your trades list
3. **Charts/Metrics**: Should update with new trade data

For historical sync, check the initialization process:
1. **First Run**: EA will sync all historical trades automatically
2. **Progress**: Monitor Experts tab for batch sync progress
3. **Completion**: Should show "🎉 Historical sync completed!"

## Support

The EA logs all activity to the MT4 **Experts** tab. Check there for success/error messages to troubleshoot any issues.

## EA Features

- ✅ **Historical Import**: Automatically imports all past trading history on first run
- ✅ **Real-time Sync**: Detects and syncs new trades as they close
- ✅ **Batch Processing**: Efficient handling of large trade volumes  
- ✅ **Rate Limiting**: Built-in delays to respect API limits
- ✅ **Error Recovery**: Detailed error messages and retry logic
- ✅ **Progress Tracking**: Shows sync progress and completion status
- ✅ **Railway Integration**: Optimized for Railway backend deployment