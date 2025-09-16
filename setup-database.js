const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
    try {
        console.log('Setting up database tables...');
        
        // Read the SQL file
        const sqlScript = fs.readFileSync('./create-tables.sql', 'utf8');
        
        console.log('Creating trades table...');
        
        // Execute the SQL to create trades table
        const { data: tradesData, error: tradesError } = await supabase.rpc('exec_sql', {
            query: `
                CREATE TABLE IF NOT EXISTS trades (
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
                    comment text,
                    magic integer,
                    created_at timestamptz DEFAULT now(),
                    updated_at timestamptz DEFAULT now()
                );
            `
        });

        if (tradesError) {
            console.log('Direct SQL execution not available via RPC. Please run the following SQL in your Supabase SQL editor:');
            console.log('\n' + sqlScript);
            console.log('\nAfter running the SQL, you can use the importer script.');
            return false;
        }

        console.log('✅ Database setup complete!');
        return true;

    } catch (error) {
        console.error('Setup failed:', error);
        console.log('\nPlease manually run the following SQL in your Supabase SQL editor:');
        console.log('\n' + fs.readFileSync('./create-tables.sql', 'utf8'));
        return false;
    }
}

setupDatabase();