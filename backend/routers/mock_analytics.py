from fastapi import APIRouter
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter()

@router.get("/mock/insights/{account_id}")
async def get_mock_insights(account_id: UUID) -> List[Dict[str, Any]]:
    """Mock insights for testing when database is unavailable"""
    return [
        {
            'type': 'golden_hours',
            'title': 'Golden Trading Window: 8:00-10:00',
            'description': 'Consecutive profitable hours generated $2,847.50 with 73.2% win rate across 41 trades.',
            'value': 2847.50,
            'confidence': 0.89,
            'recommendation': 'Focus trading activity during 8:00-10:00 for maximum profitability.'
        },
        {
            'type': 'behavioral_warning',
            'title': 'Revenge Trading Detected',
            'description': 'After large losses, position sizes increased by 50%+ in 7 cases with 28.6% success rate.',
            'value': -180.25,
            'confidence': 0.85,
            'recommendation': 'Implement cooling-off period after large losses. Maintain consistent position sizing.'
        },
        {
            'type': 'risk_management',
            'title': 'Stop Loss Protection Effectiveness',
            'description': 'Trades without stop loss had maximum loss of $890.00 vs $245.00 with stop loss.',
            'value': 645.00,
            'confidence': 0.90,
            'recommendation': 'Always use stop losses. They prevented significantly larger losses.'
        },
        {
            'type': 'overtrading_warning',
            'title': 'Quality Over Quantity Pattern',
            'description': 'Low-frequency days (≤3 trades) average $127.30 vs high-frequency days (≥10 trades) $43.20.',
            'value': 84.10,
            'confidence': 0.80,
            'recommendation': 'Focus on trade quality over quantity. Fewer, well-analyzed trades show better performance.'
        },
        {
            'type': 'session_excellence',
            'title': 'Session Mastery: European-US Overlap',
            'description': 'European-US Overlap shows exceptional performance with $1,247.80 profit and 68.4% win rate.',
            'value': 1247.80,
            'confidence': 0.82,
            'recommendation': 'Increase trading frequency during European-US Overlap for optimal returns.'
        },
        {
            'type': 'pair_performance',
            'title': 'Top Performing Pair: GBPUSD',
            'description': 'GBPUSD generated $1,584.20 total profit with 71.2% win rate across 33 trades.',
            'value': 1584.20,
            'confidence': 0.88,
            'recommendation': 'Consider increasing allocation to GBPUSD trades based on strong historical performance.'
        },
        {
            'type': 'weekly_pattern',
            'title': 'Friday Afternoon Risk',
            'description': 'Late Friday trades (after 3 PM) show poor performance: -$340.50 with 32.1% win rate.',
            'value': -340.50,
            'confidence': 0.78,
            'recommendation': 'Avoid opening new positions on Friday afternoons due to weekend gap risk.'
        }
    ]

@router.get("/mock/heatmap/hourly/{account_id}")
async def get_mock_hourly_heatmap(account_id: UUID):
    """Mock hourly heatmap for testing"""
    hourly_data = []
    profits = [0, -20, 15, 45, 120, 200, 350, 420, 380, 290, 150, 80, 
              60, 45, 30, 85, 130, 180, 220, 160, 90, 40, 10, -10]
    
    for hour in range(24):
        hourly_data.append({
            'hour': hour,
            'profit': profits[hour],
            'trade_count': max(1, abs(profits[hour]) // 20),
            'avg_profit': profits[hour] / max(1, abs(profits[hour]) // 20),
            'win_rate': min(100, max(30, 50 + profits[hour] / 10))
        })
    
    return {
        "data": hourly_data,
        "max_profit": max(profits),
        "min_profit": min(profits)
    }

@router.get("/mock/heatmap/daily/{account_id}")
async def get_mock_daily_heatmap(account_id: UUID):
    """Mock daily heatmap for testing"""
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    profits = [180, 220, 150, 190, -80, 45, 20]
    
    daily_data = []
    for i, day in enumerate(day_names):
        daily_data.append({
            'day': day,
            'day_index': i,
            'profit': profits[i],
            'trade_count': max(2, abs(profits[i]) // 30),
            'avg_profit': profits[i] / max(2, abs(profits[i]) // 30),
            'win_rate': min(100, max(25, 50 + profits[i] / 5))
        })
    
    return {
        "data": daily_data,
        "max_profit": max(profits),
        "min_profit": min(profits)
    }