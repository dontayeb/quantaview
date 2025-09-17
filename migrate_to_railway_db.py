#!/usr/bin/env python3
"""
Railway Database Migration Script
Run this script to set up your Railway PostgreSQL database with the complete schema
"""

import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

def run_migration(database_url):
    """Run the database migration SQL script"""
    
    # Read the migration SQL file
    with open('railway_database_migration.sql', 'r') as f:
        migration_sql = f.read()
    
    # Parse database URL
    parsed = urlparse(database_url)
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],  # Remove leading '/'
            user=parsed.username,
            password=parsed.password,
            sslmode='require'  # Railway requires SSL
        )
        
        # Execute migration
        with conn.cursor() as cursor:
            cursor.execute(migration_sql)
            conn.commit()
            
        print("✅ Database migration completed successfully!")
        
        # Test the connection
        with conn.cursor() as cursor:
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = cursor.fetchall()
            print(f"✅ Created {len(tables)} tables:")
            for table in tables:
                print(f"   - {table[0]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

def main():
    import sys
    print("🚂 Railway Database Migration Tool")
    print("=" * 40)
    
    # Get DATABASE_URL from command line or input
    if len(sys.argv) > 1:
        database_url = sys.argv[1].strip()
        print(f"Using DATABASE_URL from command line")
    else:
        database_url = input("Enter your Railway PostgreSQL DATABASE_URL: ").strip()
    
    if not database_url:
        print("❌ DATABASE_URL is required")
        return
    
    if not database_url.startswith('postgresql://'):
        print("❌ Invalid DATABASE_URL format. Should start with 'postgresql://'")
        return
    
    print(f"🔗 Connecting to: {database_url.split('@')[1] if '@' in database_url else 'database'}")
    
    # Run migration
    if run_migration(database_url):
        print("\n🎉 Migration completed! Next steps:")
        print("1. Update your Railway backend service environment variables:")
        print(f"   DATABASE_URL={database_url}")
        print("2. Redeploy your backend service")
        print("3. Test the connection")
    else:
        print("\n❌ Migration failed. Please check the error above.")

if __name__ == "__main__":
    main()