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

async function importAllData() {
    try {
        console.log('Reading XLSX file...');
        
        // Read the Excel file
        const workbook = XLSX.readFile('./ReportHistory.xlsx');
        const worksheet = workbook.Sheets['Sheet1'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract account information from header
        const accountInfo = extractAccountInfo(jsonData);
        console.log('Account Info:', accountInfo);

        // Import each section
        await importPositions(jsonData);
        await importOrders(jsonData);
        await importDeals(jsonData);
        await importAccountData(accountInfo);

        console.log('✅ All data imported successfully!');

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

function extractAccountInfo(jsonData) {
    const info = {};
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.length >= 4) {
            const key = row[0]?.toString();
            if (key?.includes('Account:')) {
                const accountText = row[3]?.toString() || '';
                const accountMatch = accountText.match(/(\d+)/);
                if (accountMatch) {
                    info.account_number = parseInt(accountMatch[1]);
                }
                info.server = accountText.includes('FTMO-Server2') ? 'FTMO-Server2' : 'Unknown';
                info.currency = accountText.includes('USD') ? 'USD' : 'USD';
            }
            if (key?.includes('Company:')) {
                info.company = row[3]?.toString() || '';
            }
            if (key?.includes('Name:')) {
                info.name = row[3]?.toString() || '';
            }
        }
    }
    
    return info;
}

async function importPositions(jsonData) {
    console.log('\n📊 Importing Positions (Completed Trades)...');
    
    const headerRowIndex = 6; // "Positions" section headers
    const positions = [];

    // Process data until we hit the next section
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Stop if we hit the next section or empty rows
        if (!row || !row[1] || row[0] === 'Orders') {
            break;
        }

        try {
            const position = {
                ticket: parseInt(row[1]) || 0,
                symbol: row[2] || '',
                type: row[3] === 'buy' ? 'buy' : 'sell',
                volume: parseFloat(row[4]) || 0,
                open_price: parseFloat(row[5]) || 0,
                stop_loss: parseFloat(row[6]) || null,
                take_profit: parseFloat(row[7]) || null,
                close_time: formatDateTime(row[8]),
                close_price: parseFloat(row[9]) || null,
                commission: parseFloat(row[10]) || 0,
                swap: parseFloat(row[11]) || 0,
                profit: parseFloat(row[12]) || 0,
                open_time: formatDateTime(row[0]),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            positions.push(position);
        } catch (error) {
            console.warn(`Error processing position row ${i}:`, error.message);
        }
    }

    if (positions.length > 0) {
        console.log(`Importing ${positions.length} positions...`);
        await insertInBatches('trades', positions);
        console.log('✅ Positions imported');
    }
}

async function importOrders(jsonData) {
    console.log('\n📋 Importing Orders...');
    
    // Find Orders section
    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i] && jsonData[i][0] === 'Orders') {
            headerRowIndex = i + 1;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.log('Orders section not found');
        return;
    }

    const orders = [];

    // Process data until we hit the next section
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Stop if we hit the next section or empty rows
        if (!row || !row[1] || row[0] === 'Deals') {
            break;
        }

        try {
            const order = {
                order_id: parseInt(row[1]) || 0,
                open_time: formatDateTime(row[0]),
                symbol: row[2] || '',
                type: row[3] || '',
                volume: row[4] || '',
                price: row[5] === 'market' ? null : parseFloat(row[5]) || null,
                stop_loss: parseFloat(row[6]) || null,
                take_profit: parseFloat(row[7]) || null,
                time: formatDateTime(row[8]),
                state: row[9] || '',
                comment: row[11] || '',
                created_at: new Date().toISOString()
            };

            orders.push(order);
        } catch (error) {
            console.warn(`Error processing order row ${i}:`, error.message);
        }
    }

    if (orders.length > 0) {
        console.log(`Found ${orders.length} orders (creating orders table...)`);
        
        // Create orders table if it doesn't exist
        await createOrdersTable();
        await insertInBatches('orders', orders);
        console.log('✅ Orders imported');
    }
}

