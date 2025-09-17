from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trading_accounts = relationship("TradingAccount", back_populates="user")
    algorithms = relationship("TradingAlgorithm", back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")

class TradingAccount(Base):
    __tablename__ = "trading_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    account_name = Column(String, nullable=False)
    account_number = Column(String, nullable=True)
    broker = Column(String, nullable=True)
    account_type = Column(String, nullable=True)  # demo, live
    currency = Column(String, default="USD")
    starting_balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="trading_accounts")
    trades = relationship("Trade", back_populates="trading_account")
    api_keys = relationship("APIKey", back_populates="trading_account")

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trading_account_id = Column(UUID(as_uuid=True), ForeignKey("trading_accounts.id"), nullable=False)
    
    # Trade identification
    position = Column(Integer, nullable=True)  # Position ID
    ticket = Column(Integer, nullable=True)  # MT4/MT5 ticket number
    magic_number = Column(Integer, nullable=True)  # EA/Algorithm identifier
    symbol = Column(String, nullable=False)  # Currency pair
    type = Column(String, nullable=False)  # buy/sell
    
    # Trade metrics
    volume = Column(Float, nullable=False)  # Lot size
    open_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    
    # Financial results
    profit = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    swap = Column(Float, default=0.0)
    
    # Timing
    open_time = Column(DateTime, nullable=False)
    close_time = Column(DateTime, nullable=True)
    
    # Additional metadata
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trading_account = relationship("TradingAccount", back_populates="trades")
    # Note: algorithm relationship handled via magic_number matching in queries