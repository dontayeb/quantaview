const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function getTradingAccountInfo() {
    console.log('\n📋 Enter Trading Account Information:');
    
    const accountNumber = await askQuestion('Account Number: ');
    const accountName = await askQuestion('Account Name/Label: ');
    const password = await askQuestion('Account Password: ');
    const server = await askQuestion('Server (e.g., FTMO-Server2): ');
    const broker = await askQuestion('Broker (optional): ');
    const currency = await askQuestion('Currency (default: USD): ') || 'USD';
    const accountType = await askQuestion('Account Type (demo/live): ');
    
    return {
        account_number: parseInt(accountNumber),
        account_name: accountName,
        password: password,
        server: server,
        broker: broker || null,
        currency: currency,
        account_type: accountType || null
    };
}

async function createOrGetTradingAccount(accountInfo) {
    console.log('\n🔍 Checking if trading account exists...');
    
    // Check if account already exists
    const { data: existingAccount, error: selectError } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('account_number', accountInfo.account_number)
        .single();

    if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
    }

    if (existingAccount) {
        console.log(`✅ Found existing account: ${existingAccount.account_name}`);
        
        const updateChoice = await askQuestion('Update account info? (y/N): ');
        if (updateChoice.toLowerCase() === 'y' || updateChoice.toLowerCase() === 'yes') {
            const { data: updatedAccount, error: updateError } = await supabase
                .from('trading_accounts')
                .update({
                    account_name: accountInfo.account_name,
                    password: accountInfo.password,
                    server: accountInfo.server,
                    broker: accountInfo.broker,
                    currency: accountInfo.currency,
                    account_type: accountInfo.account_type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingAccount.id)
                .select()
                .single();

            if (updateError) throw updateError;
            console.log('✅ Account updated');
            return updatedAccount;
        }
        
        return existingAccount;
    }

    // Create new account
    console.log('📝 Creating new trading account...');
    const { data: newAccount, error: insertError } = await supabase
        .from('trading_accounts')
        .insert(accountInfo)
        .select()
        .single();

    if (insertError) throw insertError;
    
    console.log(`✅ Created new account: ${newAccount.account_name}`);
    return newAccount;
}

async function importPositions() {
    try {
        console.log('📊 POSITIONS IMPORTER WITH USER ACCOUNTS');
        console.log('========================================');

        // Get trading account information
        const accountInfo = await getTradingAccountInfo();
        
        // Create or get the trading account
        const tradingAccount = await createOrGetTradingAccount(accountInfo);

        console.log('\n📖 Reading XLSX file...');
        
        // Read the Excel file
        const workbook = XLSX.readFile('./ReportHistory.xlsx');
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

        // Process position rows starting after the headers
        for (let i = positionsRowStart + 2; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || row.length < 10) {
                continue;
            }
            
            // Stop if we hit another section (like "Orders" or "Results")
            const firstCol = row[0]?.toString().toLowerCase();
            if (firstCol && (firstCol === 'orders' || firstCol === 'deals' || firstCol === 'results' || 
                firstCol === 'summary' || firstCol === 'exposure' || firstCol.includes('='))) {
                console.log(`📋 Reached end of Positions section at row ${i + 1} (found: ${firstCol})`);
                break;
            }
            
            // Check if this looks like a position row:
            // Expected structure: Time, Position, Symbol, Type, Volume, Price, S/L, T/P, Time, Price, Commission, Swap, Profit
            const openTime = row[0];
            const position = row[1]; 
            const symbol = row[2];
            const type = row[3]?.toString().toLowerCase();
            
            // Must have valid data
            if (!openTime || !position || !symbol || !type) {
                continue;
            }
            
            // Position must be a number
            if (isNaN(parseInt(position))) {
                continue;
            }
            
            // Type must be buy or sell
            if (!['buy', 'sell'].includes(type)) {
                continue;
            }

            try {
                const trade = {
                    trading_account_id: tradingAccount.id,
                    position: parseInt(position),
                    ticket: parseInt(position), // Same as position for most brokers
                    symbol: symbol,
                    type: type,
                    volume: parseFloat(row[4]) || 0,
                    
                    // Entry details (first time and price columns)
                    open_time: formatDateTime(openTime),
                    open_price: parseFloat(row[5]) || null,
                    
                    // Risk management
                    stop_loss: parseFloat(row[6]) || null,
                    take_profit: parseFloat(row[7]) || null,
                    
                    // Exit details (second time and price columns)
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

        const confirmImport = await askQuestion(`\nImport ${newTrades.length} new trades for account "${tradingAccount.account_name}"? (y/N): `);
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

        console.log(`\n🎉 Successfully imported ${newTrades.length} new trades for account "${tradingAccount.account_name}"!`);
        if (duplicateCount > 0) {
            console.log(`📋 Skipped ${duplicateCount} existing trades`);
        }

    } catch (error) {
        console.error('❌ Import failed:', error);
        
        if (error.message?.includes('relation "trading_accounts" does not exist') || 
            error.message?.includes('relation "trades" does not exist')) {
            console.log('\n📋 Please run the SQL schema updates first:');
            console.log('1. Run create-positions-schema.sql in your Supabase SQL Editor');
            console.log('2. This will create the new trades table matching Positions structure');
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