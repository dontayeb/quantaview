"""
Database migration to add email verification fields to User table
Run this to update existing database schema
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def run_migration():
    """Add email verification columns to users table"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in environment")
        return False
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Add new columns for email verification
            migration_sql = """
            DO $$ 
            BEGIN
                -- Add is_email_verified column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'is_email_verified'
                ) THEN
                    ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
                END IF;
                
                -- Add email_verification_token column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'email_verification_token'
                ) THEN
                    ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
                END IF;
                
                -- Add email_verification_sent_at column
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'email_verification_sent_at'
                ) THEN
                    ALTER TABLE users ADD COLUMN email_verification_sent_at TIMESTAMP;
                END IF;
                
                -- Update existing users to be verified (for backward compatibility)
                UPDATE users SET is_email_verified = TRUE WHERE is_email_verified IS NULL;
            END $$;
            """
            
            conn.execute(text(migration_sql))
            conn.commit()
            
        print("✅ Migration completed successfully!")
        print("Added email verification fields to users table")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("Running email verification migration...")
    success = run_migration()
    sys.exit(0 if success else 1)