from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import Trade as TradeModel
from schemas import Trade, TradeCreate

router = APIRouter()

@router.get("/debug/{account_id}")
async def debug_trades(account_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to check trades"""
    try:
        # Test raw SQL query
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) FROM trades WHERE trading_account_id = :account_id"), {"account_id": account_id})
        count = result.fetchone()[0]
        
        return {"account_id": account_id, "trade_count": count, "message": "Debug successful"}
    except Exception as e:
        return {"error": str(e), "account_id": account_id}

@router.get("/{account_id}")
async def get_trades(account_id: UUID, db: Session = Depends(get_db)):
    """Get all trades for a trading account"""
    try:
        print(f"Getting trades for account: {account_id}")
        trades = db.query(TradeModel).filter(TradeModel.trading_account_id == account_id).all()
        print(f"Found {len(trades)} trades")
        
        # Debug first trade if any exist
        if trades:
            trade = trades[0]
            print(f"First trade: {trade.id}, symbol: {trade.symbol}, type: {trade.type}")
        
        # Return simplified data for debugging
        return [
            {
                "id": str(trade.id),
                "symbol": trade.symbol,
                "type": trade.type,
                "volume": trade.volume,
                "profit": trade.profit,
                "open_time": trade.open_time.isoformat() if trade.open_time else None,
                "close_time": trade.close_time.isoformat() if trade.close_time else None
            } for trade in trades
        ]
    except Exception as e:
        print(f"Error in get_trades: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error retrieving trades: {str(e)}")

@router.post("/", response_model=Trade)
async def create_trade(trade: TradeCreate, db: Session = Depends(get_db)):
    """Create a new trade"""
    db_trade = TradeModel(**trade.dict())
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return db_trade

@router.get("/trade/{trade_id}", response_model=Trade)
async def get_trade(trade_id: UUID, db: Session = Depends(get_db)):
    """Get a specific trade by ID"""
    trade = db.query(TradeModel).filter(TradeModel.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade