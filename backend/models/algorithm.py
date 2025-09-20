from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid
from datetime import datetime

class TradingAlgorithm(Base):
    __tablename__ = "trading_algorithms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    magic_number = Column(Integer, nullable=False)
    algo_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    strategy_type = Column(String, nullable=True)  # scalping, swing, grid, martingale, etc.
    color = Column(String, default="#3B82F6")  # For dashboard visualization
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - disabled due to table mismatch
    # user = relationship("User", back_populates="algorithms")
    # Note: trades relationship handled via magic_number matching in queries
    
    # Ensure unique magic number per user
    __table_args__ = (UniqueConstraint('user_id', 'magic_number', name='unique_user_magic'),)