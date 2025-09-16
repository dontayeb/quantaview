//+------------------------------------------------------------------+
//|                                     QuantaView EA v1.0          |
//|                    Sends real-time trades to QuantaView Dashboard|
//|                         Updated for new schema                   |
//+------------------------------------------------------------------+
#property copyright "Project Quanta"
#property version   "1.00"

// ============================================================================
// SETUP INSTRUCTIONS:
// ============================================================================
// 1. Create your trading account in the QuantaView dashboard first
// 2. Make sure the account number in the dashboard matches your MT5 account
// 3. Run the insert_trade_from_mt5.sql script in your Supabase SQL editor
// 4. Paste your Supabase credentials below:
// ============================================================================

#define SUPABASE_URL    "https://kbzgcgztdkmbgivixjuo.supabase.co"        // Your Supabase project URL (e.g., https://xyz.supabase.co)
#define SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiemdjZ3p0ZGttYmdpdml4anVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzMyNDMsImV4cCI6MjA3MjcwOTI0M30.z4xLnFTTgSleuylvAWW35hqK9SqMQLRiCUCSvwI_qQ4"      // Your Supabase anon/public API key

// ============================================================================
// IMPORTANT: Allow WebRequest URLs in MT5
// ============================================================================
// In MT5: Tools -> Options -> Expert Advisors -> WebRequest tab
// Add your Supabase URL to the list of allowed URLs
// Example: https://xyz.supabase.co
// ============================================================================

ulong g_last_processed_ticket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("QuantaView EA v1.0 Initialized. Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
   Print("Waiting for completed trades to send to dashboard...");
   if(HistorySelect(0, TimeCurrent()))
   {
      uint total_deals = HistoryDealsTotal();
      if(total_deals > 0)
      {
         g_last_processed_ticket = HistoryDealGetTicket(total_deals - 1);
         Print("Last processed ticket: ", g_last_processed_ticket);
      }
   }
   EventSetTimer(10);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("QuantaView EA v1.0 Deinitialized.");
}

//+------------------------------------------------------------------+
//| Timer function - this is our main loop                           |
//+------------------------------------------------------------------+
void OnTimer()
{
   CheckForClosedTrades();
}

