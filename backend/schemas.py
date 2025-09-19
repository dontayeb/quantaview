from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Trade schemas
class TradeBase(BaseModel):
    ticket: Optional[str] = None
    symbol: str
    type: str  # buy/sell
    volume: float
    open_price: float
    close_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    profit: float = 0.0
    commission: float = 0.0
    swap: float = 0.0
    open_time: datetime
    close_time: Optional[datetime] = None
    comment: Optional[str] = None
    magic_number: Optional[int] = None

class TradeCreate(TradeBase):
    trading_account_id: UUID

class Trade(TradeBase):
    id: UUID
    trading_account_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Trading Account schemas
class TradingAccountBase(BaseModel):
    account_name: str
    account_number: Optional[int] = None
    broker: Optional[str] = None
    account_type: Optional[str] = None
    currency: str = "USD"
    starting_balance: float = 0.0
    is_active: bool = True

class TradingAccountCreate(TradingAccountBase):
    user_id: UUID

class TradingAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    account_number: Optional[int] = None
    password: Optional[str] = None
    server: Optional[str] = None
    broker: Optional[str] = None
    account_type: Optional[str] = None
    currency: Optional[str] = None
    starting_balance: Optional[float] = None

class TradingAccount(TradingAccountBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    trades: List[Trade] = []
    
    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    trading_accounts: List[TradingAccount] = []
    
    class Config:
        from_attributes = True

# Analytics schemas
class PatternInsight(BaseModel):
    type: str  # "time_pattern", "pair_performance", etc.
    title: str
    description: str
    value: float
    confidence: float
    recommendation: Optional[str] = None

class TimeAnalysis(BaseModel):
    hour: int
    profit: float
    trade_count: int
    win_rate: float
    avg_profit: float

class PairAnalysis(BaseModel):
    symbol: str
    profit: float
    trade_count: int
    win_rate: float
    avg_profit: float
    risk_score: float