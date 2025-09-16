const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
    console.error('Missing Supabase credentials in .env.local');
    console.error('Need either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

// Use service role key if available (bypasses RLS), otherwise use anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Setup readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function findTradingAccount() {
    console.log('\n📋 Enter the Account Number of your existing trading account:');
    const accountNumber = await askQuestion('Account Number: ');
    
    console.log('\n🔍 Looking up trading account...');
    
    // First, let's see all accounts (temporarily disable RLS check)
    const { data: accounts, error: listError } = await supabase
        .from('trading_accounts')
        .select('*');
    
    if (listError) {
        console.error('Error fetching accounts:', listError);
        throw listError;
    }
    
    console.log(`Found ${accounts?.length || 0} total accounts in database`);
    
    // Find the account by number
    const account = accounts?.find(acc => acc.account_number.toString() === accountNumber.toString());
    
    if (!account) {
        console.log('❌ Account not found. Available accounts:');
        accounts?.forEach(acc => {
            console.log(`  - Account #${acc.account_number}: ${acc.account_name}`);
        });
        throw new Error(`Account ${accountNumber} not found`);
    }
    
    console.log(`✅ Found account: ${account.account_name} (#${account.account_number})`);
    return account;
}

async function importPositions() {
    try {
        console.log('📊 SIMPLE POSITIONS IMPORTER');
        console.log('============================');

        // Ask for filename
        const filename = await askQuestion('Enter the Excel filename (e.g., ReportHistory.xlsx): ');
        
        if (!filename) {
            console.log('❌ Filename is required');
            rl.close();
            return;
        }

        // Find existing trading account
        const tradingAccount = await findTradingAccount();

        console.log(`\n📖 Reading XLSX file: ${filename}...`);
        
        // Read the Excel file
        const workbook = XLSX.readFile(filename);
        const worksheet = workbook.Sheets['Sheet1'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('📈 Processing Positions section...');
        
        const trades = [];
        let positionsFound = false;
        let positionsRowStart = -1;

        // Find the Positions section
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const firstCol = row[0]?.toString().toLowerCase();
            if (firstCol === 'positions') {
                positionsFound = true;
                positionsRowStart = i;
                console.log(`✅ Found Positions section at row ${i + 1}`);
                
                // Show the headers
                if (jsonData[i + 1]) {
                    console.log('📋 Headers:', jsonData[i + 1]);
                }
                break;
            }
        }

        if (!positionsFound) {
            console.log('❌ Positions section not found in XLSX file');
            rl.close();
            return;
        }

        console.log('🔍 Scanning Positions data...');
        
        let validRowsProcessed = 0;

        // Process position rows starting after the headers
        for (let i = positionsRowStart + 2; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Check if this is an empty row (indicates end of Positions section)
            if (!row || row.length < 3 || !row[0] || !row[1] || !row[2]) {
                console.log(`📋 Hit empty row at ${i + 1} - end of Positions section`);
                break;
            }
            
            // Stop if we hit another section header
            const firstCol = row[0]?.toString().toLowerCase().trim();
            if (firstCol && (firstCol === 'orders' || firstCol === 'deals' || firstCol === 'results' || 
                firstCol === 'summary' || firstCol === 'exposure' || firstCol.includes('=') ||
                firstCol === 'total' || firstCol.startsWith('total') || 
                firstCol === 'balance' || firstCol === 'deposit' || firstCol === 'credit')) {
                console.log(`📋 Reached next section at row ${i + 1} (found: ${firstCol})`);
                break;
            }
            
            // Check if this looks like a position row:
            const openTime = row[0];
            const position = row[1]; 
            const symbol = row[2];
            const type = row[3]?.toString().toLowerCase().trim();
            
            // Must have valid data
            if (!openTime || !position || !symbol || !type) {
                console.log(`⏭️  Skipping invalid row ${i + 1}: missing required fields`);
                continue;
            }
            
            // Position must be a number
            if (isNaN(parseInt(position))) {
                console.log(`⏭️  Skipping row ${i + 1}: position not a number (${position})`);
                continue;
            }
            
            // Type must be buy or sell
            if (!['buy', 'sell'].includes(type)) {
                console.log(`⏭️  Skipping row ${i + 1}: invalid type (${type})`);
                continue;
            }
            
            // Validate time format (should look like a date/time)
            if (!openTime.toString().includes('.') || !openTime.toString().includes(':')) {
                console.log(`⏭️  Skipping row ${i + 1}: invalid time format (${openTime})`);
                continue;
            }
            
            // Symbol should be reasonable length (allow longer names for indices like "Volatility 75 Index")
            if (symbol.length < 1 || symbol.length > 50) {
                console.log(`⏭️  Skipping row ${i + 1}: invalid symbol (${symbol})`);
                continue;
            }

            try {
                const trade = {
                    trading_account_id: tradingAccount.id,
                    position: parseInt(position),
                    ticket: parseInt(position),
                    symbol: symbol,
                    type: type,
                    volume: parseFloat(row[4]) || 0,
                    
                    // Entry details
                    open_time: formatDateTime(openTime),
                    open_price: parseFloat(row[5]) || null,
                    
                    // Risk management
                    stop_loss: parseFloat(row[6]) || null,
                    take_profit: parseFloat(row[7]) || null,
                    
                    // Exit details
                    close_time: formatDateTime(row[8]),
                    close_price: parseFloat(row[9]) || null,
                    
                    // Financial results
                    commission: parseFloat(row[10]) || 0,
                    swap: parseFloat(row[11]) || 0,
                    profit: parseFloat(row[12]) || 0,
                    
                    // Metadata
                    comment: '',
                    created_at: new Date().toISOString()
                };

                trades.push(trade);
                validRowsProcessed++;
                
                // Give a status update every 50 trades
                if (validRowsProcessed % 50 === 0) {
                    console.log(`📊 Processed ${validRowsProcessed} valid trades so far...`);
                }
                
            } catch (error) {
                console.warn(`Error processing position row ${i}:`, error.message);
            }
        }

        console.log(`📊 Found ${trades.length} positions to import`);
        
        if (trades.length === 0) {
            console.log('❌ No positions to import');
            rl.close();
            return;
        }

        // Show sample trade
        console.log('\nSample trade:', JSON.stringify(trades[0], null, 2));

        // Check for existing trades
        console.log('\n🔍 Checking for existing trades...');
        const { data: existingTrades, error: checkError } = await supabase
            .from('trades')
            .select('position')
            .eq('trading_account_id', tradingAccount.id);

        if (checkError) {
            console.warn('Could not check existing trades:', checkError);
        }

        const existingPositionIds = new Set(existingTrades?.map(t => t.position) || []);
        const newTrades = trades.filter(trade => !existingPositionIds.has(trade.position));
        const duplicateCount = trades.length - newTrades.length;

        console.log(`📊 Import Summary:`);
        console.log(`  Total positions found: ${trades.length}`);
        console.log(`  Already in database: ${duplicateCount}`);
        console.log(`  New positions to import: ${newTrades.length}`);

        if (newTrades.length === 0) {
            console.log('✅ No new trades to import - all positions already exist');
            rl.close();
            return;
        }

        const confirmImport = await askQuestion(`\nImport ${newTrades.length} new trades? (y/N): `);
        if (confirmImport.toLowerCase() !== 'y' && confirmImport.toLowerCase() !== 'yes') {
            console.log('Import cancelled');
            rl.close();
            return;
        }

        // Insert new trades into Supabase
        console.log('\n💾 Inserting new trades into Supabase...');
        
        const batchSize = 100;
        for (let i = 0; i < newTrades.length; i += batchSize) {
            const batch = newTrades.slice(i, i + batchSize);
            
            const { error } = await supabase
                .from('trades')
                .insert(batch);

            if (error) {
                console.error(`❌ Error inserting batch:`, error);
                throw error;
            }
            
            console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newTrades.length / batchSize)}`);
        }

        console.log(`\n🎉 Successfully imported ${newTrades.length} new trades!`);
        if (duplicateCount > 0) {
            console.log(`📋 Skipped ${duplicateCount} existing trades`);
        }

    } catch (error) {
        console.error('❌ Import failed:', error);
        
        if (error.code === 'ENOENT') {
            console.log('\n📋 File not found. Please check:');
            console.log('1. The filename is correct');
            console.log('2. The file is in the current directory');
            console.log('3. The file exists and is accessible');
        } else if (error.message?.includes('relation "trading_accounts" does not exist') || 
            error.message?.includes('relation "trades" does not exist')) {
            console.log('\n📋 Please run the SQL schema updates first:');
            console.log('1. Run create-positions-schema.sql in your Supabase SQL Editor');
        }
    } finally {
        rl.close();
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString || typeof dateTimeString !== 'string') {
        return null;
    }
    
    try {
        // Expected format: "2025.09.01 05:12:48"
        const [datePart, timePart] = dateTimeString.split(' ');
        
        if (!timePart) return null;
        
        const [year, month, day] = datePart.split('.');
        const [hour, minute, second] = timePart.split(':');
        
        const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
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

// Run the import
importPositions();