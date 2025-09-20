#!/usr/bin/env python3
"""
Database Schema Inspector
Run this script to inspect the actual database schema and compare with models
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from database import get_db
import json

def inspect_database():
    """Inspect the actual database schema"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment")
        return
    
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            print("=== DATABASE SCHEMA INSPECTION ===\n")
            
            # 1. List all tables
            print("1. ALL TABLES:")
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            for table in tables:
                print(f"   - {table}")
            print()
            
            # 2. Inspect each table structure
            for table_name in tables:
                print(f"2. TABLE: {table_name}")
                print("-" * 50)
                
                # Get columns
                result = conn.execute(text("""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_name = :table_name
                    ORDER BY ordinal_position
                """), {"table_name": table_name})
                
                columns = result.fetchall()
                for col in columns:
                    nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                    default = f" DEFAULT {col[3]}" if col[3] else ""
                    print(f"   {col[0]:<20} {col[1]:<15} {nullable}{default}")
                print()
            
            # 3. Foreign key constraints
            print("3. FOREIGN KEY CONSTRAINTS:")
            print("-" * 50)
            result = conn.execute(text("""
                SELECT 
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name,
                    tc.constraint_name
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                ORDER BY tc.table_name, kcu.column_name
            """))
            
            fks = result.fetchall()
            for fk in fks:
                print(f"   {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]} ({fk[4]})")
            print()
            
            # 4. Check for specific problematic tables
            print("4. KEY FINDINGS:")
            print("-" * 50)
            
            if 'users' in tables and 'user_profiles' in tables:
                print("   ❌ BOTH 'users' and 'user_profiles' tables exist!")
            elif 'users' in tables:
                print("   ✅ Only 'users' table exists")
            elif 'user_profiles' in tables:
                print("   ✅ Only 'user_profiles' table exists")
            else:
                print("   ❌ Neither 'users' nor 'user_profiles' found!")
                
            if 'trading_accounts' in tables:
                # Check trading_accounts columns
                result = conn.execute(text("""
                    SELECT column_name, is_nullable, data_type
                    FROM information_schema.columns 
                    WHERE table_name = 'trading_accounts'
                    AND column_name IN ('password', 'server', 'user_id')
                """))
                ta_cols = {row[0]: (row[1], row[2]) for row in result.fetchall()}
                
                if 'password' in ta_cols:
                    nullable = ta_cols['password'][0]
                    print(f"   📝 trading_accounts.password: {nullable} ({ta_cols['password'][1]})")
                if 'server' in ta_cols:
                    nullable = ta_cols['server'][0]
                    print(f"   📝 trading_accounts.server: {nullable} ({ta_cols['server'][1]})")
                if 'user_id' in ta_cols:
                    nullable = ta_cols['user_id'][0]
                    print(f"   📝 trading_accounts.user_id: {nullable} ({ta_cols['user_id'][1]})")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        engine.dispose()

if __name__ == "__main__":
    inspect_database()