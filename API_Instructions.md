# QuantaView API Integration Guide

## Overview

QuantaView provides a secure API system for automated trading data synchronization between MT4/MT5 and your QuantaView dashboard. This guide covers API key management and Expert Advisor (EA) integration.

## 🔐 Security Model

### API Key Features
- **Scoped Permissions**: Keys only have access to specific functions
- **Cryptographically Secure**: Generated using secure random algorithms
- **Hashed Storage**: Plain keys are never stored in our database
- **Rate Limited**: 100 requests/minute, 1000 requests/hour
- **Expirable**: Default 1-year expiration (configurable)
- **Revokable**: Instant deactivation capability

### Important Security Notes
- ⚠️ **API keys CANNOT access your trading account or place trades**
- ⚠️ **API keys CANNOT modify account settings or withdraw funds**
- ✅ **API keys can ONLY upload trade history data**
- ✅ **You maintain full control with instant revocation**

## 📊 Available API Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `trades:write` | Upload trade data to your accounts | EA Integration |
| `trades:read` | Read trade history and data | External Dashboards |
| `account:read` | Read account information and settings | General Integration |
| `analytics:read` | Access trading analytics and insights | Reporting Tools |

### Scope Presets

#### EA Integration
**Scopes**: `trades:write`, `account:read`
**Best for**: MT4/MT5 Expert Advisors that sync trading history

#### Read Only Access  
**Scopes**: `trades:read`, `account:read`, `analytics:read`
**Best for**: External dashboards and analytics tools

## 🎯 Getting Started

### Step 1: Create an API Key

1. **Access API Keys Page**
   - Click your username in the top-right corner
   - Select "API Keys" from the dropdown menu

2. **Create New Key**
   - Click "Create API Key" button
   - Enter a descriptive name (e.g., "My EA Integration")
   - Select "EA Integration" preset for MT4/MT5 sync
   - Set expiration (default: 365 days)
   - Click "Create API Key"

3. **Save Your Key**
   - ⚠️ **IMPORTANT**: Copy the API key immediately
   - The full key will never be shown again
   - Store it securely in your EA settings

### Step 2: EA Integration

#### Download and Install EA

1. **Get the EA Code**
   - Copy the QuantaView EA code from the dashboard
   - Save as `QuantaViewEA.mq4` in your MT4 `MQL4/Experts` folder
   - Compile the EA in MetaEditor

2. **Configure EA Settings**
   ```mql
   // Required Settings
   QuantaViewAPIKey = "qv_your_api_key_here"
   TradingAccountID = "your-trading-account-id"
   
   // Optional Settings
   APIBaseURL = "https://api.quantaview.com"
   EnableHistoricalSync = true
   EnableRealTimeSync = true
   BatchSize = 100
   ```

3. **Enable Auto Trading**
   - Click "Auto Trading" button in MT4 toolbar (should be green)
   - Go to Tools → Options → Expert Advisors
   - Check "Allow automated trading"
   - Check "Allow WebRequest for following URLs"
   - Add: `https://api.quantaview.com`

4. **Attach EA to Chart**
   - Drag QuantaView EA to any chart
   - Configure settings in the popup dialog
   - Click "OK" to start syncing

## 🔄 How Synchronization Works

### Initial Historical Sync
1. **EA scans all historical trades** in your MT4/MT5 account
2. **Uploads in batches** of 100 trades (rate limited)
3. **Duplicate detection** prevents data duplication
4. **Progress shown** in MT4 Experts tab
5. **One-time process** - only runs on first connection

### Real-Time Sync
1. **Monitors new trades** as they close
2. **Immediate upload** of each completed trade
3. **Automatic retry** on connection issues
4. **Background operation** - no impact on trading

### Data Format
```json
{
  "ticket": 12345,
  "symbol": "EURUSD",
  "trade_type": "buy",
  "volume": 0.10,
  "open_time": "2024-01-15T10:30:00",
  "open_price": 1.1234,
  "close_time": "2024-01-15T11:30:00", 
  "close_price": 1.1244,
  "profit": 10.00,
  "commission": -0.70,
  "swap": -0.15,
  "comment": "Manual trade"
}
```

## 🛠️ API Endpoints

### Authentication
All API requests require authentication via API key:

**Header Method:**
```http
X-API-Key: qv_your_api_key_here
```

**Bearer Token Method:**
```http
Authorization: Bearer qv_your_api_key_here
```

### Bulk Trade Import
```http
POST /api/v1/bulk-trades/import/{trading_account_id}
Content-Type: application/json
X-API-Key: qv_your_api_key_here

[
  {
    "ticket": 12345,
    "symbol": "EURUSD",
    "trade_type": "buy",
    "volume": 0.10,
    "open_time": "2024-01-15T10:30:00Z",
    "open_price": 1.1234,
    "close_time": "2024-01-15T11:30:00Z",
    "close_price": 1.1244,
    "profit": 10.00,
    "commission": -0.70,
    "swap": -0.15,
    "comment": "Manual trade"
  }
]
```

