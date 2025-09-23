from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel, validator
from datetime import datetime
import uuid

from database import get_db
from models.models import Trade, TradingAccount
from dependencies.api_auth import require_ea_scopes, TradingAccountAccess
from utils.api_key_utils import APIKeyGenerator

router = APIRouter()

class BulkTradeItem(BaseModel):
    """Single trade item for bulk import"""
    ticket: int
    symbol: str
    trade_type: str  # "buy" or "sell"
    volume: float
    open_time: datetime
    open_price: float
    close_time: datetime = None
    close_price: float = None
    stop_loss: float = None
    take_profit: float = None
    profit: float = None
    commission: float = None
    swap: float = None
    comment: str = None
    
    @validator('trade_type')
    def validate_trade_type(cls, v):
        if v.lower() not in ['buy', 'sell']:
            raise ValueError('trade_type must be "buy" or "sell"')
        return v.lower()
    
    @validator('volume')
    def validate_volume(cls, v):
        if v <= 0:
            raise ValueError('volume must be positive')
        return v

class BulkTradeImport(BaseModel):
    """Bulk trade import request"""
    trading_account_id: str
    trades: List[BulkTradeItem]
    
    @validator('trades')
    def validate_trades_limit(cls, v):
        if len(v) > 1000:  # Limit batch size
            raise ValueError('Maximum 1000 trades per batch')
        if len(v) == 0:
            raise ValueError('At least one trade required')
        return v

class BulkImportResponse(BaseModel):
    """Response for bulk import operation"""
    success: bool
    total_submitted: int
    imported: int
    duplicates: int
    errors: int
    error_details: List[Dict[str, Any]] = []
    message: str

@router.post("/import", response_model=BulkImportResponse)
async def bulk_import_trades(
    import_data: BulkTradeImport,
    db: Session = Depends(get_db),
    auth: tuple = Depends(require_ea_scopes())
):
    """
    Bulk import trades from EA
    Requires trades:write and account:read scopes
    """
    
    api_key, user = auth
    
    # Verify access to trading account
    trading_account = await TradingAccountAccess.verify_account_access(
        import_data.trading_account_id,
        api_key,
        user,
        db
    )
    
    # Get existing tickets to avoid duplicates
    existing_tickets = set(
        db.query(Trade.ticket).filter(
            Trade.trading_account_id == trading_account.id
        ).scalars().all()
    )
    
    imported_count = 0
    duplicate_count = 0
    error_count = 0
    error_details = []
    
    for i, trade_item in enumerate(import_data.trades):
        try:
            # Check for duplicate
            if trade_item.ticket in existing_tickets:
                duplicate_count += 1
                continue
            
            # Validate and clean fields to fit database constraints
            original_symbol = trade_item.symbol or ""
            original_type = trade_item.trade_type or ""
            
            # Remove parentheses and their contents, then truncate to 20 chars
            import re
            symbol = re.sub(r'\([^)]*\)', '', original_symbol).strip()[:20]
            trade_type = original_type.strip()[:10]
            
            # Log if we had to modify the symbol
            if original_symbol != symbol:
                print(f"Symbol cleaned: '{original_symbol}' -> '{symbol}' (original: {len(original_symbol)} chars, cleaned: {len(symbol)} chars)")
            
            if original_type != trade_type:
                print(f"Type modified: '{original_type}' -> '{trade_type}'")
            
            # Convert to database model
            trade = Trade(
                id=uuid.uuid4(),
                trading_account_id=trading_account.id,
                ticket=trade_item.ticket,
                symbol=symbol,
                trade_type=trade_type,
                volume=trade_item.volume,
                open_time=trade_item.open_time,
                open_price=trade_item.open_price,
                close_time=trade_item.close_time,
                close_price=trade_item.close_price,
                stop_loss=trade_item.stop_loss,
                take_profit=trade_item.take_profit,
                profit=trade_item.profit or 0.0,
                commission=trade_item.commission or 0.0,
                swap=trade_item.swap or 0.0,
                comment=trade_item.comment or ""
            )
            
            db.add(trade)
            imported_count += 1
            
            # Add to existing tickets to prevent duplicates within this batch
            existing_tickets.add(trade_item.ticket)
            
        except Exception as e:
            error_count += 1
            error_details.append({
                "trade_index": i,
                "ticket": trade_item.ticket,
                "error": str(e)
            })
            
            # Continue processing other trades
            continue
    
    # Commit all successful trades
    try:
        db.commit()
        success = True
        message = f"Successfully imported {imported_count} trades"
        
        if duplicate_count > 0:
            message += f", skipped {duplicate_count} duplicates"
        if error_count > 0:
            message += f", {error_count} errors occurred"
            
    except Exception as e:
        db.rollback()
        success = False
        message = f"Database error: {str(e)}"
        error_count = len(import_data.trades)
        imported_count = 0
    
    return BulkImportResponse(
        success=success,
        total_submitted=len(import_data.trades),
        imported=imported_count,
        duplicates=duplicate_count,
        errors=error_count,
        error_details=error_details[:10],  # Limit error details to first 10
        message=message
    )

@router.post("/import/{trading_account_id}", response_model=BulkImportResponse)
async def bulk_import_trades_by_account(
    trading_account_id: str,
    trades: List[BulkTradeItem],
    db: Session = Depends(get_db),
    auth: tuple = Depends(require_ea_scopes())
):
    """
    Alternative endpoint with account ID in path
    Useful for EA integration where account is known
    """
    
    import_data = BulkTradeImport(
        trading_account_id=trading_account_id,
        trades=trades
    )
    
    return await bulk_import_trades(import_data, db, auth)

@router.get("/status/{trading_account_id}")
async def get_import_status(
    trading_account_id: str,
    db: Session = Depends(get_db),
    auth: tuple = Depends(require_ea_scopes())
):
    """
    Get import status for a trading account
    Useful for EA to check sync status
    """
    
    api_key, user = auth
    
    # Verify access to trading account
    trading_account = await TradingAccountAccess.verify_account_access(
        trading_account_id,
        api_key,
        user,
        db
    )
    
    # Get trade statistics
    total_trades = db.query(Trade).filter(
        Trade.trading_account_id == trading_account.id
    ).count()
    
    latest_trade = db.query(Trade).filter(
        Trade.trading_account_id == trading_account.id
    ).order_by(Trade.close_time.desc()).first()
    
    return {
        "trading_account_id": trading_account_id,
        "total_trades": total_trades,
        "latest_trade_time": latest_trade.close_time if latest_trade else None,
        "latest_trade_ticket": latest_trade.ticket if latest_trade else None,
        "account_active": True,
        "last_sync": datetime.utcnow()
    }

@router.delete("/trades/{trading_account_id}")
async def clear_account_trades(
    trading_account_id: str,
    confirm: bool = False,
    db: Session = Depends(get_db),
    auth: tuple = Depends(require_ea_scopes())
):
    """
    Clear all trades for an account (for testing/re-sync)
    Requires explicit confirmation
    """
    
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true to delete all trades"
        )
    
    api_key, user = auth
    
    # Verify access to trading account
    trading_account = await TradingAccountAccess.verify_account_access(
        trading_account_id,
        api_key,
        user,
        db
    )
    
    # Delete all trades for this account
    deleted_count = db.query(Trade).filter(
        Trade.trading_account_id == trading_account.id
    ).delete()
    
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} trades",
        "trading_account_id": trading_account_id
    }