from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
import uuid

from database import get_db
from models import Trade as TradeModel

router = APIRouter()

class TradeBatch(BaseModel):
    trading_account_id: str
    deal_id: int
    position_id: int
    symbol: str
    type: str  # "buy" or "sell"
    volume: float
    price: float
    commission: float
    swap: float
    profit: float
    time: str  # ISO datetime string
    comment: str = ""

class TradeBatchRequest(BaseModel):
    trades: List[TradeBatch]

@router.post("/batch")
async def receive_trade_batch(
    batch: TradeBatchRequest, 
    db: Session = Depends(get_db)
):
    """
    Receive a batch of trades from MT5 EA
    """
    try:
        print(f"Received batch of {len(batch.trades)} trades from MT5")
        
        processed_count = 0
        skipped_count = 0
        
        for trade_data in batch.trades:
            try:
                # Convert trading_account_id to UUID
                try:
                    account_uuid = uuid.UUID(trade_data.trading_account_id)
                except ValueError:
                    print(f"Invalid UUID format for account ID: {trade_data.trading_account_id}")
                    continue
                
                # Check if deal already exists (prevent duplicates)
                existing_trade = db.query(TradeModel).filter(
                    TradeModel.trading_account_id == account_uuid,
                    TradeModel.ticket == trade_data.deal_id
                ).first()
                
                if existing_trade:
                    skipped_count += 1
                    continue
                
                # Parse the datetime string
                trade_time = datetime.fromisoformat(trade_data.time.replace('Z', '+00:00'))
                
                # Create new trade record
                db_trade = TradeModel(
                    id=uuid.uuid4(),
                    trading_account_id=account_uuid,
                    position=trade_data.position_id,
                    ticket=trade_data.deal_id,
                    magic_number=0,  # MT5 deals don't have magic numbers like positions do
                    symbol=trade_data.symbol,
                    type=trade_data.type,
                    volume=trade_data.volume,
                    open_price=trade_data.price,
                    close_price=trade_data.price,  # For deals, open and close price are the same
                    stop_loss=None,
                    take_profit=None,
                    profit=trade_data.profit,
                    commission=trade_data.commission,
                    swap=trade_data.swap,
                    open_time=trade_time,
                    close_time=trade_time,  # For deals, this represents the execution time
                    comment=trade_data.comment
                )
                
                db.add(db_trade)
                processed_count += 1
                
            except Exception as e:
                print(f"Error processing individual trade: {e}")
                continue
        
        # Commit all trades in the batch
        db.commit()
        
        print(f"Trade batch processed: {processed_count} new, {skipped_count} skipped")
        
        return {
            "message": "Trade batch processed successfully",
            "processed": processed_count,
            "skipped": skipped_count,
            "total": len(batch.trades)
        }
        
    except Exception as e:
        print(f"Error processing trade batch: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process trade batch: {str(e)}")