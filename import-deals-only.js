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

async function importDeals() {
    try {
        console.log('Reading XLSX file...');
        
        // Read the Excel file
        const workbook = XLSX.readFile('./ReportHistory.xlsx');
        const worksheet = workbook.Sheets['Sheet1'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('💰 Importing Deals...');
        
        // Find Deals section
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i] && jsonData[i][0] === 'Deals') {
                headerRowIndex = i + 1;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error('Deals section not found');
            return;
        }

        console.log('Headers:', jsonData[headerRowIndex]);

        const deals = [];

        // Process data until we hit the next section
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Stop if we hit the next section or empty rows
            if (!row || !row[1] || (typeof row[0] === 'string' && row[0].includes(':'))) {
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

        console.log(`Found ${deals.length} deals`);
        
        if (deals.length === 0) {
            console.log('No deals to import');
            return;
        }

        // Show sample deal
        console.log('Sample deal:', JSON.stringify(deals[0], null, 2));

        // Insert deals into Supabase
        console.log('Inserting deals into Supabase...');
        
        const batchSize = 100;
        for (let i = 0; i < deals.length; i += batchSize) {
            const batch = deals.slice(i, i + batchSize);
            
            const { error } = await supabase
                .from('deals')
                .insert(batch);

            if (error) {
                console.error(`Error inserting batch:`, error);
                throw error;
            }
            
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(deals.length / batchSize)}`);
        }

        console.log(`✅ Successfully imported ${deals.length} deals!`);

    } catch (error) {
        console.error('Import failed:', error);
        
        if (error.message?.includes('deals')) {
            console.log('\nPlease create the deals table first by running this SQL in Supabase:');
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