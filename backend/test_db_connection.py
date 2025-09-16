#!/usr/bin/env python3

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Testing connection to: {DATABASE_URL}")

# Test different connection approaches
print("\n=== Testing Direct Connection ===")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT version(), current_database(), current_user;")
    result = cursor.fetchone()
    print(f"✅ SUCCESS: {result}")
    
    # Test if our tables exist
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    tables = cursor.fetchall()
    print(f"📋 Available tables: {[t[0] for t in tables]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ FAILED: {e}")

print("\n=== Testing with IPv4 Pool Connection ===")
# Try with the pooler connection
POOL_URL = "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
try:
    conn = psycopg2.connect(POOL_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT version(), current_database(), current_user;")
    result = cursor.fetchone()
    print(f"✅ SUCCESS with pooler: {result}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ FAILED with pooler: {e}")

print("\n=== Testing with Session Mode (Port 6543) ===")
# Try with port 6543 (session mode) - correct format for session mode
POOL_URL_6543 = "postgresql://postgres.kbzgcgztdkmbgivixjuo:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
try:
    conn = psycopg2.connect(POOL_URL_6543)
    cursor = conn.cursor()
    cursor.execute("SELECT version(), current_database(), current_user;")
    result = cursor.fetchone()
    print(f"✅ SUCCESS with session mode: {result}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ FAILED with session mode: {e}")

print("\n=== Testing Alternative Session Mode Format ===")
# Try alternative format that might work better with session mode
ALT_URL = "postgresql://postgres:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
try:
    conn = psycopg2.connect(ALT_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT version(), current_database(), current_user;")
    result = cursor.fetchone()
    print(f"✅ SUCCESS with alternative format: {result}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ FAILED with alternative format: {e}")

print("\n=== Testing Transaction Mode (Port 5432) ===")
# Try transaction mode which might have different auth requirements
TRANS_URL = "postgresql://postgres:s0Izya5R3M8qqwL6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
try:
    conn = psycopg2.connect(TRANS_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT version(), current_database(), current_user;")
    result = cursor.fetchone()
    print(f"✅ SUCCESS with transaction mode: {result}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ FAILED with transaction mode: {e}")