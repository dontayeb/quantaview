from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import Trade as TradeModel
from schemas import Trade, TradeCreate

router = APIRouter()

@router.get("/{account_id}", response_model=List[Trade])
async def get_trades(account_id: UUID, db: Session = Depends(get_db)):
    """Get all trades for a trading account"""
    trades = db.query(TradeModel).filter(TradeModel.trading_account_id == account_id).all()
    return trades

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