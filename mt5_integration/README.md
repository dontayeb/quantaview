# QuantaView MT5 Integration Setup

## Overview
This Expert Advisor (EA) connects your FTMO MT5 account to QuantaView for automatic trade sync and analytics.

## Features
- **Initial Sync**: Uploads all historical trades in batches of 100
- **Real-time Sync**: Automatically sends new closed trades
- **FTMO Compatible**: Designed specifically for FTMO prop trading accounts
- **Efficient**: Only syncs new data after initial upload

## Setup Instructions

### Step 1: Get Your QuantaView Credentials
1. **Login to QuantaView dashboard**
2. **Go to API Keys page**
3. **Create new API key** with scopes:
   - `trades:write`
   - `account:read` 
   - `analytics:read`
4. **Copy the API key** (starts with `qv_`)
5. **Copy your Account ID** from the Accounts page

### Step 2: Install the EA in MT5
1. **Download** `QuantaViewSync.mq5` 
2. **Open MT5** 
3. **Press F4** to open MetaEditor
4. **File → Open** → Select `QuantaViewSync.mq5`
5. **Press F7** to compile the EA
6. **Close MetaEditor**

### Step 3: Configure MT5 WebRequest
⚠️ **IMPORTANT**: MT5 blocks web requests by default

1. **Go to Tools → Options → Expert Advisors**
2. **Check "Allow WebRequest for listed URLs"**
3. **Add this URL**: `https://grateful-mindfulness-production-868e.up.railway.app`
4. **Click OK**

### Step 4: Attach EA to Chart
1. **Open any chart** (symbol doesn't matter)
2. **Drag QuantaViewSync EA** from Navigator to the chart
3. **Configure parameters**:
   - `ApiKey`: Your QuantaView API key
   - `AccountId`: Your QuantaView Account ID
   - `BatchSize`: 100 (recommended)
   - `SyncIntervalSeconds`: 30 (recommended)
   - `EnableLogging`: true (for testing)
4. **Click OK**

### Step 5: Verify Connection
1. **Check the Expert tab** in MT5 terminal
2. **Look for log messages**:
   - `QuantaView EA initialized for FTMO account: [your account]`
   - `Starting initial sync of all trade history...`
   - `Successfully sent trade batch to QuantaView`

## Expected Behavior

### Initial Sync (First Run)
- EA loads ALL historical deals from your account
- Sends them in batches of 100 to avoid server overload
- Progress shown in Expert tab logs
- May take 1-5 minutes depending on history size

### Ongoing Sync (After Initial)
- EA checks every 30 seconds for new closed trades
- Only sends trades closed since last sync
- Very lightweight and efficient

## Troubleshooting

### "WebRequest failed" Error
- **Cause**: URL not in allowed list
- **Fix**: Add API URL to WebRequest settings (Step 3)

### "API Key is required" Error
- **Cause**: Empty API key parameter
- **Fix**: Set ApiKey parameter when attaching EA

### "Account ID is required" Error  
- **Cause**: Empty Account ID parameter
- **Fix**: Set AccountId parameter when attaching EA

### No logs appearing
- **Cause**: EA not running or logging disabled
- **Fix**: Check EA is running (smiley face icon), enable AutoTrading

## Monitoring

### In MT5
- **Expert tab**: Shows EA logs and status
- **AutoTrading button**: Must be enabled (green)
- **EA smiley face**: Should be green on chart

### In QuantaView Dashboard
- **Trades page**: Should populate with your MT5 trades
- **Analytics**: Will update as trades are received
- **Account balance**: Will reflect MT5 account data

## Support

If you encounter issues:
1. **Check Expert tab logs** for error messages
2. **Verify API key** has correct permissions
3. **Confirm WebRequest URL** is added to MT5 settings
4. **Ensure AutoTrading** is enabled in MT5

## Files
- `QuantaViewSync.mq5`: The Expert Advisor code
- `README.md`: This setup guide

## Version
- **Version**: 1.0
- **Compatible**: MT5 build 3550+
- **Tested**: FTMO demo and live accounts