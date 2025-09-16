from fastapi import HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime

from database import get_db
from models.api_key import APIKey
from models.models import User, TradingAccount
from utils.api_key_utils import APIKeyGenerator, rate_limiter

class APIKeyAuth:
    """API key authentication dependency"""
    
    def __init__(self, required_scopes: List[str] = None):
        self.required_scopes = required_scopes or []
    
    async def __call__(
        self,
        x_api_key: Optional[str] = Header(None),
        authorization: Optional[str] = Header(None),
        db: Session = Depends(get_db)
    ) -> tuple[APIKey, User]:
        """
        Authenticate API key and return (api_key, user) tuple
        Supports both X-API-Key header and Authorization: Bearer format
        """
        
        # Extract API key from headers
        api_key = None
        if x_api_key:
            api_key = x_api_key
        elif authorization and authorization.startswith("Bearer "):
            api_key = authorization[7:]  # Remove "Bearer " prefix
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required",
                headers={"WWW-Authenticate": "ApiKey"}
            )
        
        # Validate API key format
        if not APIKeyGenerator.is_valid_api_key_format(api_key):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key format"
            )
        
        # Hash the provided key for lookup
        key_hash = APIKeyGenerator.hash_api_key(api_key)
        
        # Find API key in database
        db_api_key = db.query(APIKey).filter(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True
        ).first()
        
        if not db_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key"
            )
        
        # Check if expired
        if db_api_key.is_expired:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has expired"
            )
        
        # Check rate limiting
        if rate_limiter.is_rate_limited(
            str(db_api_key.id), 
            db_api_key.rate_limit_per_minute
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Check required scopes
        if self.required_scopes:
            for required_scope in self.required_scopes:
                if not db_api_key.has_scope(required_scope):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions. Required scope: {required_scope}"
                    )
        
        # Get associated user
        user = db.query(User).filter(User.id == db_api_key.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Associated user not found"
            )
        
        # Update last used timestamp
        db_api_key.update_last_used()
        db.commit()
        
        return db_api_key, user

# Convenience functions for common scope requirements
def require_trades_write():
    """Dependency for endpoints that need trades:write scope"""
    return APIKeyAuth(required_scopes=["trades:write"])

def require_trades_read():
    """Dependency for endpoints that need trades:read scope"""
    return APIKeyAuth(required_scopes=["trades:read"])

def require_account_read():
    """Dependency for endpoints that need account:read scope"""
    return APIKeyAuth(required_scopes=["account:read"])

def require_ea_scopes():
    """Dependency for EA integration endpoints"""
    return APIKeyAuth(required_scopes=["trades:write", "account:read"])

class TradingAccountAccess:
    """Check if API key has access to specific trading account"""
    
    @staticmethod
    async def verify_account_access(
        account_id: str,
        api_key: APIKey,
        user: User,
        db: Session
    ) -> TradingAccount:
        """
        Verify that the API key has access to the specified trading account
        Returns the trading account if access is granted
        """
        
        # Get the trading account
        trading_account = db.query(TradingAccount).filter(
            TradingAccount.id == account_id,
            TradingAccount.user_id == user.id
        ).first()
        
        if not trading_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trading account not found"
            )
        
        # If API key is scoped to a specific trading account, verify it matches
        if api_key.trading_account_id:
            if str(api_key.trading_account_id) != account_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="API key does not have access to this trading account"
                )
        
        return trading_account

# Exception handler for API key errors
class APIKeyError(Exception):
    """Custom exception for API key related errors"""
    
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)