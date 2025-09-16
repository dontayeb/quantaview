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

# Update the key_prefix column
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE api_keys ALTER COLUMN key_prefix TYPE VARCHAR(20);"))
    conn.commit()
    print("Successfully updated key_prefix column to VARCHAR(20)")