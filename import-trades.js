const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function importTrades() {
    try {
        console.log('Reading XLSX file...');
        
        // Read the Excel file
        const workbook = XLSX.readFile('./ReportHistory.xlsx');
        const worksheet = workbook.Sheets['Sheet1'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Find the header row (should be at row 6)
        const headerRowIndex = 6;
        const headers = jsonData[headerRowIndex];
        
        console.log('Headers found:', headers);
        
        // Map the headers to our expected columns
        const headerMap = {
            0: 'open_time',      // Time (open)
            1: 'ticket',         // Position (ticket)
            2: 'symbol',         // Symbol
            3: 'type',          // Type
            4: 'volume',        // Volume
            5: 'open_price',    // Price (open)
            6: 'stop_loss',     // S/L
            7: 'take_profit',   // T/P
            8: 'close_time',    // Time (close)
            9: 'close_price',   // Price (close)
            10: 'commission',   // Commission
            11: 'swap',         // Swap
            12: 'profit'        // Profit
        };

        console.log('Processing trade data...');
        
        const trades = [];
        
        // Process data rows (starting from headerRowIndex + 1)
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || row.length === 0 || !row[1]) {
                continue;
            }

            try {
                const trade = {
                    ticket: parseInt(row[1]) || 0,
                    symbol: row[2] || '',
                    type: row[3] === 'buy' ? 'buy' : 'sell',
                    volume: parseFloat(row[4]) || 0,
                    open_price: parseFloat(row[5]) || 0,
                    close_price: parseFloat(row[9]) || null,
                    open_time: formatDateTime(row[0]),
                    close_time: formatDateTime(row[8]),
                    profit: parseFloat(row[12]) || 0,
                    commission: parseFloat(row[10]) || 0,
                    swap: parseFloat(row[11]) || 0,
                    stop_loss: parseFloat(row[6]) || null,
                    take_profit: parseFloat(row[7]) || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                trades.push(trade);
                
            } catch (error) {
                console.warn(`Error processing row ${i}:`, error.message);
                console.warn('Row data:', row);
            }
        }

        console.log(`Parsed ${trades.length} trades`);
        
        if (trades.length === 0) {
            console.log('No trades to import');
            return;
        }

        // Show sample trade
        console.log('Sample trade:', JSON.stringify(trades[0], null, 2));

        // Insert trades into Supabase
        console.log('Inserting trades into Supabase...');
        
        // Insert in batches to avoid rate limits
        const batchSize = 100;
        for (let i = 0; i < trades.length; i += batchSize) {
            const batch = trades.slice(i, i + batchSize);
            
            const { data, error } = await supabase
                .from('trades')
                .insert(batch);

            if (error) {
                console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
                throw error;
            }
            
            console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} trades)`);
        }

        console.log(`✅ Successfully imported ${trades.length} trades!`);

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString || typeof dateTimeString !== 'string') {
        return null;
    }
    
    try {
        // Expected format: "2025.08.07 05:00:21"
        const [datePart, timePart] = dateTimeString.split(' ');
        const [year, month, day] = datePart.split('.');
        const [hour, minute, second] = timePart.split(':');
        
        const date = new Date(
            parseInt(year),
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
        );
        
        return date.toISOString();
    } catch (error) {
        console.warn(`Failed to parse datetime: ${dateTimeString}`);
        return null;
    }
}

// Check if we need to create the trades table first
async function checkAndCreateTable() {
    const { data, error } = await supabase
        .from('trades')
        .select('count')
        .limit(1);

    if (error) {
        console.log('Trades table may not exist. Please create it with the following SQL:');
        console.log(`
CREATE TABLE trades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket bigint UNIQUE NOT NULL,
    symbol text NOT NULL,
    type text CHECK (type IN ('buy', 'sell')) NOT NULL,
    volume decimal NOT NULL,
    open_price decimal NOT NULL,
    close_price decimal,
    open_time timestamptz,
    close_time timestamptz,
    profit decimal DEFAULT 0,
    commission decimal DEFAULT 0,
    swap decimal DEFAULT 0,
    stop_loss decimal,
    take_profit decimal,
    comment text,
    magic integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
        `);
        return false;
    }
    return true;
}

// Run the import
async function main() {
    const tableExists = await checkAndCreateTable();
    if (tableExists) {
        await importTrades();
    }
}

main();