from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import TradingAccount as AccountModel
from schemas import TradingAccount, TradingAccountCreate

router = APIRouter()

@router.get("/{user_id}", response_model=List[TradingAccount])
async def get_accounts(user_id: UUID, db: Session = Depends(get_db)):
    """Get all trading accounts for a user"""
    accounts = db.query(AccountModel).filter(AccountModel.user_id == user_id).all()
    return accounts

@router.post("/", response_model=TradingAccount)
async def create_account(account: TradingAccountCreate, db: Session = Depends(get_db)):
    """Create a new trading account"""
    db_account = AccountModel(**account.dict())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@router.get("/account/{account_id}", response_model=TradingAccount)
async def get_account(account_id: UUID, db: Session = Depends(get_db)):
    """Get a specific trading account by ID"""
    account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account