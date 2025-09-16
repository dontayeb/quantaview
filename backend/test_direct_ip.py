#!/usr/bin/env python3

import psycopg2

# Test connection using direct IP instead of hostname
direct_ip_connections = [
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@44.208.221.186:5432/postgres?sslmode=require",
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@52.45.94.125:5432/postgres?sslmode=require",
    "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@44.216.29.125:5432/postgres?sslmode=require",
]

print("Testing direct IP connections to pooler...")

for i, conn_str in enumerate(direct_ip_connections, 1):
    print(f"\n=== Test {i}: Direct IP Connection ===")
    
    try:
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user;")
        result = cursor.fetchone()
        print(f"✅ SUCCESS: {result}")
        
        cursor.close()
        conn.close()
        
        # Save working connection
        with open('.env.working', 'w') as f:
            f.write(f"DATABASE_URL={conn_str}\n")
        print(f"✅ Saved working connection to .env.working")
        break
        
    except Exception as e:
        print(f"❌ FAILED: {e}")