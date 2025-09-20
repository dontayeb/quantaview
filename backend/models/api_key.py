from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime, timedelta, timezone
from database import Base

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # User-friendly name
    key_hash = Column(String(255), nullable=False, unique=True)  # Hashed API key
    key_prefix = Column(String(20), nullable=False)  # First few chars for display
    
    # Permissions
    scopes = Column(ARRAY(String), nullable=True, default=[])  # PostgreSQL array of scopes
    
    # Ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True)
    trading_account_id = Column(UUID(as_uuid=True), ForeignKey("trading_accounts.id"), nullable=True)
    
    # Security
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_profile = relationship("UserProfile", back_populates="api_keys")
    trading_account = relationship("TradingAccount", back_populates="api_keys")
    
    @property
    def is_expired(self) -> bool:
        """Check if the API key has expired"""
        if self.expires_at is None:
            return False
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            expires_at_utc = self.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_utc = self.expires_at
        return now > expires_at_utc
    
    @property
    def days_until_expiry(self) -> int:
        """Get days until expiry"""
        if self.expires_at is None:
            return None
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            expires_at_utc = self.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_utc = self.expires_at
        delta = expires_at_utc - now
        return max(0, delta.days)
    
    def has_scope(self, required_scope: str) -> bool:
        """Check if API key has required scope"""
        try:
            if self.scopes is None:
                return False
            return required_scope in self.scopes
        except:
            return False
    
    def update_last_used(self):
        """Update last used timestamp"""
        self.last_used_at = datetime.now(timezone.utc)