**Response:**
```json
{
  "success": true,
  "total_submitted": 1,
  "imported": 1,
  "duplicates": 0,
  "errors": 0,
  "message": "Successfully imported 1 trades"
}
```

### Sync Status Check
```http
GET /api/v1/bulk-trades/status/{trading_account_id}
X-API-Key: qv_your_api_key_here
```

**Response:**
```json
{
  "trading_account_id": "uuid-here",
  "total_trades": 1250,
  "latest_trade_time": "2024-01-15T15:30:00Z",
  "latest_trade_ticket": 98765,
  "account_active": true,
  "last_sync": "2024-01-15T15:31:00Z"
}
```

## 🔧 Troubleshooting

### Common Issues

#### EA Not Syncing
1. **Check Auto Trading**: Ensure auto trading is enabled (green button)
2. **Check WebRequest URLs**: Verify `https://api.quantaview.com` is allowed
3. **Check Internet Connection**: EA requires internet access
4. **Check API Key**: Verify key is correct and not expired
5. **Check Experts Tab**: Look for error messages in MT4

#### API Key Issues
1. **Invalid Format Error**: Ensure key starts with `qv_` and is 35 characters
2. **401 Unauthorized**: Key may be revoked or expired
3. **403 Forbidden**: Key lacks required permissions
4. **429 Rate Limited**: Too many requests, wait 1 minute

#### Duplicate Trade Warnings
- **Normal behavior**: EA prevents importing the same trade twice
- **Safe to ignore**: Duplicates are automatically skipped
- **Historical context**: Useful when restarting EA after connection issues

### Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check API key validity |
| 403 | Forbidden | Verify key has required scopes |
| 404 | Not Found | Check trading account ID |
| 429 | Rate Limited | Wait 1 minute, reduce request frequency |
| 500 | Server Error | Temporary issue, retry in a few minutes |

## 📈 Best Practices

### API Key Management
- ✅ **Use descriptive names** for your API keys
- ✅ **Create separate keys** for different applications
- ✅ **Monitor expiration dates** and renew before expiry
- ✅ **Revoke unused keys** immediately
- ✅ **Use minimum required scopes** for each integration

### EA Integration
- ✅ **Test with demo account first** before live trading
- ✅ **Monitor initial sync progress** in Experts tab
- ✅ **Keep EA running continuously** for real-time sync
- ✅ **Use stable internet connection** for reliable uploads
- ✅ **Update EA code** when new versions are released

### Security Best Practices
- 🔒 **Never share API keys** with anyone
- 🔒 **Don't commit keys to version control** (Git repositories)
- 🔒 **Use environment variables** in production systems
- 🔒 **Rotate keys regularly** (every 6-12 months)
- 🔒 **Monitor API usage** for suspicious activity

## 🆘 Support

### Getting Help
1. **Check Experts Tab**: Look for EA error messages in MT4/MT5
2. **Verify Settings**: Double-check API key and account ID
3. **Test API Connection**: Use sync status endpoint to verify connectivity
4. **Review Documentation**: Ensure proper setup steps were followed

### Contact Information
- **Dashboard**: Check your QuantaView dashboard for sync status
- **API Status**: Monitor real-time sync in the AI insights section
- **Error Logs**: EA errors appear in MT4/MT5 Experts tab

## 📝 Example EA Code

Here's the complete QuantaView EA code for MT4/MT5 integration:

