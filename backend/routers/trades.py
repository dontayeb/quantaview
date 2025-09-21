from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import Trade as TradeModel
from schemas import Trade, TradeCreate

router = APIRouter()

@router.get("/{account_id}")
async def get_trades(account_id: UUID, db: Session = Depends(get_db)):
    """Get all trades for a trading account"""
    try:
        print(f"Getting trades for account: {account_id}")
        trades = db.query(TradeModel).filter(TradeModel.trading_account_id == account_id).all()
        print(f"Found {len(trades)} trades")
        
        # Return simplified trade data that matches frontend expectations
        result = []
        for trade in trades:
            try:
                trade_data = {
                    "id": str(trade.id),
                    "trading_account_id": str(trade.trading_account_id),
                    "position": trade.position,
                    "ticket": str(trade.ticket) if trade.ticket is not None else None,
                    "magic_number": trade.magic_number,
                    "symbol": trade.symbol,
                    "type": trade.type,
                    "volume": float(trade.volume),
                    "open_price": float(trade.open_price),
                    "close_price": float(trade.close_price) if trade.close_price else None,
                    "stop_loss": float(trade.stop_loss) if trade.stop_loss else None,
                    "take_profit": float(trade.take_profit) if trade.take_profit else None,
                    "profit": float(trade.profit),
                    "commission": float(trade.commission),
                    "swap": float(trade.swap),
                    "open_time": trade.open_time.isoformat() if trade.open_time else None,
                    "close_time": trade.close_time.isoformat() if trade.close_time else None,
                    "comment": trade.comment,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None,
                    "updated_at": trade.updated_at.isoformat() if trade.updated_at else None
                }
                result.append(trade_data)
            except Exception as trade_error:
                print(f"Error processing trade {trade.id}: {trade_error}")
                continue
        
        print(f"Successfully processed {len(result)} trades")
        return result
        
    except Exception as e:
        print(f"Error in get_trades: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Error retrieving trades: {str(e)}", "trades": []}

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

@router.get("/debug/count/{account_id}")
async def debug_trades_count(account_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to check trades count"""
    try:
        # Test raw SQL query
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) FROM trades WHERE trading_account_id = :account_id"), {"account_id": account_id})
        count = result.fetchone()[0]
        
        return {"account_id": account_id, "trade_count": count, "message": "Debug successful"}
    except Exception as e:
        return {"error": str(e), "account_id": account_id}