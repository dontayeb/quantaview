//+------------------------------------------------------------------+
//| QuantaView Trade Sync EA for FTMO                               |
//| Sends all trade history on first connect, then real-time updates|
//+------------------------------------------------------------------+
#property copyright "QuantaView"
#property link      "https://quantaview.ai"
#property version   "1.00"
#property strict

// Input parameters
input string ApiUrl = "https://grateful-mindfulness-production-868e.up.railway.app"; // QuantaView API URL
input string ApiKey = ""; // Your QuantaView API Key (get from dashboard)
input string AccountId = ""; // Your QuantaView Account ID (from dashboard)
input int BatchSize = 100; // Number of trades to send per batch
input int SyncIntervalSeconds = 30; // How often to check for new closed trades
input bool EnableLogging = true; // Enable detailed logging

// Global variables
datetime lastSyncTime = 0;
bool initialSyncComplete = false;
string lastError = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    // Validate required parameters
    if(StringLen(ApiKey) == 0)
    {
        Alert("Error: API Key is required! Get it from QuantaView dashboard.");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    if(StringLen(AccountId) == 0)
    {
        Alert("Error: Account ID is required! Get it from QuantaView dashboard.");
        return INIT_PARAMETERS_INCORRECT;
    }
    
    Print("QuantaView EA initialized for FTMO account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("API URL: ", ApiUrl);
    Print("Account ID: ", AccountId);
    
    // Set initial sync time to start of time (will sync all history)
    lastSyncTime = StringToTime("1970.01.01 00:00:00");
    
    // Start timer for periodic sync checks (every 1 second)
    EventSetTimer(1);
    Log("Timer started for real-time sync monitoring");
    
    // Perform initial sync on startup
    Timer();
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    // Stop the timer
    EventKillTimer();
    Log("Timer stopped");
    Print("QuantaView EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Timer function - called every second                            |
//+------------------------------------------------------------------+
void OnTimer()
{
    static datetime lastCheck = 0;
    static int callCount = 0;
    callCount++;
    
    // Check every SyncIntervalSeconds
    if(TimeCurrent() - lastCheck >= SyncIntervalSeconds)
    {
        Log(StringFormat("Timer check #%d - running sync", callCount));
        Timer();
        lastCheck = TimeCurrent();
    }
}

//+------------------------------------------------------------------+
//| Main sync function                                               |
//+------------------------------------------------------------------+
void Timer()
{
    if(!initialSyncComplete)
    {
        Log("Starting initial sync of all trade history...");
        SyncAllTradeHistory();
        initialSyncComplete = true;
    }
    else
    {
        // Check for new closed trades since last sync
        SyncNewClosedTrades();
    }
    
    lastSyncTime = TimeCurrent();
}

//+------------------------------------------------------------------+
//| Sync all trade history in batches                               |
//+------------------------------------------------------------------+
void SyncAllTradeHistory()
{
    // First, get total number of deals in history (not orders)
    if(!HistorySelect(0, TimeCurrent()))
    {
        Log("Error: Could not select history");
        return;
    }
    
    int totalDeals = HistoryDealsTotal();
    Log(StringFormat("Found %d total deals in history", totalDeals));
    
    // Track processed positions to avoid duplicates
    ulong processedPositions[];
    ArrayResize(processedPositions, 0);
    
    string jsonBatch = "";
    int batchCount = 0;
    
    // Process all deals to find unique closed positions
    for(int i = 0; i < totalDeals; i++)
    {
        ulong dealTicket = HistoryDealGetTicket(i);
        if(dealTicket > 0)
        {
            // Only process OUT deals (position closes)
            int dealType = (int)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
            if(dealType == DEAL_TYPE_SELL || dealType == DEAL_TYPE_BUY)
            {
                ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
                
                // Check if we already processed this position
                bool alreadyProcessed = false;
                for(int j = 0; j < ArraySize(processedPositions); j++)
                {
                    if(processedPositions[j] == positionId)
                    {
                        alreadyProcessed = true;
                        break;
                    }
                }
                
                if(!alreadyProcessed && positionId > 0)
                {
                    string positionJson = FormatPositionAsJsonFromDeals(positionId);
                    if(StringLen(positionJson) > 0)
                    {
                        // Add to processed list
                        ArrayResize(processedPositions, ArraySize(processedPositions) + 1);
                        processedPositions[ArraySize(processedPositions) - 1] = positionId;
                        
                        if(batchCount > 0) jsonBatch += ",";
                        jsonBatch += positionJson;
                        batchCount++;
                        
                        // Send batch when it reaches the limit
                        if(batchCount >= BatchSize)
                        {
                            string fullJson = "{\"trades\":[" + jsonBatch + "]}";
                            SendTradeBatch(fullJson);
                            Log(StringFormat("Sent batch with %d trades", batchCount));
                            
                            jsonBatch = "";
                            batchCount = 0;
                            Sleep(1000); // Small delay between batches
                        }
                    }
                }
            }
        }
    }
    
    // Send remaining trades
    if(batchCount > 0)
    {
        string fullJson = "{\"trades\":[" + jsonBatch + "]}";
        SendTradeBatch(fullJson);
        Log(StringFormat("Sent final batch with %d trades", batchCount));
    }
    
    Log(StringFormat("Initial sync completed! Processed %d unique positions", ArraySize(processedPositions)));
}

//+------------------------------------------------------------------+
//| Sync new closed trades since last sync                          |
//+------------------------------------------------------------------+
void SyncNewClosedTrades()
{
    Log(StringFormat("Checking for new trades since: %s", TimeToString(lastSyncTime)));
    
    if(!HistorySelect(lastSyncTime, TimeCurrent()))
    {
        Log("Error: Could not select recent history");
        return;
    }
    
    int totalDeals = HistoryDealsTotal();
    Log(StringFormat("Found %d deals in recent history", totalDeals));
    
    // Track processed positions to avoid duplicates
    ulong processedPositions[];
    ArrayResize(processedPositions, 0);
    
    string newTradesJson = "";
    int newTradeCount = 0;
    
    for(int i = 0; i < totalDeals; i++)
    {
        ulong dealTicket = HistoryDealGetTicket(i);
        if(dealTicket > 0)
        {
            datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
            
            // Only process deals after last sync
            if(dealTime > lastSyncTime)
            {
                // Only process OUT deals (position closes)
                int dealType = (int)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
                if(dealType == DEAL_TYPE_SELL || dealType == DEAL_TYPE_BUY)
                {
                    ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
                    
                    // Check if we already processed this position
                    bool alreadyProcessed = false;
                    for(int j = 0; j < ArraySize(processedPositions); j++)
                    {
                        if(processedPositions[j] == positionId)
                        {
                            alreadyProcessed = true;
                            break;
                        }
                    }
                    
                    if(!alreadyProcessed && positionId > 0)
                    {
                        Log(StringFormat("Processing new position: %d closed at %s", positionId, TimeToString(dealTime)));
                        string positionJson = FormatPositionAsJsonFromDeals(positionId);
                        if(StringLen(positionJson) > 0)
                        {
                            // Add to processed list
                            ArrayResize(processedPositions, ArraySize(processedPositions) + 1);
                            processedPositions[ArraySize(processedPositions) - 1] = positionId;
                            
                            if(newTradeCount > 0) newTradesJson += ",";
                            newTradesJson += positionJson;
                            newTradeCount++;
                        }
                        else
                        {
                            Log(StringFormat("Position %d skipped (not a closed trade)", positionId));
                        }
                    }
                }
            }
        }
    }
    
    if(newTradeCount > 0)
    {
        string fullJson = "{\"trades\":[" + newTradesJson + "]}";
        SendTradeBatch(fullJson);
        Log(StringFormat("Synced %d new trades", newTradeCount));
    }
    else
    {
        Log("No new trades found");
    }
}

//+------------------------------------------------------------------+
//| Format a position as JSON from deals                            |
//+------------------------------------------------------------------+
string FormatPositionAsJsonFromDeals(ulong positionId)
{
    // Find all deals for this position
    ulong openDealTicket = 0;
    ulong closeDealTicket = 0;
    double totalProfit = 0.0;
    double totalCommission = 0.0;
    double totalSwap = 0.0;
    double openPrice = 0.0;
    double closePrice = 0.0;
    double volume = 0.0;
    datetime openTime = 0;
    datetime closeTime = 0;
    string symbol = "";
    string comment = "";
    string tradeType = "";
    
    int totalDeals = HistoryDealsTotal();
    for(int i = 0; i < totalDeals; i++)
    {
        ulong dealTicket = HistoryDealGetTicket(i);
        if(dealTicket > 0)
        {
            ulong dealPositionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
            if(dealPositionId == positionId)
            {
                int dealType = (int)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
                datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
                
                // Accumulate totals
                totalProfit += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                totalCommission += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
                totalSwap += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
                
                // Get common data from any deal
                if(StringLen(symbol) == 0)
                {
                    symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
                    comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
                    volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
                }
                
                // Identify open and close deals
                if(dealType == DEAL_TYPE_BUY || dealType == DEAL_TYPE_SELL)
                {
                    int dealEntry = (int)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
                    
                    if(dealEntry == DEAL_ENTRY_IN) // Opening deal
                    {
                        openDealTicket = dealTicket;
                        openPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                        openTime = dealTime;
                        
                        // Determine trade type from opening deal
                        if(dealType == DEAL_TYPE_BUY)
                            tradeType = "buy";
                        else
                            tradeType = "sell";
                    }
                    else if(dealEntry == DEAL_ENTRY_OUT) // Closing deal
                    {
                        closeDealTicket = dealTicket;
                        closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                        closeTime = dealTime;
                    }
                }
            }
        }
    }
    
    // Skip if we don't have both open and close deals
    if(openDealTicket == 0 || closeDealTicket == 0)
    {
        Log(StringFormat("Position %d skipped - incomplete deal data", positionId));
        return "";
    }
    
    // Skip if position is not closed
    if(closeTime == 0)
    {
        return "";
    }
    
    // Format both open and close times to ISO 8601
    MqlDateTime openDt, closeDt;
    TimeToStruct(openTime, openDt);
    TimeToStruct(closeTime, closeDt);
    
    string openTimeStr = StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
        openDt.year,
        openDt.mon,
        openDt.day,
        openDt.hour,
        openDt.min,
        openDt.sec
    );
    
    string closeTimeStr = StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
        closeDt.year,
        closeDt.mon,
        closeDt.day,
        closeDt.hour,
        closeDt.min,
        closeDt.sec
    );
    
    // Escape quotes in comment
    StringReplace(comment, "\"", "\\\"");
    
    // Log the data for debugging
    Log(StringFormat("Position %d: Open: %s at %.5f, Close: %s at %.5f", 
        positionId, openTimeStr, openPrice, closeTimeStr, closePrice));
    
    // Format as JSON with separate open/close prices and times
    string json = StringFormat(
        "{\"trading_account_id\":\"%s\",\"deal_id\":%d,\"position_id\":%d,\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,\"open_price\":%.5f,\"close_price\":%.5f,\"commission\":%.2f,\"swap\":%.2f,\"profit\":%.2f,\"open_time\":\"%s\",\"close_time\":\"%s\",\"comment\":\"%s\"}",
        AccountId,
        closeDealTicket,
        positionId,
        symbol,
        tradeType,
        volume,
        openPrice,
        closePrice,
        totalCommission,
        totalSwap,
        totalProfit,
        openTimeStr,
        closeTimeStr,
        comment
    );
    
    return json;
}

//+------------------------------------------------------------------+
//| Send trade batch to QuantaView API                              |
//+------------------------------------------------------------------+
void SendTradeBatch(string jsonData)
{
    string url = ApiUrl + "/api/v1/trades/batch";
    string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + ApiKey + "\r\n";
    
    char postData[];
    StringToCharArray(jsonData, postData, 0, StringLen(jsonData));
    
    char resultData[];
    string resultHeaders;
    
    int result = WebRequest(
        "POST",
        url,
        headers,
        5000, // 5 second timeout
        postData,
        resultData,
        resultHeaders
    );
    
    if(result == 200)
    {
        Log("Successfully sent trade batch to QuantaView");
    }
    else if(result == -1)
    {
        Log("Error: WebRequest failed. Make sure URL is in allowed list in MT5 settings.");
        Log("Go to Tools > Options > Expert Advisors and add: " + ApiUrl);
    }
    else
    {
        string responseText = CharArrayToString(resultData);
        Log(StringFormat("API Error %d: %s", result, responseText));
    }
}

//+------------------------------------------------------------------+
//| Logging function                                                 |
//+------------------------------------------------------------------+
void Log(string message)
{
    if(EnableLogging)
    {
        Print("[QuantaView] ", message);
    }
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    // We use OnTimer instead of OnTick for efficiency
    // OnTick would run on every price change, which is too frequent
}