async function importDeals(jsonData) {
    console.log('\n💰 Importing Deals...');
    
    // Find Deals section
    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i] && jsonData[i][0] === 'Deals') {
            headerRowIndex = i + 1;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.log('Deals section not found');
        return;
    }

    const deals = [];

    // Process data until we hit the next section
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Stop if we hit the next section or empty rows
        if (!row || !row[1] || row[0] === 'Results' || typeof row[0] === 'string' && row[0].includes(':')) {
            break;
        }

        try {
            const deal = {
                deal_id: parseInt(row[1]) || 0,
                time: formatDateTime(row[0]),
                symbol: row[2] || '',
                type: row[3] || '',
                direction: row[4] || '',
                volume: parseFloat(row[5]) || 0,
                price: parseFloat(row[6]) || null,
                order_id: parseInt(row[7]) || null,
                commission: parseFloat(row[8]) || 0,
                fee: parseFloat(row[9]) || 0,
                swap: parseFloat(row[10]) || 0,
                profit: parseFloat(row[11]) || 0,
                balance: parseFloat(row[12]) || null,
                comment: row[13] || '',
                created_at: new Date().toISOString()
            };

            deals.push(deal);
        } catch (error) {
            console.warn(`Error processing deal row ${i}:`, error.message);
        }
    }

    if (deals.length > 0) {
        console.log(`Found ${deals.length} deals (creating deals table...)`);
        
        // Create deals table if it doesn't exist
        await createDealsTable();
        await insertInBatches('deals', deals);
        console.log('✅ Deals imported');
    }
}

async function importAccountData(accountInfo) {
    if (!accountInfo.account_number) {
        console.log('No account information found');
        return;
    }

    console.log('\n🏦 Importing Account Data...');

    const account = {
        account_number: accountInfo.account_number,
        balance: 0, // Would need to be extracted from Results section
        equity: 0,
        margin: 0,
        free_margin: 0,
        margin_level: 0,
        currency: accountInfo.currency || 'USD',
        server: accountInfo.server || 'Unknown',
        company: accountInfo.company || 'Unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('accounts')
        .upsert(account, { onConflict: 'account_number' });

    if (error) {
        console.error('Error importing account:', error);
    } else {
        console.log('✅ Account data imported');
    }
}

async function createOrdersTable() {
    // This would typically be run as SQL in Supabase
    console.log('Please create the orders table in Supabase SQL editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id bigint UNIQUE NOT NULL,
    open_time timestamptz,
    symbol text NOT NULL,
    type text NOT NULL,
    volume text,
    price decimal,
    stop_loss decimal,
    take_profit decimal,
    time timestamptz,
    state text,
    comment text,
    created_at timestamptz DEFAULT now()
);
    `);
}

async function createDealsTable() {
    console.log('Please create the deals table in Supabase SQL editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id bigint UNIQUE NOT NULL,
    time timestamptz,
    symbol text,
    type text,
    direction text,
    volume decimal,
    price decimal,
    order_id bigint,
    commission decimal DEFAULT 0,
    fee decimal DEFAULT 0,
    swap decimal DEFAULT 0,
    profit decimal DEFAULT 0,
    balance decimal,
    comment text,
    created_at timestamptz DEFAULT now()
);
    `);
}

async function insertInBatches(tableName, data) {
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await supabase
            .from(tableName)
            .insert(batch);

        if (error) {
            console.error(`Error inserting ${tableName} batch:`, error);
            throw error;
        }
        
        console.log(`  Inserted ${tableName} batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`);
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString || typeof dateTimeString !== 'string') {
        return null;
    }
    
    try {
        // Expected format: "2025.08.07 05:00:21"
        const [datePart, timePart] = dateTimeString.split(' ');
        
        if (!timePart) return null; // Handle date-only entries
        
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

// Run the complete import
importAllData();