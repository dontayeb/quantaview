from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models.models import User
from utils.api_key_utils import APIKeyGenerator

security = HTTPBearer(auto_error=False)  # Don't auto-error on missing auth

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from JWT token
    """
    try:
        # Check if credentials are provided
        if not credentials:
            print("No credentials provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authorization header provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # In a real app, you'd verify the JWT token here
        # For now, return a mock user for testing
        token = credentials.credentials
        
        # Debug logging
        print(f"Received token: {token[:20]}..." if token else "No token received")
        if token == "test_token":
            print("WARNING: Received test_token instead of real JWT token")
        
        # Check if token is valid (for debugging, accept any non-empty token)
        if not token or token.strip() == "":
            print("Empty or invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Mock user for testing - replace with real JWT verification
        # Create a mock user object that matches the User model
        from uuid import UUID
        from datetime import datetime
        mock_user = User()
        mock_user.id = UUID("123e4567-e89b-12d3-a456-426614174000")
        mock_user.email = "test@example.com"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        mock_user.is_email_verified = True
        mock_user.created_at = datetime.utcnow()
        
        return mock_user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_api_key_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get user from API key authentication
    """
    try:
        api_key = credentials.credentials
        
        # Validate API key format
        if not APIKeyGenerator.is_valid_api_key_format(api_key):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key format"
            )
        
        # In a real app, you'd look up the API key in the database
        # For now, return a mock user
        from uuid import UUID
        mock_user = User()
        mock_user.id = UUID("123e4567-e89b-12d3-a456-426614174001")
        mock_user.email = "api@example.com"
        mock_user.full_name = "API User"
        mock_user.is_active = True
        mock_user.is_email_verified = True
        
        return mock_user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )