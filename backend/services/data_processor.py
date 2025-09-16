import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from models import Trade, TradingAccount
from typing import List, Dict, Any
from datetime import datetime, timedelta

class DataProcessor:
    """Pandas-based data processing for trading analytics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_trades_dataframe(self, account_id: str = None, user_id: str = None) -> pd.DataFrame:
        """Convert trades to pandas DataFrame for analysis"""
        query = self.db.query(Trade)
        
        if account_id:
            query = query.filter(Trade.trading_account_id == account_id)
        elif user_id:
            query = query.join(TradingAccount).filter(TradingAccount.user_id == user_id)
        
        trades = query.all()
        
        if not trades:
            return pd.DataFrame()
        
        # Convert to DataFrame
        data = []
        for trade in trades:
            data.append({
                'id': trade.id,
                'account_id': trade.trading_account_id,
                'symbol': trade.symbol,
                'type': trade.type,
                'volume': trade.volume,
                'open_price': trade.open_price,
                'close_price': trade.close_price,
                'stop_loss': trade.stop_loss,
                'take_profit': trade.take_profit,
                'profit': trade.profit,
                'commission': trade.commission,
                'swap': trade.swap,
                'net_profit': trade.profit + trade.commission + trade.swap,
                'open_time': trade.open_time,
                'close_time': trade.close_time,
                'duration_hours': self._calculate_duration_hours(trade.open_time, trade.close_time),
                'hour_opened': trade.open_time.hour if trade.open_time else None,
                'day_of_week': trade.open_time.weekday() if trade.open_time else None,  # 0=Monday
                'is_profitable': (trade.profit + trade.commission + trade.swap) > 0
            })
        
        df = pd.DataFrame(data)
        
        # Additional feature engineering
        if not df.empty:
            df['month'] = pd.to_datetime(df['open_time']).dt.month
            df['week_of_year'] = pd.to_datetime(df['open_time']).dt.isocalendar().week
            df['is_weekend'] = df['day_of_week'].isin([5, 6])  # Saturday, Sunday
            
        return df
    
    def _calculate_duration_hours(self, open_time: datetime, close_time: datetime = None) -> float:
        """Calculate trade duration in hours"""
        if not open_time or not close_time:
            return None
        return (close_time - open_time).total_seconds() / 3600
    
    def calculate_basic_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate basic trading metrics"""
        if df.empty:
            return {}
        
        closed_trades = df[df['close_time'].notna()]
        
        return {
            'total_trades': len(df),
            'closed_trades': len(closed_trades),
            'total_profit': df['net_profit'].sum(),
            'avg_profit': df['net_profit'].mean(),
            'win_rate': (df['is_profitable'].sum() / len(df)) * 100 if len(df) > 0 else 0,
            'profit_factor': self._calculate_profit_factor(df),
            'max_drawdown': self._calculate_max_drawdown(df),
            'largest_win': df['net_profit'].max(),
            'largest_loss': df['net_profit'].min(),
        }
    
    def _calculate_profit_factor(self, df: pd.DataFrame) -> float:
        """Calculate profit factor (gross profit / gross loss)"""
        gross_profit = df[df['net_profit'] > 0]['net_profit'].sum()
        gross_loss = abs(df[df['net_profit'] < 0]['net_profit'].sum())
        
        if gross_loss == 0:
            return float('inf') if gross_profit > 0 else 0
        
        return gross_profit / gross_loss
    
    def _calculate_max_drawdown(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate maximum drawdown"""
        if df.empty:
            return {'amount': 0, 'percentage': 0}
        
        # Sort by open_time
        df_sorted = df.sort_values('open_time')
        
        # Calculate running balance (assuming starting balance from account)
        df_sorted['cumulative_profit'] = df_sorted['net_profit'].cumsum()
        df_sorted['running_peak'] = df_sorted['cumulative_profit'].expanding().max()
        df_sorted['drawdown'] = df_sorted['running_peak'] - df_sorted['cumulative_profit']
        
        max_drawdown_amount = df_sorted['drawdown'].max()
        
        # Calculate percentage drawdown
        peak_at_max_dd = df_sorted.loc[df_sorted['drawdown'].idxmax(), 'running_peak']
        max_drawdown_percentage = (max_drawdown_amount / peak_at_max_dd * 100) if peak_at_max_dd != 0 else 0
        
        return {
            'amount': max_drawdown_amount,
            'percentage': max_drawdown_percentage
        }
    
    def analyze_time_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze profitability by hour of day"""
        if df.empty:
            return []
        
        hourly_analysis = df.groupby('hour_opened').agg({
            'net_profit': ['sum', 'mean', 'count'],
            'is_profitable': 'mean'
        }).round(4)
        
        # Flatten column names
        hourly_analysis.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
        hourly_analysis['win_rate'] = hourly_analysis['win_rate'] * 100
        
        results = []
        for hour in range(24):
            if hour in hourly_analysis.index:
                stats = hourly_analysis.loc[hour]
                results.append({
                    'hour': hour,
                    'profit': float(stats['total_profit']),
                    'trade_count': int(stats['trade_count']),
                    'win_rate': float(stats['win_rate']),
                    'avg_profit': float(stats['avg_profit'])
                })
            else:
                results.append({
                    'hour': hour,
                    'profit': 0.0,
                    'trade_count': 0,
                    'win_rate': 0.0,
                    'avg_profit': 0.0
                })
        
        return results
    
    def analyze_pair_performance(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze profitability by currency pair"""
        if df.empty:
            return []
        
        pair_analysis = df.groupby('symbol').agg({
            'net_profit': ['sum', 'mean', 'count', 'std'],
            'is_profitable': 'mean'
        }).round(4)
        
        # Flatten column names
        pair_analysis.columns = ['total_profit', 'avg_profit', 'trade_count', 'profit_std', 'win_rate']
        pair_analysis['win_rate'] = pair_analysis['win_rate'] * 100
        pair_analysis['risk_score'] = pair_analysis['profit_std'] / abs(pair_analysis['avg_profit'])
        pair_analysis = pair_analysis.fillna(0)
        
        results = []
        for symbol in pair_analysis.index:
            stats = pair_analysis.loc[symbol]
            results.append({
                'symbol': symbol,
                'profit': float(stats['total_profit']),
                'trade_count': int(stats['trade_count']),
                'win_rate': float(stats['win_rate']),
                'avg_profit': float(stats['avg_profit']),
                'risk_score': float(stats['risk_score']) if not np.isinf(stats['risk_score']) else 0.0
            })
        
        # Sort by total profit descending
        results.sort(key=lambda x: x['profit'], reverse=True)
        
        return results