from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets
import logging
import os

from database import get_db
from models.models import User
from services.email_service import email_service
from utils.error_handlers import (
    APIError,
    AuthenticationError,
    ValidationError,
    DatabaseError,
    log_request_error
)

router = APIRouter()
security = HTTPBearer()

# Configuration
SECRET_KEY = "your-secret-key-change-this-in-production"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isalpha() for c in v):
            raise ValueError('Password must contain at least one letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

    @validator('full_name')
    def validate_full_name(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError('Full name cannot be empty')
        return v.strip() if v else None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @validator('password')
    def validate_password_not_empty(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Password cannot be empty')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_email_verified: bool
    created_at: datetime

class EmailVerificationRequest(BaseModel):
    token: str

# Utility functions
def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        salt, password_hash = hashed_password.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == password_hash
    except ValueError:
        return False

def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_verification_token() -> str:
    """Generate a secure verification token"""
    return secrets.token_urlsafe(32)

def is_verification_token_expired(sent_at: datetime) -> bool:
    """Check if verification token is expired (24 hours)"""
    if not sent_at:
        return True
    return datetime.utcnow() - sent_at > timedelta(hours=24)

# Authentication endpoints
@router.post("/register", response_model=Token)
async def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise ValidationError(
                message="Email already registered",
                field_errors={"email": "This email address is already in use"}
            )
        
        # Hash password and generate verification token
        password_hash = hash_password(user_data.password)
        verification_token = generate_verification_token()
        
        # Create new user (inactive until email verified)
        new_user = User(
            email=user_data.email,
            password_hash=password_hash,
            full_name=user_data.full_name,
            is_active=False,
            is_email_verified=False,
            email_verification_token=verification_token,
            email_verification_sent_at=datetime.utcnow()
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Send verification email
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        email_sent = await email_service.send_verification_email(
            email=new_user.email,
            full_name=new_user.full_name,
            verification_token=verification_token,
            frontend_url=frontend_url
        )
        
        if not email_sent:
            logging.warning(f"Failed to send verification email to {new_user.email}")
        
        # For now, return a token even though user isn't verified
        # In a strict implementation, you might not return a token until verified
        access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
        
        logging.info(f"User registered successfully: {new_user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(new_user.id),
                "email": new_user.email,
                "full_name": new_user.full_name,
                "is_active": new_user.is_active,
                "is_email_verified": new_user.is_email_verified
            }
        }
    
    except ValidationError:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        log_request_error("register", "POST", e, request_data={"email": user_data.email})
        raise DatabaseError("Failed to create user account")
    except Exception as e:
        db.rollback()
        log_request_error("register", "POST", e, request_data={"email": user_data.email})
        raise APIError("Registration failed due to an unexpected error")

@router.post("/login", response_model=Token)
async def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login a user"""
    
    try:
        # Find user by email
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            log_request_error("login", "POST", Exception("User not found"), request_data={"email": login_data.email})
            raise AuthenticationError("Invalid email or password")
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            log_request_error("login", "POST", Exception("Invalid password"), user_id=str(user.id))
            raise AuthenticationError("Invalid email or password")
        
        # Check email verification status first
        if not user.is_email_verified:
            log_request_error("login", "POST", Exception("Email not verified"), user_id=str(user.id))
            raise AuthenticationError("Please verify your email address before signing in. Check your email for a verification link.")
        
        # Check if user is active
        if not user.is_active:
            log_request_error("login", "POST", Exception("Inactive account"), user_id=str(user.id))
            raise AuthenticationError("Account is disabled. Please contact support.")
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
        
        logging.info(f"User logged in successfully: {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active
            }
        }
    
    except AuthenticationError:
        raise
    except SQLAlchemyError as e:
        log_request_error("login", "POST", e, request_data={"email": login_data.email})
        raise DatabaseError("Login failed due to database error")
    except Exception as e:
        log_request_error("login", "POST", e, request_data={"email": login_data.email})
        raise APIError("Login failed due to an unexpected error")

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization header provided"
        )
    
    # Verify token
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Get user from database
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at
    )

@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerificationRequest, 
    db: Session = Depends(get_db)
):
    """Verify user's email address"""
    
    try:
        # Find user by verification token
        user = db.query(User).filter(
            User.email_verification_token == verification_data.token
        ).first()
        
        if not user:
            raise AuthenticationError("Invalid verification token")
        
        # Check if token is expired
        if is_verification_token_expired(user.email_verification_sent_at):
            raise AuthenticationError("Verification token has expired")
        
        # Check if already verified
        if user.is_email_verified:
            return {"message": "Email already verified"}
        
        # Update user as verified
        user.is_email_verified = True
        user.is_active = True  # Activate user after email verification
        user.email_verification_token = None  # Clear the token
        user.email_verification_sent_at = None
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        logging.info(f"Email verified successfully for user: {user.email}")
        
        return {
            "message": "Email verified successfully",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_email_verified": user.is_email_verified
            }
        }
    
    except AuthenticationError:
        raise
    except SQLAlchemyError as e:
        log_request_error("verify-email", "POST", e)
        raise DatabaseError("Email verification failed due to database error")
    except Exception as e:
        log_request_error("verify-email", "POST", e)
        raise APIError("Email verification failed due to an unexpected error")

@router.post("/resend-verification")
async def resend_verification_email(
    email_data: dict,
    db: Session = Depends(get_db)
):
    """Resend verification email"""
    
    try:
        email = email_data.get("email")
        if not email:
            raise ValidationError("Email is required")
        
        # Find user by email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Don't reveal if email exists for security
            return {"message": "If this email is registered, a verification email has been sent"}
        
        # Check if already verified
        if user.is_email_verified:
            return {"message": "Email is already verified"}
        
        # Generate new verification token
        verification_token = generate_verification_token()
        user.email_verification_token = verification_token
        user.email_verification_sent_at = datetime.utcnow()
        
        db.commit()
        
        # Send verification email
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        email_sent = await email_service.send_verification_email(
            email=user.email,
            full_name=user.full_name,
            verification_token=verification_token,
            frontend_url=frontend_url
        )
        
        if not email_sent:
            logging.warning(f"Failed to resend verification email to {user.email}")
        
        return {"message": "If this email is registered, a verification email has been sent"}
    
    except ValidationError:
        raise
    except SQLAlchemyError as e:
        log_request_error("resend-verification", "POST", e)
        raise DatabaseError("Failed to resend verification email")
    except Exception as e:
        log_request_error("resend-verification", "POST", e)
        raise APIError("Failed to resend verification email")

@router.post("/logout")
async def logout_user():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}