```mql
//+------------------------------------------------------------------+
//|                                            QuantaView EA v1.0.mq4 |
//|                                   Automated Trading History Sync |
//+------------------------------------------------------------------+

#property strict

// Input parameters
input string QuantaViewAPIKey = "qv_your_api_key_here";
input string TradingAccountID = "your-account-id-here";
input string APIBaseURL = "https://api.quantaview.com";
input bool EnableHistoricalSync = true;
input bool EnableRealTimeSync = true;
input int BatchSize = 100;

bool hasInitialSyncCompleted = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
    Print("QuantaView EA initialized");
    
    // Validate settings
    if(StringLen(QuantaViewAPIKey) < 10) {
        Alert("Please set your QuantaView API key in EA settings");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    if(StringLen(TradingAccountID) < 10) {
        Alert("Please set your Trading Account ID in EA settings");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    // Start historical sync if enabled
    if(EnableHistoricalSync && !hasInitialSyncCompleted) {
        Print("Starting historical trade sync...");
        SyncHistoricalTrades();
    }
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Trade event handler                                              |
//+------------------------------------------------------------------+
void OnTrade() {
    if(EnableRealTimeSync && hasInitialSyncCompleted) {
        // Get the most recent trade
        if(HistorySelect(0, TimeCurrent())) {
            int total = HistoryOrdersTotal();
            if(total > 0) {
                ulong ticket = HistoryOrderGetTicket(total - 1);
                SendTradeToQuantaView(ticket);
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Sync all historical trades                                       |
//+------------------------------------------------------------------+
void SyncHistoricalTrades() {
    if(!HistorySelect(0, TimeCurrent())) {
        Print("Failed to select history");
        return;
    }
    
    int totalTrades = HistoryOrdersTotal();
    Print("Found ", totalTrades, " historical trades to sync");
    
    string tradesJSON = "";
    int count = 0;
    
    for(int i = 0; i < totalTrades; i++) {
        ulong ticket = HistoryOrderGetTicket(i);
        if(ticket > 0) {
            string tradeJSON = FormatTradeJSON(ticket);
            if(StringLen(tradeJSON) > 0) {
                if(count > 0) tradesJSON += ",";
                tradesJSON += tradeJSON;
                count++;
                
                // Send in batches
                if(count >= BatchSize) {
                    SendBatchToQuantaView("[" + tradesJSON + "]");
                    tradesJSON = "";
                    count = 0;
                    Sleep(1000); // Rate limiting
                }
            }
        }
    }
    
    // Send remaining trades
    if(count > 0) {
        SendBatchToQuantaView("[" + tradesJSON + "]");
    }
    
    hasInitialSyncCompleted = true;
    Print("Historical sync completed");
}

//+------------------------------------------------------------------+
//| Format single trade as JSON                                      |
//+------------------------------------------------------------------+
string FormatTradeJSON(ulong ticket) {
    if(!HistoryOrderSelect(ticket)) return "";
    
    string symbol = HistoryOrderGetString(ticket, ORDER_SYMBOL);
    double volume = HistoryOrderGetDouble(ticket, ORDER_VOLUME_CURRENT);
    datetime openTime = (datetime)HistoryOrderGetInteger(ticket, ORDER_TIME_SETUP);
    double openPrice = HistoryOrderGetDouble(ticket, ORDER_PRICE_OPEN);
    datetime closeTime = (datetime)HistoryOrderGetInteger(ticket, ORDER_TIME_DONE);
    double closePrice = HistoryOrderGetDouble(ticket, ORDER_PRICE_CURRENT);
    double profit = HistoryOrderGetDouble(ticket, ORDER_PROFIT);
    double commission = HistoryOrderGetDouble(ticket, ORDER_COMMISSION);
    double swap = HistoryOrderGetDouble(ticket, ORDER_SWAP);
    string comment = HistoryOrderGetString(ticket, ORDER_COMMENT);
    ENUM_ORDER_TYPE orderType = (ENUM_ORDER_TYPE)HistoryOrderGetInteger(ticket, ORDER_TYPE);
    
    string tradeType = (orderType == ORDER_TYPE_BUY) ? "buy" : "sell";
    
    string json = StringFormat(
        "{\"ticket\":%d,\"symbol\":\"%s\",\"trade_type\":\"%s\",\"volume\":%.2f," +
        "\"open_time\":\"%s\",\"open_price\":%.5f,\"close_time\":\"%s\",\"close_price\":%.5f," +
        "\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"comment\":\"%s\"}",
        ticket, symbol, tradeType, volume,
        TimeToString(openTime, TIME_DATE|TIME_SECONDS),
        openPrice,
        TimeToString(closeTime, TIME_DATE|TIME_SECONDS),
        closePrice,
        profit, commission, swap, comment
    );
    
    return json;
}

//+------------------------------------------------------------------+
//| Send batch of trades to QuantaView API                          |
//+------------------------------------------------------------------+
void SendBatchToQuantaView(string tradesJSON) {
    string url = APIBaseURL + "/api/v1/bulk-trades/import/" + TradingAccountID;
    string headers = "X-API-Key: " + QuantaViewAPIKey + "\r\n";
    headers += "Content-Type: application/json\r\n";
    
    char data[];
    char result[];
    string resultStr;
    
    StringToCharArray(tradesJSON, data, 0, StringLen(tradesJSON));
    
    int res = WebRequest("POST", url, headers, 5000, data, result, resultStr);
    
    if(res == 200) {
        Print("Successfully sent batch to QuantaView");
    } else {
        Print("Failed to send batch: ", res, " - ", resultStr);
    }
}

//+------------------------------------------------------------------+
//| Send single trade to QuantaView                                 |
//+------------------------------------------------------------------+
void SendTradeToQuantaView(ulong ticket) {
    string tradeJSON = FormatTradeJSON(ticket);
    if(StringLen(tradeJSON) > 0) {
        SendBatchToQuantaView("[" + tradeJSON + "]");
    }
}
```

## 📄 License and Terms

### API Usage Terms
- API keys are provided for legitimate trading analytics purposes
- Rate limits are enforced to ensure service availability
- Abuse of the API may result in key revocation
- QuantaView reserves the right to modify API terms with notice

### Data Privacy
- Trade data is transmitted securely via HTTPS
- API keys are stored using industry-standard encryption
- No sensitive account information is transmitted or stored
- Users maintain full ownership of their trading data

---

**Last Updated**: January 2025
**Version**: 1.0
**API Version**: v1