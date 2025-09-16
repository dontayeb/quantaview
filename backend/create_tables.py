#!/usr/bin/env python3
"""
Create database tables for QuantaView
Run this script to initialize the database schema
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine, Base
from models.models import User, TradingAccount, Trade
from models.api_key import APIKey
from models.algorithm import TradingAlgorithm

def create_all_tables():
    """Create all database tables"""
    try:
        print("Creating database tables...")
        
        # Import all models to ensure they're registered
        print("- Importing models...")
        
        # Create all tables
        print("- Creating tables...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database tables created successfully!")
        print("\nCreated tables:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    return True

if __name__ == "__main__":
    success = create_all_tables()
    sys.exit(0 if success else 1)