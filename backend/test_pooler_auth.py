#!/usr/bin/env python3

import psycopg2

# Test various authentication formats for Supabase pooler
test_connections = [
    # Standard format (what we've been using)
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    
    # Format with database name specified  
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
    
    # Session mode with different database specification
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
    
    # Alternative format without project reference in username (just postgres)
    "postgresql://postgres:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true",
    
    # Alternative with connection pooling mode specified
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true&pool_mode=transaction",
    
    # Session mode alternative
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&pool_mode=session",
]

for i, conn_str in enumerate(test_connections, 1):
    print(f"\n=== Test {i}: Testing pooler authentication ===")
    print(f"Connection: {conn_str}")
    
    try:
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user;")
        result = cursor.fetchone()
        print(f"✅ SUCCESS: {result}")
        
        # Test if our tables exist
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;")
        tables = cursor.fetchall()
        print(f"📋 Sample tables: {[t[0] for t in tables]}")
        
        # If successful, save this connection string
        with open('.env.working', 'w') as f:
            f.write(f"DATABASE_URL={conn_str}\n")
        print(f"✅ Saved working connection to .env.working")
        
        cursor.close()
        conn.close()
        break  # Stop on first success
        
    except Exception as e:
        print(f"❌ FAILED: {e}")

print(f"\n=== Summary ===")
print("If no connection succeeded, the issue may be with:")
print("1. Incorrect pooler credentials")
print("2. Need to use different Supabase connection method")
print("3. Database permissions or configuration issue")