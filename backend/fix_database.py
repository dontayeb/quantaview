#!/usr/bin/env python3

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection (same as database.py)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost/quantaview"
)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # First, check and update the key_prefix column
    print("Checking and updating key_prefix column...")
    result = conn.execute(text("""
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'key_prefix'
    """))
    column_info = result.fetchone()
    if column_info:
        print(f"Current key_prefix column: {column_info}")
        if column_info[2] != 20:  # character_maximum_length
            conn.execute(text("ALTER TABLE api_keys ALTER COLUMN key_prefix TYPE VARCHAR(20);"))
            print("Updated key_prefix column to VARCHAR(20)")
        else:
            print("key_prefix column is already VARCHAR(20)")
    
    # Create mock user if it doesn't exist
    print("Creating mock user...")
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    
    # Check if user exists
    result = conn.execute(text("SELECT id FROM users WHERE id = :user_id"), {"user_id": user_id})
    if not result.fetchone():
        # Insert mock user
        conn.execute(text("""
            INSERT INTO users (id, email, created_at, updated_at) 
            VALUES (:user_id, 'test@example.com', NOW(), NOW())
        """), {"user_id": user_id})
        print(f"Created mock user with ID: {user_id}")
    else:
        print("Mock user already exists")
    
    conn.commit()
    print("Database fixes completed successfully!")