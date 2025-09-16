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

async function importDeals() {
    try {
        console.log('📊 DEALS IMPORTER WITH USER ACCOUNTS');
        console.log('=====================================');

        // Get trading account information
        const accountInfo = await getTradingAccountInfo();
        
        // Create or get the trading account
        const tradingAccount = await createOrGetTradingAccount(accountInfo);

        console.log('\n📖 Reading XLSX file...');
        
        // Read the Excel file
        const workbook = XLSX.readFile('./ReportHistory.xlsx');
        const worksheet = workbook.Sheets['Sheet1'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('💰 Processing Deals section...');
        
        const trades = [];
        let totalRows = 0;
        let buyOrSellRows = 0;

        console.log('🔍 Scanning entire file for deal data...');

        // Scan the entire file for deal data patterns
        // Deal rows have: timestamp, deal_id (number), symbol, type, direction, volume, price...
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || row.length < 8) {
                continue;
            }
            
            // Check if this looks like a deal row:
            // 1. First column should be a timestamp (contains 2025 and time)
            // 2. Second column should be a number (deal_id)
            // 3. Fourth column should be buy/sell/balance (type)
            const timestamp = row[0]?.toString();
            const dealId = row[1];
            const dealType = row[3]?.toString().toLowerCase();
            
            // Must have timestamp pattern and numeric deal ID
            if (!timestamp || !timestamp.includes('2025') || !timestamp.includes(':')) {
                continue;
            }
            
            if (!dealId || isNaN(parseInt(dealId))) {
                continue;
            }
            
            // Must have a valid deal type
            if (!dealType || !['buy', 'sell', 'balance'].includes(dealType)) {
                continue;
            }
            
            totalRows++;
            
            // Only import rows with Type of "buy" or "sell"
            if (dealType !== 'buy' && dealType !== 'sell') {
                continue;
            }

            buyOrSellRows++;

            try {
                const trade = {
                    trading_account_id: tradingAccount.id,
                    position: parseInt(dealId), // Use deal_id as position for deals import
                    ticket: parseInt(dealId),
                    symbol: row[2] || '',
                    type: dealType,
                    volume: parseFloat(row[5]) || 0,
                    
                    // For deals import, we only have one timestamp and price
                    open_time: formatDateTime(timestamp),
                    open_price: parseFloat(row[6]) || null,
                    
                    // Deals don't have separate close data
                    close_time: formatDateTime(timestamp),
                    close_price: parseFloat(row[6]) || null,
                    
                    // Risk management - not available in deals
                    stop_loss: null,
                    take_profit: null,
                    
                    // Financial results
                    commission: parseFloat(row[8]) || 0,
                    swap: parseFloat(row[10]) || 0,
                    profit: parseFloat(row[11]) || 0,
                    
                    // Metadata
                    comment: row[13] || '',
                    created_at: new Date().toISOString()
                };

                trades.push(trade);
            } catch (error) {
                console.warn(`Error processing trade row ${i}:`, error.message);
            }
        }

        console.log(`📊 Found ${totalRows} total deal rows`);
        console.log(`📈 Found ${buyOrSellRows} buy/sell trades to import`);
        console.log(`⏭️  Skipped ${totalRows - buyOrSellRows} non-buy/sell trades`);
        
        if (trades.length === 0) {
            console.log('❌ No buy/sell trades to import');
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
        console.log(`  Total trades found: ${trades.length}`);
        console.log(`  Already in database: ${duplicateCount}`);
        console.log(`  New trades to import: ${newTrades.length}`);

        if (newTrades.length === 0) {
            console.log('✅ No new trades to import - all trades already exist');
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
        // Expected format: "2025.08.07 05:00:21"
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
importDeals();