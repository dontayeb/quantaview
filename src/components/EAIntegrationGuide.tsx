'use client'

import { useState } from 'react'
import { 
  DocumentTextIcon,
  CodeBracketIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface EAIntegrationGuideProps {
  apiKey?: string
  tradingAccountId?: string
}

export function EAIntegrationGuide({ apiKey, tradingAccountId }: EAIntegrationGuideProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [showCode, setShowCode] = useState(false)

  const eaCode = `//+------------------------------------------------------------------+
//|                                            QuantaView EA v1.0.mq4 |
//|                                   Automated Trading History Sync |
//+------------------------------------------------------------------+

#property strict

// Input parameters
input string QuantaViewAPIKey = "${apiKey || 'qv_your_api_key_here'}";
input string TradingAccountID = "${tradingAccountId || 'your-account-id-here'}";
input string APIBaseURL = "https://your-backend.railway.app";
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
        "{\\"ticket\\":%d,\\"symbol\\":\\"%s\\",\\"trade_type\\":\\"%s\\",\\"volume\\":%.2f," +
        "\\"open_time\\":\\"%s\\",\\"open_price\\":%.5f,\\"close_time\\":\\"%s\\",\\"close_price\\":%.5f," +
        "\\"profit\\":%.2f,\\"commission\\":%.2f,\\"swap\\":%.2f,\\"comment\\":\\"%s\\"}",
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
    string headers = "X-API-Key: " + QuantaViewAPIKey + "\\r\\n";
    headers += "Content-Type: application/json\\r\\n";
    
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
}`

  const steps = [
    {
      title: "Create API Key",
      description: "First, create an API key with EA Integration permissions",
      completed: !!apiKey
    },
    {
      title: "Download EA File",
      description: "Download the QuantaView EA file and install it in your MT4/MT5",
      completed: false
    },
    {
      title: "Configure EA Settings",
      description: "Set your API key and account ID in the EA parameters",
      completed: false
    },
    {
      title: "Enable Auto Trading",
      description: "Make sure auto trading is enabled in MT4/MT5",
      completed: false
    },
    {
      title: "Start Historical Sync",
      description: "The EA will automatically sync all your historical trades",
      completed: false
    }
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CodeBracketIcon className="h-5 w-5 mr-2" />
          EA Integration Guide
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Automatically sync your MT4/MT5 trades with QuantaView
        </p>
      </div>

      <div className="p-6">
        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Security Notice</h4>
              <p className="text-sm text-blue-700 mt-1">
                The API key only allows uploading trade data. It cannot access your trading account, 
                place trades, or modify your account settings.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-6">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                activeStep === index ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setActiveStep(activeStep === index ? -1 : index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-3 ${
                    step.completed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {step.completed ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
                {activeStep === index ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Step Details */}
              {activeStep === index && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {index === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">
                        {apiKey ? (
                          <span className="text-green-700 font-medium">✓ API key created successfully!</span>
                        ) : (
                          "Create an API key with 'EA Integration' preset above."
                        )}
                      </p>
                    </div>
                  )}
                  
                  {index === 1 && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowCode(!showCode)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                        {showCode ? 'Hide' : 'Show'} EA Code
                      </button>
                      
                      <p className="text-sm text-gray-700">
                        Copy the EA code below and save it as <code className="bg-gray-100 px-1 rounded">QuantaViewEA.mq4</code> 
                        in your MT4 <code className="bg-gray-100 px-1 rounded">MQL4/Experts</code> folder.
                      </p>
                    </div>
                  )}
                  
                  {index === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">
                        In MT4/MT5, right-click the QuantaView EA and select "Properties" or "Settings":
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Set <strong>QuantaViewAPIKey</strong> to: <code className="bg-gray-100 px-1 rounded text-xs">{apiKey || 'your-api-key'}</code></li>
                        <li>• Set <strong>TradingAccountID</strong> to: <code className="bg-gray-100 px-1 rounded text-xs">{tradingAccountId || 'your-account-id'}</code></li>
                        <li>• Keep other settings as default</li>
                      </ul>
                    </div>
                  )}
                  
                  {index === 3 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">
                        Make sure auto trading is enabled in MT4/MT5:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Click the "Auto Trading" button in the toolbar (should be green)</li>
                        <li>• Go to Tools → Options → Expert Advisors</li>
                        <li>• Check "Allow automated trading"</li>
                        <li>• Check "Allow WebRequest for following URLs" and add: <code className="bg-gray-100 px-1 rounded text-xs">https://api.quantaview.com</code></li>
                      </ul>
                    </div>
                  )}
                  
                  {index === 4 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">
                        Once the EA is running:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Check the MT4 "Experts" tab for sync progress</li>
                        <li>• Historical trades will be uploaded in batches</li>
                        <li>• New trades will be sent automatically when closed</li>
                        <li>• Refresh your QuantaView dashboard to see the data</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* EA Code */}
        {showCode && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">QuantaViewEA.mq4</h4>
              <button
                onClick={() => copyToClipboard(eaCode)}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-300 hover:text-white"
              >
                <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                Copy Code
              </button>
            </div>
            <pre className="text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {eaCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}