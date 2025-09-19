from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import TradingAccount as AccountModel
from schemas import TradingAccount, TradingAccountCreate, TradingAccountUpdate

router = APIRouter()

@router.get("/{user_id}", response_model=List[TradingAccount])
async def get_accounts(user_id: UUID, db: Session = Depends(get_db)):
    """Get all trading accounts for a user"""
    accounts = db.query(AccountModel).filter(AccountModel.user_id == user_id).all()
    return accounts

@router.post("/", response_model=TradingAccount)
async def create_account(account: TradingAccountCreate, db: Session = Depends(get_db)):
    """Create a new trading account"""
    try:
        print(f"Creating account with data: {account.dict()}")
        
        # Check if user exists, create mock user if needed
        from models.models import User
        user = db.query(User).filter(User.id == account.user_id).first()
        if not user:
            print(f"User not found: {account.user_id}, creating mock user")
            # Create mock user for development
            mock_user = User(
                id=account.user_id,
                email="test@example.com",
                full_name="Test User",
                is_active=True,
                is_email_verified=True
            )
            db.add(mock_user)
            db.commit()
            print(f"Created mock user: {account.user_id}")
        
        # Check for duplicate account number
        existing_account = db.query(AccountModel).filter(
            AccountModel.account_number == account.account_number
        ).first()
        if existing_account:
            print(f"Duplicate account number: {account.account_number}")
            raise HTTPException(status_code=400, detail=f"Account number {account.account_number} already exists")
        
        db_account = AccountModel(**account.dict())
        print(f"Created account model: {db_account}")
        
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        
        print(f"Account saved successfully: {db_account.id}")
        return db_account
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error creating account: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Data integrity constraint violated")

@router.get("/account/{account_id}", response_model=TradingAccount)
async def get_account(account_id: UUID, db: Session = Depends(get_db)):
    """Get a specific trading account by ID"""
    account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@router.put("/account/{account_id}", response_model=TradingAccount)
async def update_account(account_id: UUID, account_update: TradingAccountUpdate, db: Session = Depends(get_db)):
    """Update a trading account"""
    account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update only provided fields
    update_data = account_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    db.commit()
    db.refresh(account)
    return account

@router.delete("/account/{account_id}")
async def delete_account(account_id: UUID, db: Session = Depends(get_db)):
    """Delete a trading account"""
    account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db.delete(account)
    db.commit()
    return {"message": "Account deleted successfully"}