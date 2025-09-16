from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from schemas import PatternInsight, TimeAnalysis, PairAnalysis
from analytics import PatternDetector
from analytics.advanced_insights import AdvancedInsightsEngine
from services import DataProcessor

router = APIRouter()

@router.get("/insights/{account_id}", response_model=List[PatternInsight])
async def get_trading_insights(account_id: UUID, db: Session = Depends(get_db)):
    """Get comprehensive AI-generated trading insights for an account"""
    import traceback
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Use the advanced insights engine for comprehensive analysis
        advanced_engine = AdvancedInsightsEngine(db)
        all_insights = advanced_engine.discover_all_insights(str(account_id))
        
        return all_insights
        
    except Exception as e:
        logger.error(f"Error generating insights for account {account_id}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

@router.get("/insights/basic/{account_id}", response_model=List[PatternInsight])
async def get_basic_trading_insights(account_id: UUID, db: Session = Depends(get_db)):
    """Get basic pattern-based insights (original implementation)"""
    try:
        pattern_detector = PatternDetector(db)
        
        # Get time-based insights
        time_insights = pattern_detector.detect_time_patterns(str(account_id))
        
        # Get pair-based insights  
        pair_insights = pattern_detector.detect_pair_patterns(str(account_id))
        
        # Combine all insights
        all_insights = time_insights + pair_insights
        
        # Sort by confidence and value
        all_insights.sort(key=lambda x: (x['confidence'], abs(x['value'])), reverse=True)
        
        return all_insights
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating basic insights: {str(e)}")

@router.get("/time-analysis/{account_id}", response_model=List[TimeAnalysis])
async def get_time_analysis(account_id: UUID, db: Session = Depends(get_db)):
    """Get hourly profitability analysis"""
    try:
        data_processor = DataProcessor(db)
        time_analysis = data_processor.analyze_time_patterns(
            data_processor.get_trades_dataframe(account_id=str(account_id))
        )
        return time_analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing time patterns: {str(e)}")

@router.get("/pair-analysis/{account_id}", response_model=List[PairAnalysis])
async def get_pair_analysis(account_id: UUID, db: Session = Depends(get_db)):
    """Get currency pair performance analysis"""
    try:
        data_processor = DataProcessor(db)
        pair_analysis = data_processor.analyze_pair_performance(
            data_processor.get_trades_dataframe(account_id=str(account_id))
        )
        return pair_analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing pair performance: {str(e)}")

@router.get("/heatmap/hourly/{account_id}")
async def get_hourly_heatmap(account_id: UUID, db: Session = Depends(get_db)):
    """Get hourly profitability heatmap data"""
    try:
        data_processor = DataProcessor(db)
        df = data_processor.get_trades_dataframe(account_id=str(account_id))
        
        if df.empty:
            return {"data": [], "max_profit": 0, "min_profit": 0}
        
        # Create hourly heatmap data
        hourly_data = []
        for hour in range(24):
            hour_trades = df[df['hour_opened'] == hour]
            if not hour_trades.empty:
                hourly_data.append({
                    'hour': hour,
                    'profit': float(hour_trades['net_profit'].sum()),
                    'trade_count': len(hour_trades),
                    'avg_profit': float(hour_trades['net_profit'].mean()),
                    'win_rate': float(hour_trades['is_profitable'].mean() * 100)
                })
            else:
                hourly_data.append({
                    'hour': hour,
                    'profit': 0.0,
                    'trade_count': 0,
                    'avg_profit': 0.0,
                    'win_rate': 0.0
                })
        
        max_profit = max([h['profit'] for h in hourly_data])
        min_profit = min([h['profit'] for h in hourly_data])
        
        return {
            "data": hourly_data,
            "max_profit": max_profit,
            "min_profit": min_profit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating heatmap: {str(e)}")

@router.get("/heatmap/daily/{account_id}")
async def get_daily_heatmap(account_id: UUID, db: Session = Depends(get_db)):
    """Get daily (weekday) profitability heatmap data"""
    try:
        data_processor = DataProcessor(db)
        df = data_processor.get_trades_dataframe(account_id=str(account_id))
        
        if df.empty:
            return {"data": [], "max_profit": 0, "min_profit": 0}
        
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        # Create daily heatmap data
        daily_data = []
        for day_idx in range(7):
            day_trades = df[df['day_of_week'] == day_idx]
            if not day_trades.empty:
                daily_data.append({
                    'day': day_names[day_idx],
                    'day_index': day_idx,
                    'profit': float(day_trades['net_profit'].sum()),
                    'trade_count': len(day_trades),
                    'avg_profit': float(day_trades['net_profit'].mean()),
                    'win_rate': float(day_trades['is_profitable'].mean() * 100)
                })
            else:
                daily_data.append({
                    'day': day_names[day_idx],
                    'day_index': day_idx,
                    'profit': 0.0,
                    'trade_count': 0,
                    'avg_profit': 0.0,
                    'win_rate': 0.0
                })
        
        max_profit = max([d['profit'] for d in daily_data])
        min_profit = min([d['profit'] for d in daily_data])
        
        return {
            "data": daily_data,
            "max_profit": max_profit,
            "min_profit": min_profit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating daily heatmap: {str(e)}")

@router.get("/lot-size-analysis/{account_id}")
async def get_lot_size_analysis(account_id: UUID, db: Session = Depends(get_db)):
    """Analyze profitability vs risk by lot size"""
    try:
        data_processor = DataProcessor(db)
        df = data_processor.get_trades_dataframe(account_id=str(account_id))
        
        if df.empty:
            return {"analysis": [], "insights": []}
        
        import pandas as pd
        # Group by lot size ranges
        df['lot_range'] = pd.cut(df['volume'], bins=5, precision=2)
        
        lot_analysis = df.groupby('lot_range').agg({
            'net_profit': ['sum', 'mean', 'std', 'count'],
            'is_profitable': 'mean'
        })
        
        lot_analysis.columns = ['total_profit', 'avg_profit', 'profit_std', 'trade_count', 'win_rate']
        lot_analysis = lot_analysis.fillna(0)
        
        analysis_data = []
        for lot_range in lot_analysis.index:
            stats = lot_analysis.loc[lot_range]
            analysis_data.append({
                'lot_range': str(lot_range),
                'total_profit': float(stats['total_profit']),
                'avg_profit': float(stats['avg_profit']),
                'profit_std': float(stats['profit_std']),
                'trade_count': int(stats['trade_count']),
                'win_rate': float(stats['win_rate'] * 100),
                'risk_ratio': float(stats['profit_std'] / abs(stats['avg_profit'])) if stats['avg_profit'] != 0 else 0
            })
        
        # Generate insights
        insights = []
        if analysis_data:
            # Find optimal lot size range
            best_range = max(analysis_data, key=lambda x: x['avg_profit'] if x['trade_count'] >= 3 else -float('inf'))
            
            if best_range['trade_count'] >= 3:
                insights.append({
                    'type': 'lot_size_optimization',
                    'title': f'Optimal Lot Size Range: {best_range["lot_range"]}',
                    'description': f'Lot sizes in range {best_range["lot_range"]} show best average profit of ${best_range["avg_profit"]:.2f} with {best_range["win_rate"]:.1f}% win rate.',
                    'value': best_range['avg_profit'],
                    'confidence': min(0.80, best_range['trade_count'] / 10),
                    'recommendation': f'Consider focusing on lot sizes within {best_range["lot_range"]} range for optimal risk-adjusted returns.'
                })
        
        return {
            "analysis": analysis_data,
            "insights": insights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing lot sizes: {str(e)}")