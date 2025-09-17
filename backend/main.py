from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import logging

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

if ENVIRONMENT == "production":
    allowed_origins = [FRONTEND_URL]
else:
    allowed_origins = ["http://localhost:3000", "http://localhost:3001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "*"],
)

# Try to include routers with database connection, fallback to basic endpoints
try:
    from database import get_db
    from routers import trades, accounts, analytics, api_keys, algorithms, auth
    
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(trades.router, prefix="/api/v1/trades", tags=["trades"])
    app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["accounts"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
    app.include_router(api_keys.router, prefix="/api/v1/api-keys", tags=["api-keys"])
    app.include_router(algorithms.router, prefix="/api/v1/algorithms", tags=["algorithms"])
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
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)