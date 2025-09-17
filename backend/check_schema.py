#!/usr/bin/env python3
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if magic_number column exists
    query = """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'trades' AND table_schema = 'public'
    """
    columns = conn.execute(text(query)).fetchall()
    
    print('Trades table schema:')
    for col in columns:
        print(f'  {col[0]}: {col[1]}')
    
    # Check if magic_number column exists specifically
    magic_col = [col for col in columns if col[0] == 'magic_number']
    if magic_col:
        print(f'✅ magic_number column exists: {magic_col[0][1]}')
    else:
        print('❌ magic_number column missing')
        print('Need to run migration to add magic_number column')