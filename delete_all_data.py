#!/usr/bin/env python3

import psycopg2
import os
from urllib.parse import urlparse

# Railway database URL
DATABASE_URL = "postgresql://postgres:UMazQBpKgCczFMSvYpHwwTQJbpfhfgPr@switchyard.proxy.rlwy.net:27132/railway"

def delete_all_data():
    """Delete all data from the database"""
    try:
        # Parse the database URL
        url = urlparse(DATABASE_URL)
        
        # Connect to the database
        conn = psycopg2.connect(
            host=url.hostname,
            port=url.port,
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password
        )
        
        cur = conn.cursor()
        
        print("🚨 DELETING ALL DATA - This cannot be undone!")
        
        # Get counts before deletion
        tables_to_check = ['api_keys', 'trades', 'trading_accounts', 'user_profiles']
        counts = {}
        
        for table in tables_to_check:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
            print(f"Found {counts[table]} records in {table}")
        
        # Delete in order to avoid foreign key constraints
        print("\n1. Deleting API keys...")
        cur.execute("DELETE FROM api_keys")
        
        print("2. Deleting trades...")
        cur.execute("DELETE FROM trades")
        
        print("3. Deleting trading accounts...")
        cur.execute("DELETE FROM trading_accounts")
        
        print("4. Deleting users...")
        cur.execute("DELETE FROM user_profiles")
        
        # Commit the changes
        conn.commit()
        print("\n✅ All data deleted successfully!")
        
        # Verify deletion
        print("\nVerifying deletion:")
        for table in tables_to_check:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            remaining = cur.fetchone()[0]
            print(f"  {table}: {remaining} records remaining")
        
        cur.close()
        conn.close()
        
        return {
            "message": "Successfully deleted ALL data from database",
            "deleted": counts
        }
        
    except Exception as e:
        print(f"❌ Error deleting data: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return {"error": str(e)}

if __name__ == "__main__":
    result = delete_all_data()
    print(f"\nFinal result: {result}")