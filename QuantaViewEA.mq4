//+------------------------------------------------------------------+
//|                                            QuantaView EA v1.0.mq4 |
//|                                   Automated Trading History Sync |
//|                                    https://quantaview.com        |
//+------------------------------------------------------------------+

#property strict
#property copyright "QuantaView"
#property link      "https://quantaview.com"
#property version   "1.0"
#property description "Automatically sync trading history with QuantaView dashboard"

// Input parameters
input string QuantaViewAPIKey = "qv_your_api_key_here";        // Your QuantaView API Key
input string TradingAccountID = "your-account-id-here";        // Your Trading Account ID
input string APIBaseURL = "https://grateful-mindfulness-production-868e.up.railway.app";        // API Base URL
input bool EnableHistoricalSync = true;                        // Enable historical trade sync
input bool EnableRealTimeSync = true;                          // Enable real-time trade sync
input int BatchSize = 100;                                     // Trades per batch
input bool ShowDebugInfo = true;                              // Show debug messages

// Global variables
bool hasInitialSyncCompleted = false;
datetime lastSyncTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
    Print("=== QuantaView EA v1.0 Initialized ===");
    
    // Validate required settings
    if(StringLen(QuantaViewAPIKey) < 10) {
        Alert("❌ Please set your QuantaView API key in EA settings");
        Print("ERROR: QuantaView API key is required");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    if(StringLen(TradingAccountID) < 10) {
        Alert("❌ Please set your Trading Account ID in EA settings");
        Print("ERROR: Trading Account ID is required");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    // Validate API key format
    if(!StringFind(QuantaViewAPIKey, "qv_") == 0) {
        Alert("❌ Invalid API key format. Must start with 'qv_'");
        Print("ERROR: API key must start with 'qv_'");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    Print("✅ Configuration validated successfully");
    Print("📊 API Key: ", StringSubstr(QuantaViewAPIKey, 0, 8), "...");
    Print("🏦 Account ID: ", StringSubstr(TradingAccountID, 0, 8), "...");
    
    // Start historical sync if enabled
    if(EnableHistoricalSync && !hasInitialSyncCompleted) {
        Print("🔄 Starting historical trade synchronization...");
        SyncHistoricalTrades();
    } else {
        hasInitialSyncCompleted = true;
        Print("⏭️ Historical sync disabled or already completed");
    }
    
    if(EnableRealTimeSync) {
        Print("🔴 Real-time sync enabled");
    }
    
    Print("🚀 QuantaView EA ready for operation");
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    string reasonText = "";
    switch(reason) {
        case REASON_PROGRAM: reasonText = "Expert Advisor terminated"; break;
        case REASON_REMOVE: reasonText = "Expert Advisor removed from chart"; break;
        case REASON_RECOMPILE: reasonText = "Expert Advisor recompiled"; break;
        case REASON_CHARTCHANGE: reasonText = "Chart properties changed"; break;
        case REASON_CHARTCLOSE: reasonText = "Chart closed"; break;
        case REASON_PARAMETERS: reasonText = "Input parameters changed"; break;
        case REASON_ACCOUNT: reasonText = "Account changed"; break;
        default: reasonText = "Unknown reason"; break;
    }
    Print("🔹 QuantaView EA stopped: ", reasonText);
}

//+------------------------------------------------------------------+
//| Trade event handler                                              |
//+------------------------------------------------------------------+
void OnTrade() {
    if(!EnableRealTimeSync || !hasInitialSyncCompleted) {
        return;
    }
    
    // Wait a moment for trade to be fully processed
    Sleep(500);
    
    // Get the most recent closed trade
    if(HistorySelect(0, TimeCurrent())) {
        int total = HistoryOrdersTotal();
        if(total > 0) {
            // Check the last few trades for new ones
            for(int i = MathMax(0, total - 5); i < total; i++) {
                ulong ticket = HistoryOrderGetTicket(i);
                if(ticket > 0) {
                    datetime closeTime = (datetime)HistoryOrderGetInteger(ticket, ORDER_TIME_DONE);
                    if(closeTime > lastSyncTime) {
                        if(ShowDebugInfo) {
                            Print("📤 Syncing new trade: #", ticket);
                        }
                        SendTradeToQuantaView(ticket);
                        lastSyncTime = closeTime;
                    }
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Timer event handler                                              |
//+------------------------------------------------------------------+
void OnTimer() {
    // Periodic health check could be implemented here
    // For now, we rely on OnTrade() for real-time sync
}

//+------------------------------------------------------------------+
//| Sync all historical trades                                       |
//+------------------------------------------------------------------+
void SyncHistoricalTrades() {
    if(!HistorySelect(0, TimeCurrent())) {
        Print("❌ Failed to select trade history");
        return;
    }
    
    int totalTrades = HistoryOrdersTotal();
    Print("📈 Found ", totalTrades, " historical trades to synchronize");
    
    if(totalTrades == 0) {
        Print("ℹ️ No historical trades found");
        hasInitialSyncCompleted = true;
        return;
    }
    
    string tradesJSON = "";
    int count = 0;
    int totalSent = 0;
    int errors = 0;
    
    for(int i = 0; i < totalTrades; i++) {
        ulong ticket = HistoryOrderGetTicket(i);
        if(ticket > 0) {
            string tradeJSON = FormatTradeJSON(ticket);
            if(StringLen(tradeJSON) > 0) {
                if(count > 0) tradesJSON += ",";
                tradesJSON += tradeJSON;
                count++;
                
                // Send in batches to respect rate limits
                if(count >= BatchSize) {
                    bool success = SendBatchToQuantaView("[" + tradesJSON + "]");
                    if(success) {
                        totalSent += count;
                        Print("✅ Sent batch of ", count, " trades (Total: ", totalSent, "/", totalTrades, ")");
                    } else {
                        errors++;
                        Print("❌ Failed to send batch of ", count, " trades");
                    }
                    
                    tradesJSON = "";
                    count = 0;
                    Sleep(1000); // Rate limiting - 1 second between batches
                }
            }
        }
        
        // Show progress every 100 trades
        if((i + 1) % 100 == 0) {
            Print("🔄 Processing trade ", (i + 1), "/", totalTrades, " (", 
                  MathRound(((double)(i + 1) / totalTrades) * 100), "%)");
        }
    }
    
    // Send remaining trades
    if(count > 0) {
        bool success = SendBatchToQuantaView("[" + tradesJSON + "]");
        if(success) {
            totalSent += count;
            Print("✅ Sent final batch of ", count, " trades");
        } else {
            errors++;
            Print("❌ Failed to send final batch of ", count, " trades");
        }
    }
    
    hasInitialSyncCompleted = true;
    Print("🎉 Historical sync completed!");
    Print("📊 Summary: ", totalSent, " trades sent successfully, ", errors, " errors");
    
    if(errors > 0) {
        Alert("⚠️ Historical sync completed with ", errors, " errors. Check Experts tab for details.");
    } else {
        Alert("✅ Historical sync completed successfully! ", totalSent, " trades synchronized.");
    }
}

//+------------------------------------------------------------------+
//| Format single trade as JSON                                      |
//+------------------------------------------------------------------+
string FormatTradeJSON(ulong ticket) {
    if(!HistoryOrderSelect(ticket)) {
        if(ShowDebugInfo) {
            Print("⚠️ Could not select trade #", ticket);
        }
        return "";
    }
    
    // Get trade details
    string symbol = HistoryOrderGetString(ticket, ORDER_SYMBOL);
    double volume = HistoryOrderGetDouble(ticket, ORDER_VOLUME_CURRENT);
    datetime openTime = (datetime)HistoryOrderGetInteger(ticket, ORDER_TIME_SETUP);
    double openPrice = HistoryOrderGetDouble(ticket, ORDER_PRICE_OPEN);
    datetime closeTime = (datetime)HistoryOrderGetInteger(ticket, ORDER_TIME_DONE);
    double closePrice = HistoryOrderGetDouble(ticket, ORDER_PRICE_CURRENT);
    double profit = HistoryOrderGetDouble(ticket, ORDER_PROFIT);
    double commission = HistoryOrderGetDouble(ticket, ORDER_COMMISSION);
    double swap = HistoryOrderGetDouble(ticket, ORDER_SWAP);
    double stopLoss = HistoryOrderGetDouble(ticket, ORDER_SL);
    double takeProfit = HistoryOrderGetDouble(ticket, ORDER_TP);
    string comment = HistoryOrderGetString(ticket, ORDER_COMMENT);
    ENUM_ORDER_TYPE orderType = (ENUM_ORDER_TYPE)HistoryOrderGetInteger(ticket, ORDER_TYPE);
    
    // Convert order type to trade type
    string tradeType = "";
    if(orderType == ORDER_TYPE_BUY) {
        tradeType = "buy";
    } else if(orderType == ORDER_TYPE_SELL) {
        tradeType = "sell";
    } else {
        // Skip pending orders, we only sync executed trades
        return "";
    }
    
    // Skip trades that are still open (closeTime = 0)
    if(closeTime == 0) {
        return "";
    }
    
    // Format datetime to ISO 8601
    string openTimeStr = TimeToString(openTime, TIME_DATE|TIME_SECONDS);
    string closeTimeStr = TimeToString(closeTime, TIME_DATE|TIME_SECONDS);
    
    // Replace spaces with 'T' for ISO format
    StringReplace(openTimeStr, " ", "T");
    StringReplace(closeTimeStr, " ", "T");
    
    // Escape quotes in comment
    StringReplace(comment, "\"", "\\\"");
    
    // Build JSON
    string json = StringFormat(
        "{\"ticket\":%d,\"symbol\":\"%s\",\"trade_type\":\"%s\",\"volume\":%.2f," +
        "\"open_time\":\"%sZ\",\"open_price\":%.5f,\"close_time\":\"%sZ\",\"close_price\":%.5f," +
        "\"stop_loss\":%s,\"take_profit\":%s," +
        "\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"comment\":\"%s\"}",
        ticket, symbol, tradeType, volume,
        openTimeStr, openPrice, closeTimeStr, closePrice,
        (stopLoss > 0 ? DoubleToStr(stopLoss, 5) : "null"),
        (takeProfit > 0 ? DoubleToStr(takeProfit, 5) : "null"),
        profit, commission, swap, comment
    );
    
    return json;
}

//+------------------------------------------------------------------+
//| Send batch of trades to QuantaView API                          |
//+------------------------------------------------------------------+
bool SendBatchToQuantaView(string tradesJSON) {
    string url = APIBaseURL + "/api/v1/bulk-trades/import/" + TradingAccountID;
    string headers = "X-API-Key: " + QuantaViewAPIKey + "\r\n";
    headers += "Content-Type: application/json\r\n";
    headers += "User-Agent: QuantaViewEA/1.0\r\n";
    
    char data[];
    char result[];
    string resultStr;
    
    // Convert string to char array
    StringToCharArray(tradesJSON, data, 0, StringLen(tradesJSON));
    
    // Send HTTP request
    int timeout = 10000; // 10 seconds timeout
    int httpResult = WebRequest("POST", url, headers, timeout, data, result, resultStr);
    
    if(httpResult == 200) {
        if(ShowDebugInfo) {
            Print("✅ Successfully sent batch to QuantaView");
            // Parse response for detailed info
            if(StringFind(resultStr, "imported") >= 0) {
                Print("📄 Response: ", resultStr);
            }
        }
        return true;
    } else {
        Print("❌ Failed to send batch to QuantaView");
        Print("🔍 HTTP Status: ", httpResult);
        Print("📄 Response: ", resultStr);
        
        // Provide specific error guidance
        if(httpResult == 401) {
            Print("💡 Check your API key - it may be invalid or expired");
        } else if(httpResult == 403) {
            Print("💡 API key lacks required permissions - ensure 'trades:write' scope");
        } else if(httpResult == 404) {
            Print("💡 Trading Account ID not found - verify the account ID");
        } else if(httpResult == 429) {
            Print("💡 Rate limit exceeded - EA will retry automatically");
        } else if(httpResult == -1) {
            Print("💡 Network error - check internet connection and WebRequest URLs");
        }
        
        return false;
    }
}

//+------------------------------------------------------------------+
//| Send single trade to QuantaView                                 |
//+------------------------------------------------------------------+
void SendTradeToQuantaView(ulong ticket) {
    string tradeJSON = FormatTradeJSON(ticket);
    if(StringLen(tradeJSON) > 0) {
        bool success = SendBatchToQuantaView("[" + tradeJSON + "]");
        if(!success && ShowDebugInfo) {
            Print("⚠️ Failed to sync trade #", ticket);
        }
    }
}

//+------------------------------------------------------------------+
//| Check WebRequest permissions                                     |
//+------------------------------------------------------------------+
bool CheckWebRequestPermissions() {
    // This is a simple test to see if WebRequest is properly configured
    string testUrl = APIBaseURL + "/health";
    char data[];
    char result[];
    string resultStr;
    
    int httpResult = WebRequest("GET", testUrl, "", 5000, data, result, resultStr);
    
    if(httpResult == -1) {
        Print("❌ WebRequest failed - please check your MT4 settings:");
        Print("   1. Go to Tools → Options → Expert Advisors");
        Print("   2. Check 'Allow WebRequest for following URLs'");
        Print("   3. Add: ", APIBaseURL);
        Print("   4. Restart MT4 and try again");
        return false;
    }
    
    return true;
}

//+------------------------------------------------------------------+
//| Display setup instructions                                       |
//+------------------------------------------------------------------+
void ShowSetupInstructions() {
    Print("=== QuantaView EA Setup Instructions ===");
    Print("1. Get your API key from QuantaView dashboard:");
    Print("   - Click your username → API Keys");
    Print("   - Create new key with 'EA Integration' preset");
    Print("2. Configure EA parameters:");
    Print("   - QuantaViewAPIKey: Your API key (starts with 'qv_')");
    Print("   - TradingAccountID: Your trading account ID from QuantaView");
    Print("3. Enable WebRequest in MT4:");
    Print("   - Tools → Options → Expert Advisors");
    Print("   - Check 'Allow WebRequest for following URLs'");
    Print("   - Add: ", APIBaseURL);
    Print("4. Enable Auto Trading (green button in toolbar)");
    Print("=========================================");
}

//+------------------------------------------------------------------+