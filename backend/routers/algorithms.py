from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models.algorithm import TradingAlgorithm
from models.models import User
from dependencies import get_current_user

router = APIRouter()

# Pydantic models
class AlgorithmCreate(BaseModel):
    magic_number: int
    algo_name: str
    description: Optional[str] = None
    strategy_type: Optional[str] = None
    color: Optional[str] = "#3B82F6"

class AlgorithmUpdate(BaseModel):
    algo_name: Optional[str] = None
    description: Optional[str] = None
    strategy_type: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class AlgorithmResponse(BaseModel):
    id: str
    magic_number: int
    algo_name: str
    description: Optional[str]
    strategy_type: Optional[str]
    color: str
    is_active: bool
    trade_count: Optional[int] = 0  # Will be populated via query
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[AlgorithmResponse])
async def list_algorithms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all algorithms for the current user with trade counts"""
    from sqlalchemy import func
    from models.models import Trade
    
    # Query algorithms with trade counts
    algorithms = db.query(
        TradingAlgorithm,
        func.count(Trade.id).label('trade_count')
    ).outerjoin(
        Trade, TradingAlgorithm.magic_number == Trade.magic_number
    ).filter(
        TradingAlgorithm.user_id == current_user.id
    ).group_by(TradingAlgorithm.id).all()
    
    return [
        AlgorithmResponse(
            id=str(algo.TradingAlgorithm.id),
            magic_number=algo.TradingAlgorithm.magic_number,
            algo_name=algo.TradingAlgorithm.algo_name,
            description=algo.TradingAlgorithm.description,
            strategy_type=algo.TradingAlgorithm.strategy_type,
            color=algo.TradingAlgorithm.color,
            is_active=algo.TradingAlgorithm.is_active,
            trade_count=algo.trade_count
        )
        for algo in algorithms
    ]

@router.post("/", response_model=AlgorithmResponse)
async def create_algorithm(
    algo_data: AlgorithmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new algorithm mapping"""
    
    # Check if magic number already exists for this user
    existing = db.query(TradingAlgorithm).filter(
        TradingAlgorithm.user_id == current_user.id,
        TradingAlgorithm.magic_number == algo_data.magic_number
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Magic number {algo_data.magic_number} already exists"
        )
    
    new_algo = TradingAlgorithm(
        user_id=current_user.id,
        **algo_data.dict()
    )
    
    db.add(new_algo)
    db.commit()
    db.refresh(new_algo)
    
    return AlgorithmResponse(
        id=str(new_algo.id),
        magic_number=new_algo.magic_number,
        algo_name=new_algo.algo_name,
        description=new_algo.description,
        strategy_type=new_algo.strategy_type,
        color=new_algo.color,
        is_active=new_algo.is_active,
        trade_count=0
    )

@router.put("/{algo_id}", response_model=AlgorithmResponse)
async def update_algorithm(
    algo_id: str,
    algo_update: AlgorithmUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update algorithm details"""
    
    algorithm = db.query(TradingAlgorithm).filter(
        TradingAlgorithm.id == algo_id,
        TradingAlgorithm.user_id == current_user.id
    ).first()
    
    if not algorithm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Algorithm not found"
        )
    
    # Update fields
    for field, value in algo_update.dict(exclude_unset=True).items():
        setattr(algorithm, field, value)
    
    db.commit()
    db.refresh(algorithm)
    
    # Get trade count
    from sqlalchemy import func
    from models.models import Trade
    trade_count = db.query(func.count(Trade.id)).filter(
        Trade.magic_number == algorithm.magic_number
    ).scalar() or 0
    
    return AlgorithmResponse(
        id=str(algorithm.id),
        magic_number=algorithm.magic_number,
        algo_name=algorithm.algo_name,
        description=algorithm.description,
        strategy_type=algorithm.strategy_type,
        color=algorithm.color,
        is_active=algorithm.is_active,
        trade_count=trade_count
    )

@router.delete("/{algo_id}")
async def delete_algorithm(
    algo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an algorithm (soft delete - mark as inactive)"""
    
    algorithm = db.query(TradingAlgorithm).filter(
        TradingAlgorithm.id == algo_id,
        TradingAlgorithm.user_id == current_user.id
    ).first()
    
    if not algorithm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Algorithm not found"
        )
    
    algorithm.is_active = False
    db.commit()
    
    return {"message": "Algorithm deleted successfully"}

@router.get("/detect-unknown")
async def detect_unknown_algorithms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Find trades with magic numbers that don't have algorithm mappings"""
    from sqlalchemy import func
    from models.models import Trade
    
    # Find magic numbers in trades that aren't registered as algorithms
    unknown_magic_numbers = db.query(
        Trade.magic_number,
        func.count(Trade.id).label('trade_count'),
        func.min(Trade.open_time).label('first_seen'),
        func.max(Trade.open_time).label('last_seen')
    ).outerjoin(
        TradingAlgorithm,
        (Trade.magic_number == TradingAlgorithm.magic_number) &
        (TradingAlgorithm.user_id == current_user.id)
    ).filter(
        Trade.magic_number.isnot(None),
        TradingAlgorithm.id.is_(None)  # No matching algorithm
    ).group_by(Trade.magic_number).all()
    
    return [
        {
            "magic_number": result.magic_number,
            "trade_count": result.trade_count,
            "first_seen": result.first_seen,
            "last_seen": result.last_seen,
            "suggested_name": f"Algorithm_{result.magic_number}"
        }
        for result in unknown_magic_numbers
    ]