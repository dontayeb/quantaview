#!/usr/bin/env python3

import os
import socket
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Original DATABASE_URL: {DATABASE_URL}")

# Extract components from the URL
from urllib.parse import urlparse
parsed = urlparse(DATABASE_URL)
print(f"Host: {parsed.hostname}")
print(f"Username: {parsed.username}")
print(f"Password: {parsed.password}")
print(f"Database: {parsed.path[1:] if parsed.path.startswith('/') else parsed.path}")

# Try to resolve the hostname to IPv4 only
print(f"\n=== Resolving {parsed.hostname} ===")
try:
    # Force IPv4 resolution
    ipv4_addr = socket.getaddrinfo(parsed.hostname, parsed.port, socket.AF_INET)[0][4][0]
    print(f"IPv4 address: {ipv4_addr}")
    
    # Create a new connection string with the IPv4 address
    ipv4_url = f"postgresql://{parsed.username}:{parsed.password}@{ipv4_addr}:{parsed.port}/{parsed.path[1:] if parsed.path.startswith('/') else parsed.path}"
    print(f"IPv4 connection string: {ipv4_url}")
    
    # Test the IPv4 connection
    print(f"\n=== Testing IPv4 Direct Connection ===")
    conn = psycopg2.connect(ipv4_url)
    cursor = conn.cursor()
    cursor.execute("SELECT version(), current_database(), current_user;")
    result = cursor.fetchone()
    print(f"✅ SUCCESS with IPv4 direct: {result}")
    
    # Test if our tables exist
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    tables = cursor.fetchall()
    print(f"📋 Available tables: {[t[0] for t in tables]}")
    
    cursor.close()
    conn.close()
    
    # If successful, write the working connection string to a file
    with open('.env.working', 'w') as f:
        f.write(f"DATABASE_URL={ipv4_url}\n")
    print(f"✅ Saved working connection string to .env.working")
    
except socket.gaierror as e:
    print(f"❌ Failed to resolve hostname: {e}")
except Exception as e:
    print(f"❌ FAILED with IPv4 direct: {e}")