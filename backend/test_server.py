"""
Simple test to check if FastAPI server starts without database connection
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create a simple test app
app = FastAPI(title="QuantaView Test API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "QuantaView FastAPI Backend is running!", "status": "success"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "quantaview-test-api"}

@app.get("/test-analytics")
async def test_analytics():
    import pandas as pd
    import numpy as np
    
    # Test data processing
    data = {'profit': [100, -50, 200, -30, 150]}
    df = pd.DataFrame(data)
    
    return {
        "message": "Analytics engine working!",
        "test_data": {
            "total_profit": float(df['profit'].sum()),
            "avg_profit": float(df['profit'].mean()),
            "trade_count": len(df)
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting QuantaView Test Server...")
    print("Visit: http://localhost:8000")
    print("Visit: http://localhost:8000/test-analytics")
    uvicorn.run(app, host="0.0.0.0", port=8000)