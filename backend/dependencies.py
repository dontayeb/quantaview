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
        
        token = credentials.credentials
        print(f"Validating JWT token: {token[:20]}..." if token else "No token received")
        
        # Check if token is valid
        if not token or token.strip() == "":
            print("Empty or invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Import JWT verification function from auth router
        import jwt
        from uuid import UUID
        
        # JWT settings (must match auth.py)
        SECRET_KEY = "your-secret-key-change-this-in-production"  # In production, use environment variable
        ALGORITHM = "HS256"
        
        try:
            # Decode and verify the JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id_str = payload.get("sub")
            
            if user_id_str is None:
                print("No user ID in token payload")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Convert to UUID and find user in database
            user_id = UUID(user_id_str)
            user = db.query(User).filter(User.id == user_id).first()
            
            if user is None:
                print(f"User not found for ID: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            if not user.is_active:
                print(f"Inactive user attempted access: {user.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Inactive user",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            print(f"✅ Authenticated user: {user.email} (ID: {user.id})")
            return user
            
        except jwt.ExpiredSignatureError:
            print("Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError as e:
            print(f"JWT validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
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