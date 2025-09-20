#!/usr/bin/env python3
"""
Script to find and fix orphaned trading accounts that aren't showing up
due to schema changes and user table migrations.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = "postgresql://postgres:DoKkOowLHaKmpEnEXZLJyxZfWDHGTksP@switchyard.proxy.rlwy.net:27132/railway"

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("=== ORPHANED ACCOUNT ANALYSIS ===\n")
        
        # 1. Find all trading accounts
        cursor.execute("""
            SELECT 
                id, user_id, account_name, account_number, 
                broker, account_type, currency, starting_balance,
                created_at, 
                password IS NULL as missing_password,
                server IS NULL as missing_server
            FROM trading_accounts 
            ORDER BY created_at
        """)
        all_accounts = cursor.fetchall()
        
        print(f"📊 Total trading accounts: {len(all_accounts)}")
        
        # 2. Find accounts with NULL user_id
        null_user_accounts = [acc for acc in all_accounts if acc['user_id'] is None]
        print(f"❌ Accounts with NULL user_id: {len(null_user_accounts)}")
        
        # 3. Find accounts with missing required fields
        missing_fields_accounts = [acc for acc in all_accounts if acc['missing_password'] or acc['missing_server']]
        print(f"❌ Accounts with missing password/server: {len(missing_fields_accounts)}")
        
        # 4. Check user tables
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) FROM user_profiles")
        user_profiles_count = cursor.fetchone()['count']
        
        print(f"👥 Users table: {users_count} records")
        print(f"👥 User_profiles table: {user_profiles_count} records")
        
        # 5. Find accounts that might belong to users table instead of user_profiles
        cursor.execute("""
            SELECT 
                ta.id, ta.account_name, ta.user_id, ta.created_at,
                up.email as profile_email,
                u.email as user_email
            FROM trading_accounts ta
            LEFT JOIN user_profiles up ON ta.user_id = up.id
            LEFT JOIN users u ON ta.user_id = u.id
            ORDER BY ta.created_at
        """)
        account_user_mapping = cursor.fetchall()
        
        print("\n=== ACCOUNT-USER MAPPING ===")
        for acc in account_user_mapping:
            user_type = "None"
            if acc['profile_email']:
                user_type = f"user_profiles ({acc['profile_email']})"
            elif acc['user_email']:
                user_type = f"users ({acc['user_email']})"
            
            print(f"Account: {acc['account_name']} | Created: {str(acc['created_at'])[:10]} | User: {user_type}")
        
        # 6. Show specific problematic accounts
        print("\n=== PROBLEMATIC ACCOUNTS ===")
        for acc in all_accounts:
            issues = []
            if acc['user_id'] is None:
                issues.append("NULL user_id")
            if acc['missing_password']:
                issues.append("missing password")
            if acc['missing_server']:
                issues.append("missing server")
            
            if issues:
                print(f"❌ {acc['account_name']} | Created: {str(acc['created_at'])[:10]} | Issues: {', '.join(issues)}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()