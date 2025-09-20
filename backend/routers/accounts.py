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
        
        # Check if user exists in user_profiles table, create if needed
        from sqlalchemy import text
        
        # Check if user exists in user_profiles
        result = db.execute(text("SELECT id FROM user_profiles WHERE id = :user_id"), {"user_id": account.user_id})
        user_exists = result.fetchone()
        
        if not user_exists:
            print(f"User not found in user_profiles: {account.user_id}, looking up from users table")
            
            # Get actual user data from users table
            user_result = db.execute(text("SELECT email, full_name FROM users WHERE id = :user_id"), {"user_id": account.user_id})
            user_data = user_result.fetchone()
            
            if user_data:
                # Create user_profile entry with actual user data
                db.execute(text("""
                    INSERT INTO user_profiles (id, email, full_name, created_at, updated_at) 
                    VALUES (:user_id, :email, :full_name, NOW(), NOW())
                """), {
                    "user_id": account.user_id,
                    "email": user_data.email,
                    "full_name": user_data.full_name or "User"
                })
                db.commit()
                print(f"Created user_profile from users table: {account.user_id}")
            else:
                print(f"User {account.user_id} not found in users table either")
                raise HTTPException(status_code=400, detail="User not found")
        
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

@router.delete("/admin/delete-all")
async def delete_all_accounts(db: Session = Depends(get_db)):
    """Admin endpoint to delete all trading accounts - USE WITH CAUTION"""
    try:
        # Get count before deletion
        count = db.query(AccountModel).count()
        print(f"Deleting {count} trading accounts...")
        
        # Delete all trading accounts
        db.query(AccountModel).delete()
        db.commit()
        
        return {
            "message": f"Successfully deleted {count} trading accounts", 
            "deleted_count": count
        }
    except Exception as e:
        print(f"Error deleting accounts: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete accounts")

@router.get("/admin/check-account/{account_number}")
async def check_account_number(account_number: int, db: Session = Depends(get_db)):
    """Admin endpoint to check if an account number exists"""
    try:
        account = db.query(AccountModel).filter(
            AccountModel.account_number == account_number
        ).first()
        
        if account:
            return {
                "exists": True,
                "account_id": str(account.id),
                "account_name": account.account_name,
                "user_id": str(account.user_id) if account.user_id else None,
                "created_at": str(account.created_at)
            }
        else:
            return {"exists": False}
            
    except Exception as e:
        print(f"Error checking account: {e}")
        raise HTTPException(status_code=500, detail="Failed to check account")