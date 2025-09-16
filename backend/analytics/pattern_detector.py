import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from services.data_processor import DataProcessor

class PatternDetector:
    """AI-powered pattern detection for trading insights"""
    
    def __init__(self, db: Session):
        self.db = db
        self.data_processor = DataProcessor(db)
    
    def detect_time_patterns(self, account_id: str) -> List[Dict[str, Any]]:
        """Detect most profitable time patterns"""
        df = self.data_processor.get_trades_dataframe(account_id=account_id)
        
        if df.empty:
            return []
        
        insights = []
        
        # Analyze hourly patterns
        hourly_insights = self._analyze_hourly_patterns(df)
        insights.extend(hourly_insights)
        
        # Analyze daily patterns
        daily_insights = self._analyze_daily_patterns(df)
        insights.extend(daily_insights)
        
        # Analyze session patterns (Asian, European, US)
        session_insights = self._analyze_session_patterns(df)
        insights.extend(session_insights)
        
        return insights
    
    def detect_pair_patterns(self, account_id: str) -> List[Dict[str, Any]]:
        """Detect currency pair performance patterns"""
        df = self.data_processor.get_trades_dataframe(account_id=account_id)
        
        if df.empty:
            return []
        
        insights = []
        
        # Best performing pairs
        best_pairs = self._find_best_performing_pairs(df)
        insights.extend(best_pairs)
        
        # Worst performing pairs
        worst_pairs = self._find_worst_performing_pairs(df)
        insights.extend(worst_pairs)
        
        # Risk analysis by pair
        risk_insights = self._analyze_pair_risk_patterns(df)
        insights.extend(risk_insights)
        
        return insights
    
    def _analyze_hourly_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Find most profitable hours of the day"""
        hourly_stats = df.groupby('hour_opened').agg({
            'net_profit': ['sum', 'mean', 'count'],
            'is_profitable': 'mean'
        })
        
        hourly_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
        
        # Filter hours with at least 5 trades for statistical significance
        significant_hours = hourly_stats[hourly_stats['trade_count'] >= 5]
        
        if significant_hours.empty:
            return []
        
        insights = []
        
        # Best performing hour
        best_hour = significant_hours['total_profit'].idxmax()
        best_stats = significant_hours.loc[best_hour]
        
        insights.append({
            'type': 'time_pattern',
            'title': f'Most Profitable Hour: {best_hour}:00',
            'description': f'Trading at {best_hour}:00 generated ${best_stats["total_profit"]:.2f} total profit with {best_stats["win_rate"]*100:.1f}% win rate across {int(best_stats["trade_count"])} trades.',
            'value': float(best_stats['total_profit']),
            'confidence': min(0.95, best_stats['trade_count'] / 20),  # Higher confidence with more trades
            'recommendation': f'Consider increasing trading activity around {best_hour}:00 for optimal performance.'
        })
        
        # Worst performing hour (if significantly bad)
        worst_hour = significant_hours['total_profit'].idxmin()
        worst_stats = significant_hours.loc[worst_hour]
        
        if worst_stats['total_profit'] < -50:  # Only flag if losses > $50
            insights.append({
                'type': 'time_pattern',
                'title': f'Least Profitable Hour: {worst_hour}:00',
                'description': f'Trading at {worst_hour}:00 resulted in ${abs(worst_stats["total_profit"]):.2f} total loss with {worst_stats["win_rate"]*100:.1f}% win rate.',
                'value': float(worst_stats['total_profit']),
                'confidence': min(0.90, worst_stats['trade_count'] / 20),
                'recommendation': f'Consider avoiding trades around {worst_hour}:00 or reducing position sizes during this hour.'
            })
        
        return insights
    
    def _analyze_daily_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Find most profitable days of the week"""
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        daily_stats = df.groupby('day_of_week').agg({
            'net_profit': ['sum', 'mean', 'count'],
            'is_profitable': 'mean'
        })
        
        daily_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
        
        # Filter days with at least 3 trades
        significant_days = daily_stats[daily_stats['trade_count'] >= 3]
        
        if significant_days.empty:
            return []
        
        insights = []
        
        # Best performing day
        best_day_idx = significant_days['total_profit'].idxmax()
        best_day_stats = significant_days.loc[best_day_idx]
        best_day_name = day_names[best_day_idx]
        
        insights.append({
            'type': 'time_pattern',
            'title': f'Most Profitable Day: {best_day_name}',
            'description': f'{best_day_name} trading generated ${best_day_stats["total_profit"]:.2f} total profit with {best_day_stats["win_rate"]*100:.1f}% win rate.',
            'value': float(best_day_stats['total_profit']),
            'confidence': min(0.85, best_day_stats['trade_count'] / 10),
            'recommendation': f'Consider concentrating more trading activity on {best_day_name}s.'
        })
        
        # Check for Friday patterns (often volatile)
        if 4 in significant_days.index:  # Friday = 4
            friday_stats = significant_days.loc[4]
            if friday_stats['win_rate'] < 0.4:  # Less than 40% win rate
                insights.append({
                    'type': 'time_pattern',
                    'title': 'Friday Trading Warning',
                    'description': f'Friday trading shows {friday_stats["win_rate"]*100:.1f}% win rate, indicating increased risk.',
                    'value': float(friday_stats['total_profit']),
                    'confidence': 0.75,
                    'recommendation': 'Consider reducing position sizes or avoiding trades on Fridays due to increased volatility.'
                })
        
        return insights
    
    def _analyze_session_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze performance by trading sessions"""
        # Define trading sessions (UTC hours)
        sessions = {
            'Asian': list(range(0, 8)),      # 00:00-08:00 UTC
            'European': list(range(7, 16)),   # 07:00-16:00 UTC  
            'US': list(range(13, 22)),        # 13:00-22:00 UTC
            'Overlap_EU_US': list(range(13, 16))  # 13:00-16:00 UTC
        }
        
        insights = []
        
        for session_name, hours in sessions.items():
            session_df = df[df['hour_opened'].isin(hours)]
            
            if len(session_df) < 5:  # Need at least 5 trades
                continue
            
            session_profit = session_df['net_profit'].sum()
            session_win_rate = session_df['is_profitable'].mean()
            trade_count = len(session_df)
            
            if session_profit > 100 or session_win_rate > 0.6:  # Good performance
                insights.append({
                    'type': 'session_pattern',
                    'title': f'Strong {session_name} Session Performance',
                    'description': f'{session_name} session trading shows ${session_profit:.2f} total profit with {session_win_rate*100:.1f}% win rate across {trade_count} trades.',
                    'value': float(session_profit),
                    'confidence': min(0.80, trade_count / 15),
                    'recommendation': f'Consider increasing exposure during {session_name} session hours.'
                })
        
        return insights
    
    def _find_best_performing_pairs(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify best performing currency pairs"""
        pair_stats = df.groupby('symbol').agg({
            'net_profit': ['sum', 'mean', 'count'],
            'is_profitable': 'mean'
        })
        
        pair_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
        
        # Filter pairs with at least 5 trades
        significant_pairs = pair_stats[pair_stats['trade_count'] >= 5]
        
        if significant_pairs.empty:
            return []
        
        insights = []
        
        # Top performing pair
        best_pair = significant_pairs['total_profit'].idxmax()
        best_stats = significant_pairs.loc[best_pair]
        
        insights.append({
            'type': 'pair_performance',
            'title': f'Top Performing Pair: {best_pair}',
            'description': f'{best_pair} generated ${best_stats["total_profit"]:.2f} total profit with {best_stats["win_rate"]*100:.1f}% win rate across {int(best_stats["trade_count"])} trades.',
            'value': float(best_stats['total_profit']),
            'confidence': min(0.90, best_stats['trade_count'] / 20),
            'recommendation': f'Consider increasing allocation to {best_pair} trades based on strong historical performance.'
        })
        
        return insights
    
    def _find_worst_performing_pairs(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify worst performing currency pairs"""
        pair_stats = df.groupby('symbol').agg({
            'net_profit': ['sum', 'mean', 'count'],
            'is_profitable': 'mean'
        })
        
        pair_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
        
        # Filter pairs with at least 3 trades and significant losses
        problem_pairs = pair_stats[
            (pair_stats['trade_count'] >= 3) & 
            (pair_stats['total_profit'] < -50)
        ]
        
        if problem_pairs.empty:
            return []
        
        insights = []
        
        worst_pair = problem_pairs['total_profit'].idxmin()
        worst_stats = problem_pairs.loc[worst_pair]
        
        insights.append({
            'type': 'pair_performance',
            'title': f'Underperforming Pair: {worst_pair}',
            'description': f'{worst_pair} resulted in ${abs(worst_stats["total_profit"]):.2f} total loss with {worst_stats["win_rate"]*100:.1f}% win rate.',
            'value': float(worst_stats['total_profit']),
            'confidence': min(0.85, worst_stats['trade_count'] / 15),
            'recommendation': f'Consider avoiding {worst_pair} trades or reducing position sizes until performance improves.'
        })
        
        return insights
    
    def _analyze_pair_risk_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze risk patterns by currency pair"""
        pair_stats = df.groupby('symbol').agg({
            'net_profit': ['sum', 'mean', 'std', 'count'],
            'is_profitable': 'mean'
        })
        
        pair_stats.columns = ['total_profit', 'avg_profit', 'profit_std', 'trade_count', 'win_rate']
        pair_stats = pair_stats[pair_stats['trade_count'] >= 5]  # Filter significant pairs
        
        if pair_stats.empty:
            return []
        
        insights = []
        
        # High volatility pairs (high standard deviation relative to mean profit)
        pair_stats['volatility_ratio'] = pair_stats['profit_std'] / abs(pair_stats['avg_profit'])
        pair_stats = pair_stats.replace([np.inf, -np.inf], np.nan).fillna(0)
        
        if not pair_stats.empty:
            high_vol_pair = pair_stats['volatility_ratio'].idxmax()
            high_vol_stats = pair_stats.loc[high_vol_pair]
            
            if high_vol_stats['volatility_ratio'] > 2:  # High volatility
                insights.append({
                    'type': 'risk_analysis',
                    'title': f'High Volatility Warning: {high_vol_pair}',
                    'description': f'{high_vol_pair} shows high profit volatility (σ/μ = {high_vol_stats["volatility_ratio"]:.1f}), indicating inconsistent performance.',
                    'value': float(high_vol_stats['volatility_ratio']),
                    'confidence': 0.75,
                    'recommendation': f'Consider using smaller position sizes for {high_vol_pair} due to high volatility.'
                })
        
        return insights