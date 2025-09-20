from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import os
from dotenv import load_dotenv
import logging

# Import error handlers
from utils.error_handlers import (
    APIError,
    api_error_handler,
    http_exception_handler,
    validation_exception_handler,
    database_exception_handler,
    general_exception_handler
)

# Configure logging
logging.basicConfig(level=logging.INFO)

load_dotenv()

app = FastAPI(
    title="QuantaView API",
    description="AI-powered trading analytics platform",
    version="1.0.0"
)

# Configure CORS - support both local and production origins
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")

# Parse CORS origins from environment variable or use defaults
if CORS_ORIGINS:
    try:
        import json
        allowed_origins = json.loads(CORS_ORIGINS)
    except:
        # Fallback if JSON parsing fails
        allowed_origins = CORS_ORIGINS.split(",")
elif ENVIRONMENT == "production":
    # Allow all origins for Railway deployment debugging
    # TODO: Replace with specific Railway URLs once known
    allowed_origins = ["*"]
else:
    # Development origins
    allowed_origins = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "*"],
    expose_headers=["*"]
)

# Add error handlers
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Try to include routers with database connection, fallback to basic endpoints
try:
    from database import get_db
    from sqlalchemy.orm import Session
    from routers import trades, accounts, analytics, api_keys, algorithms, auth
    
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(trades.router, prefix="/api/v1/trades", tags=["trades"])
    app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["accounts"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
    app.include_router(api_keys.router, prefix="/api/v1/api-keys", tags=["api-keys"])
    app.include_router(algorithms.router, prefix="/api/v1/algorithms", tags=["algorithms"])
    
    # Add temporary admin endpoint for database schema inspection
    @app.get("/admin/schema-inspect")
    async def schema_inspect(db: Session = Depends(get_db)):
        """Temporary endpoint to inspect database schema"""
        from sqlalchemy import text
        import json
        
        try:
            result = {"inspection": "Database Schema Inspection", "tables": {}, "foreign_keys": [], "findings": []}
            
            # 1. List all tables
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables_result = db.execute(tables_query)
            tables = [row[0] for row in tables_result.fetchall()]
            result["table_list"] = tables
            
            # 2. Inspect each table structure
            for table_name in tables:
                columns_query = text("""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_name = :table_name
                    ORDER BY ordinal_position
                """)
                
                columns_result = db.execute(columns_query, {"table_name": table_name})
                columns = []
                for col in columns_result.fetchall():
                    columns.append({
                        "name": col[0],
                        "type": col[1], 
                        "nullable": col[2] == "YES",
                        "default": col[3]
                    })
                result["tables"][table_name] = columns
            
            # 3. Foreign key constraints
            fk_query = text("""
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
            """)
            
            fk_result = db.execute(fk_query)
            for fk in fk_result.fetchall():
                result["foreign_keys"].append({
                    "table": fk[0],
                    "column": fk[1],
                    "references_table": fk[2],
                    "references_column": fk[3],
                    "constraint_name": fk[4]
                })
            
            # 4. Key findings
            if 'users' in tables and 'user_profiles' in tables:
                result["findings"].append("❌ BOTH 'users' and 'user_profiles' tables exist!")
            elif 'users' in tables:
                result["findings"].append("✅ Only 'users' table exists")
            elif 'user_profiles' in tables:
                result["findings"].append("✅ Only 'user_profiles' table exists")
            else:
                result["findings"].append("❌ Neither 'users' nor 'user_profiles' found!")
                
            if 'trading_accounts' in tables:
                ta_query = text("""
                    SELECT column_name, is_nullable, data_type
                    FROM information_schema.columns 
                    WHERE table_name = 'trading_accounts'
                    AND column_name IN ('password', 'server', 'user_id')
                """)
                ta_result = db.execute(ta_query)
                for row in ta_result.fetchall():
                    nullable = "NULL" if row[1] == "YES" else "NOT NULL"
                    result["findings"].append(f"📝 trading_accounts.{row[0]}: {nullable} ({row[2]})")
            
            return result
            
        except Exception as e:
            return {"error": str(e), "type": str(type(e))}
    
    logging.info("Database connection successful - Full API enabled")
except Exception as e:
    logging.warning(f"Database connection failed: {e} - Running with basic endpoints only")
    
    @app.get("/api/v1/analytics/test")
    async def test_analytics():
        import pandas as pd
        import numpy as np
        
        # Test data processing
        data = {'profit': [100, -50, 200, -30, 150]}
        df = pd.DataFrame(data)
        
        return {
            "message": "Analytics engine working! (No database connected)",
            "test_data": {
                "total_profit": float(df['profit'].sum()),
                "avg_profit": float(df['profit'].mean()),
                "trade_count": len(df)
            }
        }

@app.get("/")
async def root():
    return {"message": "QuantaView API - AI Trading Analytics"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "quantaview-api"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)