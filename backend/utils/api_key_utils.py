import secrets
import hashlib
import string
from typing import Tuple, Optional
from datetime import datetime, timedelta

class APIKeyGenerator:
    """Secure API key generation and validation utilities"""
    
    @staticmethod
    def generate_api_key() -> Tuple[str, str, str]:
        """
        Generate a secure API key with prefix
        Returns: (full_key, hash, prefix)
        """
        # Generate secure random key
        prefix = "qv_"  # QuantaView prefix
        key_length = 32
        
        # Use cryptographically secure random generation
        random_part = ''.join(secrets.choice(string.ascii_letters + string.digits) 
                             for _ in range(key_length))
        
        full_key = f"{prefix}{random_part}"
        
        # Create hash for storage (never store plain key)
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        # Store first 8 chars for display purposes
        display_prefix = full_key[:8] + "..."
        
        return full_key, key_hash, display_prefix
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash an API key for verification"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    @staticmethod
    def verify_api_key(provided_key: str, stored_hash: str) -> bool:
        """Verify an API key against stored hash"""
        provided_hash = APIKeyGenerator.hash_api_key(provided_key)
        return secrets.compare_digest(provided_hash, stored_hash)
    
    @staticmethod
    def is_valid_api_key_format(api_key: str) -> bool:
        """Check if API key has valid format"""
        if not api_key.startswith("qv_"):
            return False
        if len(api_key) != 35:  # qv_ + 32 chars
            return False
        # Check if contains only valid characters
        key_part = api_key[3:]  # Remove prefix
        return all(c in string.ascii_letters + string.digits for c in key_part)

class APIKeyScopes:
    """Define and manage API key scopes/permissions"""
    
    # Available scopes
    TRADES_WRITE = "trades:write"
    TRADES_READ = "trades:read" 
    ACCOUNT_READ = "account:read"
    ANALYTICS_READ = "analytics:read"
    
    # Scope groups for easy assignment
    EA_INTEGRATION = [TRADES_WRITE, ACCOUNT_READ]  # For EA bulk import
    READ_ONLY = [TRADES_READ, ACCOUNT_READ, ANALYTICS_READ]  # For dashboards
    
    @classmethod
    def get_all_scopes(cls) -> list:
        """Get all available scopes"""
        return [
            cls.TRADES_WRITE,
            cls.TRADES_READ,
            cls.ACCOUNT_READ, 
            cls.ANALYTICS_READ
        ]
    
    @classmethod
    def get_scope_description(cls, scope: str) -> str:
        """Get human-readable description for scope"""
        descriptions = {
            cls.TRADES_WRITE: "Upload trade data to your accounts",
            cls.TRADES_READ: "Read trade history and data", 
            cls.ACCOUNT_READ: "Read account information and settings",
            cls.ANALYTICS_READ: "Access trading analytics and insights"
        }
        return descriptions.get(scope, "Unknown scope")
    
    @classmethod
    def validate_scopes(cls, scopes: list) -> bool:
        """Validate that all scopes are valid"""
        valid_scopes = cls.get_all_scopes()
        return all(scope in valid_scopes for scope in scopes)

class RateLimiter:
    """Rate limiting utilities for API keys"""
    
    def __init__(self):
        self.request_history = {}  # In production, use Redis
    
    def is_rate_limited(self, api_key_id: str, limit_per_minute: int = 100) -> bool:
        """
        Check if API key has exceeded rate limit
        In production, this should use Redis with sliding window
        """
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        if api_key_id not in self.request_history:
            self.request_history[api_key_id] = []
        
        # Clean old requests
        self.request_history[api_key_id] = [
            req_time for req_time in self.request_history[api_key_id]
            if req_time > minute_ago
        ]
        
        # Check limit
        if len(self.request_history[api_key_id]) >= limit_per_minute:
            return True
        
        # Record this request
        self.request_history[api_key_id].append(now)
        return False

# Global rate limiter instance
rate_limiter = RateLimiter()