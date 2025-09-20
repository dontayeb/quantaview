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
    
    // Perform initial sync on startup
    Timer();
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("QuantaView EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Timer function - called every second                            |
//+------------------------------------------------------------------+
void OnTimer()
{
    static datetime lastCheck = 0;
    
    // Check every SyncIntervalSeconds
    if(TimeCurrent() - lastCheck >= SyncIntervalSeconds)
    {
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
    // First, get total number of deals in history
    if(!HistorySelect(0, TimeCurrent()))
    {
        Log("Error: Could not select history");
        return;
    }
    
    int totalDeals = HistoryDealsTotal();
    Log(StringFormat("Found %d total deals in history", totalDeals));
    
    // Process in batches
    for(int startIndex = 0; startIndex < totalDeals; startIndex += BatchSize)
    {
        int endIndex = MathMin(startIndex + BatchSize - 1, totalDeals - 1);
        
        Log(StringFormat("Syncing batch: deals %d to %d", startIndex, endIndex));
        
        string jsonBatch = "";
        int batchCount = 0;
        
        for(int i = startIndex; i <= endIndex; i++)
        {
            ulong dealTicket = HistoryDealGetTicket(i);
            if(dealTicket > 0)
            {
                string dealJson = FormatDealAsJson(dealTicket);
                if(StringLen(dealJson) > 0)
                {
                    if(batchCount > 0) jsonBatch += ",";
                    jsonBatch += dealJson;
                    batchCount++;
                }
            }
        }
        
        if(batchCount > 0)
        {
            string fullJson = "{\"trades\":[" + jsonBatch + "]}";
            SendTradeBatch(fullJson);
        }
        
        // Small delay between batches to avoid overwhelming the server
        Sleep(1000);
    }
    
    Log("Initial sync completed!");
}

//+------------------------------------------------------------------+
//| Sync new closed trades since last sync                          |
//+------------------------------------------------------------------+
void SyncNewClosedTrades()
{
    if(!HistorySelect(lastSyncTime, TimeCurrent()))
    {
        Log("Error: Could not select recent history");
        return;
    }
    
    int totalDeals = HistoryDealsTotal();
    string newTradesJson = "";
    int newTradeCount = 0;
    
    for(int i = 0; i < totalDeals; i++)
    {
        ulong dealTicket = HistoryDealGetTicket(i);
        if(dealTicket > 0)
        {
            datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
            
            // Only process deals newer than last sync
            if(dealTime > lastSyncTime)
            {
                string dealJson = FormatDealAsJson(dealTicket);
                if(StringLen(dealJson) > 0)
                {
                    if(newTradeCount > 0) newTradesJson += ",";
                    newTradesJson += dealJson;
                    newTradeCount++;
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
}

//+------------------------------------------------------------------+
//| Format a deal as JSON                                            |
//+------------------------------------------------------------------+
string FormatDealAsJson(ulong dealTicket)
{
    // Get deal properties
    long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
    string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
    double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
    double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
    double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
    double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
    double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
    datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
    ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
    string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
    
    // Convert deal type to string
    string dealTypeStr = "";
    switch(dealType)
    {
        case DEAL_TYPE_BUY: dealTypeStr = "buy"; break;
        case DEAL_TYPE_SELL: dealTypeStr = "sell"; break;
        case DEAL_TYPE_BALANCE: dealTypeStr = "balance"; break;
        case DEAL_TYPE_CREDIT: dealTypeStr = "credit"; break;
        case DEAL_TYPE_CHARGE: dealTypeStr = "charge"; break;
        case DEAL_TYPE_CORRECTION: dealTypeStr = "correction"; break;
        case DEAL_TYPE_BONUS: dealTypeStr = "bonus"; break;
        case DEAL_TYPE_COMMISSION: dealTypeStr = "commission"; break;
        case DEAL_TYPE_COMMISSION_DAILY: dealTypeStr = "commission_daily"; break;
        case DEAL_TYPE_COMMISSION_MONTHLY: dealTypeStr = "commission_monthly"; break;
        case DEAL_TYPE_COMMISSION_AGENT_DAILY: dealTypeStr = "commission_agent_daily"; break;
        case DEAL_TYPE_COMMISSION_AGENT_MONTHLY: dealTypeStr = "commission_agent_monthly"; break;
        case DEAL_TYPE_INTEREST: dealTypeStr = "interest"; break;
        case DEAL_TYPE_BUY_CANCELED: dealTypeStr = "buy_canceled"; break;
        case DEAL_TYPE_SELL_CANCELED: dealTypeStr = "sell_canceled"; break;
        case DEAL_TYPE_DIVIDEND: dealTypeStr = "dividend"; break;
        case DEAL_TYPE_DIVIDEND_FRANKED: dealTypeStr = "dividend_franked"; break;
        case DEAL_TYPE_TAX: dealTypeStr = "tax"; break;
        default: dealTypeStr = "unknown"; break;
    }
    
    // Only process actual trades (buy/sell)
    if(dealTypeStr != "buy" && dealTypeStr != "sell")
        return "";
    
    // Format as JSON
    string json = StringFormat(
        "{"
        "\"trading_account_id\":\"%s\","
        "\"deal_id\":%d,"
        "\"position_id\":%d,"
        "\"symbol\":\"%s\","
        "\"type\":\"%s\","
        "\"volume\":%.2f,"
        "\"price\":%.5f,"
        "\"commission\":%.2f,"
        "\"swap\":%.2f,"
        "\"profit\":%.2f,"
        "\"time\":\"%s\","
        "\"comment\":\"%s\""
        "}",
        AccountId,
        dealTicket,
        positionId,
        symbol,
        dealTypeStr,
        volume,
        price,
        commission,
        swap,
        profit,
        TimeToString(dealTime, TIME_DATE|TIME_SECONDS),
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