//+------------------------------------------------------------------+
//| Function to check for newly closed trades                        |
//+------------------------------------------------------------------+
void CheckForClosedTrades()
{
   if(!HistorySelect(0, TimeCurrent())) return;
   
   uint total_deals = HistoryDealsTotal();
   
   for(uint i = 0; i < total_deals; i++)
   {
      ulong deal_ticket = HistoryDealGetTicket(i);
      
      if((long)deal_ticket > (long)g_last_processed_ticket)
      {
         if(HistoryDealGetInteger(deal_ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT)
         {
            ProcessClosedTrade(deal_ticket);
         }
         g_last_processed_ticket = deal_ticket;
      }
   }
}

//+------------------------------------------------------------------+
//| Find the opening deal ticket for a given closing deal ticket     |
//+------------------------------------------------------------------+
ulong FindOpeningDealTicket(long position_id)
{
    if(position_id == 0 || !HistorySelectByPosition(position_id)) return 0;

    for(int i = 0; i < (int)HistoryDealsTotal(); i++)
    {
        ulong deal_ticket = HistoryDealGetTicket(i);
        if(HistoryDealGetInteger(deal_ticket, DEAL_ENTRY) == DEAL_ENTRY_IN)
        {
            return deal_ticket;
        }
    }
    return 0;
}

//+------------------------------------------------------------------+
//| Process a single closed trade and send to QuantaView Dashboard   |
//+------------------------------------------------------------------+
void ProcessClosedTrade(ulong closing_deal_ticket)
{
    long position_id = HistoryDealGetInteger(closing_deal_ticket, DEAL_POSITION_ID);
    ulong opening_deal_ticket = FindOpeningDealTicket(position_id);
    if(opening_deal_ticket == 0)
    {
        Print("Could not find opening deal for closing deal #", closing_deal_ticket);
        return;
    }

    // === 1. GATHER TRADE DATA ===
    long mt5_account = AccountInfoInteger(ACCOUNT_LOGIN);
    string symbol = HistoryDealGetString(opening_deal_ticket, DEAL_SYMBOL);
    double volume = HistoryDealGetDouble(opening_deal_ticket, DEAL_VOLUME);
    long deal_type = HistoryDealGetInteger(opening_deal_ticket, DEAL_TYPE);
    
    // Entry details
    double open_price = HistoryDealGetDouble(opening_deal_ticket, DEAL_PRICE);
    datetime open_time = (datetime)HistoryDealGetInteger(opening_deal_ticket, DEAL_TIME);
    
    // Exit details  
    double close_price = HistoryDealGetDouble(closing_deal_ticket, DEAL_PRICE);
    datetime close_time = (datetime)HistoryDealGetInteger(closing_deal_ticket, DEAL_TIME);
    
    // Financial details
    double profit = HistoryDealGetDouble(closing_deal_ticket, DEAL_PROFIT);
    double commission = HistoryDealGetDouble(closing_deal_ticket, DEAL_COMMISSION) + 
                       HistoryDealGetDouble(opening_deal_ticket, DEAL_COMMISSION);
    double swap = HistoryDealGetDouble(closing_deal_ticket, DEAL_SWAP);
    
    // Get SL/TP from position history if available
    double stop_loss = 0;
    double take_profit = 0;
    string comment = HistoryDealGetString(closing_deal_ticket, DEAL_COMMENT);
    
    // Clean comment string to avoid JSON issues
    StringReplace(comment, "\"", "'");  // Replace quotes with apostrophes
    StringReplace(comment, "\\", "/");  // Replace backslashes
    if(StringLen(comment) > 100) {
        comment = StringSubstr(comment, 0, 100); // Limit length
    }

    // === 2. FORMAT DATA FOR DATABASE ===
    string type_text = (deal_type == DEAL_TYPE_BUY) ? "buy" : "sell";
    
    // Convert times to ISO format
    string open_time_iso = TimeToString(open_time, TIME_DATE|TIME_SECONDS);
    string close_time_iso = TimeToString(close_time, TIME_DATE|TIME_SECONDS);
    
    // Fix date format: "2025.09.09 03:21:39" -> "2025-09-09T03:21:39Z"
    StringReplace(open_time_iso, ".", "-");
    StringReplace(close_time_iso, ".", "-");
    
    // Find the space and replace with T
    int space_pos = StringFind(open_time_iso, " ");
    if(space_pos >= 0) {
        open_time_iso = StringSubstr(open_time_iso, 0, space_pos) + "T" + StringSubstr(open_time_iso, space_pos + 1);
    }
    space_pos = StringFind(close_time_iso, " ");
    if(space_pos >= 0) {
        close_time_iso = StringSubstr(close_time_iso, 0, space_pos) + "T" + StringSubstr(close_time_iso, space_pos + 1);
    }
    
    open_time_iso += "Z";
    close_time_iso += "Z";

    // === 3. CREATE JSON PAYLOAD FOR DATABASE SCHEMA ===
    string json = StringFormat(
        "{"
        "\"trade_position\":%I64d,"
        "\"ticket\":%I64d,"
        "\"symbol\":\"%s\","
        "\"trade_type\":\"%s\","
        "\"volume\":%.2f,"
        "\"open_time\":\"%s\","
        "\"open_price\":%.5f,"
        "\"close_time\":\"%s\","
        "\"close_price\":%.5f,"
        "\"account_number\":%I64d,"
        "\"stop_loss\":%s,"
        "\"take_profit\":%s,"
        "\"commission\":%.2f,"
        "\"swap\":%.2f,"
        "\"profit\":%.2f,"
        "\"comment\":\"%s\""
        "}",
        position_id,                    // trade_position (bigint)
        closing_deal_ticket,            // ticket (closing deal ticket) 
        symbol,                         // symbol
        type_text,                      // trade_type (buy/sell)
        volume,                         // volume
        open_time_iso,                  // open_time (timestamptz)
        open_price,                     // open_price
        close_time_iso,                 // close_time (timestamptz) 
        close_price,                    // close_price
        mt5_account,                    // account_number for matching (moved up)
        (stop_loss > 0) ? DoubleToString(stop_loss, 5) : "null",    // stop_loss
        (take_profit > 0) ? DoubleToString(take_profit, 5) : "null", // take_profit
        commission,                     // commission
        swap,                          // swap  
        profit,                        // profit
        comment                        // comment
    );

    // === 4. SEND TO DASHBOARD VIA SUPABASE FUNCTION ===
    // We'll use a Supabase function that finds the correct trading_account_id
    // based on account_number and inserts the trade
    string url = SUPABASE_URL + "/rest/v1/rpc/insert_trade_from_mt5";
    string headers = "Content-Type: application/json\r\napikey: " + SUPABASE_ANON_KEY + "\r\nAuthorization: Bearer " + SUPABASE_ANON_KEY + "\r\nPrefer: return=representation";
    
    char post_data[], result_data[];
    string result_headers;
    int timeout = 10000;
   
    StringToCharArray(json, post_data, 0, WHOLE_ARRAY, CP_UTF8);
    ArrayResize(post_data, ArraySize(post_data) - 1);  // Remove null terminator
   
    Print("Sending trade to QuantaView Dashboard...");
    Print("Position: ", position_id, " | Symbol: ", symbol, " | Type: ", type_text, " | Profit: ", profit);
    Print("JSON Payload: ", json);
   
    ResetLastError();
    int response_code = WebRequest("POST", url, headers, timeout, post_data, result_data, result_headers);
   
    if(response_code == -1)
    {
        int error_code = GetLastError();
        Print("ERROR: Failed to send trade to dashboard. Error code: ", error_code);
        Print("Make sure WebRequest URLs are allowed in MT5 settings.");
    }
    else if(response_code >= 200 && response_code < 300)
    {
        Print("SUCCESS: Trade sent to dashboard. Response: ", response_code);
    }
    else
    {
        Print("WARNING: Dashboard responded with code: ", response_code);
        Print("Response: ", CharArrayToString(result_data));
        Print("Request Headers: ", headers);
        Print("Request URL: ", url);
    }
}
//+------------------------------------------------------------------+