import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from services.data_processor import DataProcessor
from datetime import datetime, timedelta
import statistics
from collections import defaultdict

class AdvancedInsightsEngine:
    """Comprehensive AI insights engine that discovers all useful trading patterns"""
    
    def __init__(self, db: Session):
        self.db = db
        self.data_processor = DataProcessor(db)
    
    def discover_all_insights(self, account_id: str) -> List[Dict[str, Any]]:
        """Discover ALL types of useful insights for a trading account"""
        df = self.data_processor.get_trades_dataframe(account_id=account_id)
        
        if df.empty:
            return []
        
        insights = []
        
        # 1. Time-Based Insights
        insights.extend(self._analyze_time_patterns(df))
        insights.extend(self._analyze_trading_sessions(df))
        insights.extend(self._analyze_day_of_week_patterns(df))
        insights.extend(self._analyze_month_seasonality(df))
        
        # 2. Currency Pair Insights
        # insights.extend(self._analyze_pair_performance(df))  # TODO: Implement
        insights.extend(self._analyze_pair_correlations(df))
        # insights.extend(self._analyze_pair_volatility(df))  # TODO: Implement
        
        # 3. Position Management Insights
        insights.extend(self._analyze_lot_size_optimization(df))
        insights.extend(self._analyze_position_duration(df))
        insights.extend(self._analyze_stop_loss_effectiveness(df))
        insights.extend(self._analyze_take_profit_patterns(df))
        
        # 4. Risk Management Insights
        insights.extend(self._analyze_consecutive_losses(df))
        # insights.extend(self._analyze_drawdown_recovery(df))  # TODO: Implement
        # insights.extend(self._analyze_risk_reward_patterns(df))  # TODO: Implement
        insights.extend(self._analyze_overtrading_patterns(df))
        
        # 5. Market Condition Insights
        insights.extend(self._analyze_news_impact_times(df))
        insights.extend(self._analyze_weekend_gap_exposure(df))
        insights.extend(self._analyze_economic_event_correlation(df))
        
        # 6. Behavioral Insights
        insights.extend(self._analyze_revenge_trading(df))
        insights.extend(self._analyze_profit_taking_behavior(df))
        insights.extend(self._analyze_entry_timing_precision(df))
        insights.extend(self._analyze_emotional_trading_patterns(df))
        
        # 7. Portfolio Insights
        insights.extend(self._analyze_diversification_efficiency(df))
        insights.extend(self._analyze_capital_utilization(df))
        insights.extend(self._analyze_compounding_effectiveness(df))
        
        # 8. Performance Streaks
        insights.extend(self._analyze_winning_streaks(df))
        insights.extend(self._analyze_performance_cycles(df))
        
        # Sort by importance (confidence * abs(value))
        insights.sort(key=lambda x: x['confidence'] * abs(x.get('value', 0)), reverse=True)
        
        return insights[:20]  # Return top 20 most important insights
    
    def _analyze_time_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Advanced time pattern analysis"""
        insights = []
        
        # Hour-by-hour performance
        hourly_stats = df.groupby('hour_opened').agg({
            'net_profit': ['sum', 'mean', 'count', 'std'],
            'is_profitable': 'mean'
        })
        
        hourly_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'profit_std', 'win_rate']
        hourly_stats = hourly_stats[hourly_stats['trade_count'] >= 3]  # Statistical significance
        
        if not hourly_stats.empty:
            # Best consecutive hours
            best_hours = hourly_stats.nlargest(3, 'total_profit')
            consecutive_good_hours = self._find_consecutive_periods(best_hours.index.tolist())
            
            if consecutive_good_hours:
                for period in consecutive_good_hours:
                    if len(period) >= 2:
                        start_hour = min(period)
                        end_hour = max(period)
                        total_profit = hourly_stats.loc[period, 'total_profit'].sum()
                        total_trades = hourly_stats.loc[period, 'trade_count'].sum()
                        avg_win_rate = hourly_stats.loc[period, 'win_rate'].mean()
                        
                        insights.append({
                            'type': 'golden_hours',
                            'title': f'Golden Trading Window: {start_hour}:00-{end_hour+1}:00',
                            'description': f'Consecutive profitable hours generated ${total_profit:.2f} with {avg_win_rate*100:.1f}% win rate across {total_trades} trades.',
                            'value': float(total_profit),
                            'confidence': min(0.9, total_trades / 20),
                            'recommendation': f'Focus trading activity during {start_hour}:00-{end_hour+1}:00 for maximum profitability.'
                        })
            
            # Worst performance hours with high activity
            high_activity_hours = hourly_stats[hourly_stats['trade_count'] >= 5]
            if not high_activity_hours.empty:
                worst_active_hour = high_activity_hours['total_profit'].idxmin()
                worst_stats = high_activity_hours.loc[worst_active_hour]
                
                if worst_stats['total_profit'] < -100:
                    insights.append({
                        'type': 'danger_hour',
                        'title': f'Danger Zone: {worst_active_hour}:00',
                        'description': f'Despite high activity ({worst_stats["trade_count"]} trades), {worst_active_hour}:00 resulted in ${abs(worst_stats["total_profit"]):.2f} loss.',
                        'value': float(worst_stats['total_profit']),
                        'confidence': 0.85,
                        'recommendation': f'Avoid trading at {worst_active_hour}:00 or use reduced position sizes during this hour.'
                    })
        
        return insights
    
    def _analyze_trading_sessions(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze performance across different trading sessions"""
        insights = []
        
        # Define trading sessions with overlaps
        sessions = {
            'Asian': {'hours': list(range(21, 24)) + list(range(0, 8)), 'name': 'Asian Session'},
            'European': {'hours': list(range(7, 16)), 'name': 'European Session'},
            'US': {'hours': list(range(13, 22)), 'name': 'US Session'},
            'Asian_European_Overlap': {'hours': list(range(7, 8)), 'name': 'Asian-European Overlap'},
            'European_US_Overlap': {'hours': list(range(13, 16)), 'name': 'European-US Overlap'},
            'Dead_Zone': {'hours': list(range(16, 21)), 'name': 'Market Dead Zone'}
        }
        
        for session_key, session_info in sessions.items():
            session_df = df[df['hour_opened'].isin(session_info['hours'])]
            
            if len(session_df) >= 5:
                profit = session_df['net_profit'].sum()
                win_rate = session_df['is_profitable'].mean()
                trade_count = len(session_df)
                volatility = session_df['net_profit'].std()
                
                if profit > 200 or win_rate > 0.65:
                    insights.append({
                        'type': 'session_excellence',
                        'title': f'Session Mastery: {session_info["name"]}',
                        'description': f'{session_info["name"]} shows exceptional performance with ${profit:.2f} profit and {win_rate*100:.1f}% win rate.',
                        'value': float(profit),
                        'confidence': min(0.85, trade_count / 15),
                        'recommendation': f'Increase trading frequency during {session_info["name"]} for optimal returns.'
                    })
                elif profit < -200 or win_rate < 0.35:
                    insights.append({
                        'type': 'session_warning',
                        'title': f'Session Challenge: {session_info["name"]}',
                        'description': f'{session_info["name"]} shows poor performance with ${abs(profit):.2f} loss and {win_rate*100:.1f}% win rate.',
                        'value': float(profit),
                        'confidence': min(0.8, trade_count / 15),
                        'recommendation': f'Consider avoiding {session_info["name"]} or using conservative position sizes.'
                    })
        
        return insights
    
    def _analyze_consecutive_losses(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze consecutive loss patterns and recovery"""
        insights = []
        
        # Sort by time
        df_sorted = df.sort_values(['open_time'])
        df_sorted['is_loss'] = df_sorted['net_profit'] < 0
        
        # Find consecutive loss streaks
        consecutive_losses = []
        current_streak = 0
        max_streak = 0
        
        for is_loss in df_sorted['is_loss']:
            if is_loss:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                if current_streak > 0:
                    consecutive_losses.append(current_streak)
                current_streak = 0
        
        if consecutive_losses:
            avg_streak = statistics.mean(consecutive_losses)
            
            if max_streak >= 5:
                insights.append({
                    'type': 'risk_warning',
                    'title': f'Consecutive Loss Risk: {max_streak} Trades',
                    'description': f'Maximum consecutive losses reached {max_streak} trades. Average losing streak is {avg_streak:.1f} trades.',
                    'value': float(max_streak),
                    'confidence': 0.9,
                    'recommendation': f'Implement position size reduction after 3 consecutive losses to prevent large drawdowns.'
                })
        
        return insights
    
    def _analyze_revenge_trading(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect revenge trading patterns"""
        insights = []
        
        df_sorted = df.sort_values(['open_time'])
        df_sorted['prev_profit'] = df_sorted['net_profit'].shift(1)
        df_sorted['next_volume'] = df_sorted['volume'].shift(-1)
        
        # After big loss, increased position size
        big_losses = df_sorted[df_sorted['prev_profit'] < -200]
        if not big_losses.empty:
            revenge_trades = big_losses[big_losses['next_volume'] > big_losses['volume'] * 1.5]
            
            if len(revenge_trades) >= 3:
                revenge_success_rate = (revenge_trades['net_profit'] > 0).mean()
                avg_revenge_result = revenge_trades['net_profit'].mean()
                
                insights.append({
                    'type': 'behavioral_warning',
                    'title': 'Revenge Trading Detected',
                    'description': f'After large losses, position sizes increased by 50%+ in {len(revenge_trades)} cases with {revenge_success_rate*100:.1f}% success rate.',
                    'value': float(avg_revenge_result),
                    'confidence': 0.85,
                    'recommendation': 'Implement cooling-off period after large losses. Maintain consistent position sizing regardless of previous results.'
                })
        
        return insights
    
    def _analyze_overtrading_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect overtrading patterns"""
        insights = []
        
        # Daily trading frequency
        df['date'] = pd.to_datetime(df['open_time']).dt.date
        daily_trades = df.groupby('date').agg({
            'net_profit': ['sum', 'count'],
            'is_profitable': 'mean'
        })
        
        daily_trades.columns = ['daily_profit', 'trade_count', 'win_rate']
        
        # High frequency days vs performance
        high_freq_days = daily_trades[daily_trades['trade_count'] >= 10]
        low_freq_days = daily_trades[daily_trades['trade_count'] <= 3]
        
        if not high_freq_days.empty and not low_freq_days.empty:
            high_freq_avg_profit = high_freq_days['daily_profit'].mean()
            low_freq_avg_profit = low_freq_days['daily_profit'].mean()
            
            if low_freq_avg_profit > high_freq_avg_profit + 50:
                insights.append({
                    'type': 'overtrading_warning',
                    'title': 'Quality Over Quantity Pattern',
                    'description': f'Low-frequency days (≤3 trades) average ${low_freq_avg_profit:.2f} vs high-frequency days (≥10 trades) ${high_freq_avg_profit:.2f}.',
                    'value': float(low_freq_avg_profit - high_freq_avg_profit),
                    'confidence': 0.8,
                    'recommendation': 'Focus on trade quality over quantity. Fewer, well-analyzed trades show better performance.'
                })
        
        return insights
    
    def _analyze_stop_loss_effectiveness(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze stop loss usage and effectiveness"""
        insights = []
        
        trades_with_sl = df[df['stop_loss'].notna()]
        trades_without_sl = df[df['stop_loss'].isna()]
        
        if not trades_with_sl.empty and not trades_without_sl.empty:
            sl_avg_profit = trades_with_sl['net_profit'].mean()
            no_sl_avg_profit = trades_without_sl['net_profit'].mean()
            
            sl_max_loss = trades_with_sl['net_profit'].min()
            no_sl_max_loss = trades_without_sl['net_profit'].min()
            
            if abs(no_sl_max_loss) > abs(sl_max_loss) * 2:
                insights.append({
                    'type': 'risk_management',
                    'title': 'Stop Loss Protection Effectiveness',
                    'description': f'Trades without stop loss had maximum loss of ${abs(no_sl_max_loss):.2f} vs ${abs(sl_max_loss):.2f} with stop loss.',
                    'value': float(abs(no_sl_max_loss) - abs(sl_max_loss)),
                    'confidence': 0.9,
                    'recommendation': 'Always use stop losses. They prevented significantly larger losses in your trading history.'
                })
        
        return insights
    
    def _analyze_pair_correlations(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze currency pair correlation and diversification"""
        insights = []
        
        if len(df['symbol'].unique()) >= 3:
            pair_daily_profits = df.groupby(['symbol', df['open_time'].dt.date])['net_profit'].sum().reset_index()
            pair_pivot = pair_daily_profits.pivot(index='open_time', columns='symbol', values='net_profit').fillna(0)
            
            correlation_matrix = pair_pivot.corr()
            
            # Find highly correlated pairs
            high_correlations = []
            for i in range(len(correlation_matrix.columns)):
                for j in range(i+1, len(correlation_matrix.columns)):
                    corr = correlation_matrix.iloc[i, j]
                    if abs(corr) > 0.7:
                        pair1 = correlation_matrix.columns[i]
                        pair2 = correlation_matrix.columns[j]
                        high_correlations.append((pair1, pair2, corr))
            
            if high_correlations:
                for pair1, pair2, corr in high_correlations[:3]:
                    insights.append({
                        'type': 'diversification_warning',
                        'title': f'High Correlation: {pair1} & {pair2}',
                        'description': f'{pair1} and {pair2} show {abs(corr)*100:.0f}% correlation, reducing diversification benefits.',
                        'value': float(abs(corr)),
                        'confidence': 0.8,
                        'recommendation': f'Consider reducing simultaneous exposure to {pair1} and {pair2} to improve portfolio diversification.'
                    })
        
        return insights
    
    def _find_consecutive_periods(self, hours: List[int]) -> List[List[int]]:
        """Find consecutive periods from a list of hours"""
        if not hours:
            return []
        
        hours_sorted = sorted(hours)
        consecutive_groups = []
        current_group = [hours_sorted[0]]
        
        for i in range(1, len(hours_sorted)):
            if hours_sorted[i] == hours_sorted[i-1] + 1:
                current_group.append(hours_sorted[i])
            else:
                consecutive_groups.append(current_group)
                current_group = [hours_sorted[i]]
        
        consecutive_groups.append(current_group)
        return [group for group in consecutive_groups if len(group) >= 2]
    
    # Additional methods for other insight types...
    def _analyze_day_of_week_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Advanced day of week analysis"""
        insights = []
        
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        # Friday close behavior
        friday_trades = df[df['day_of_week'] == 4]  # Friday
        if not friday_trades.empty:
            friday_late_trades = friday_trades[friday_trades['hour_opened'] >= 15]  # After 3 PM
            if len(friday_late_trades) >= 3:
                late_friday_performance = friday_late_trades['net_profit'].sum()
                late_friday_win_rate = friday_late_trades['is_profitable'].mean()
                
                if late_friday_performance < -100 or late_friday_win_rate < 0.4:
                    insights.append({
                        'type': 'weekly_pattern',
                        'title': 'Friday Afternoon Risk',
                        'description': f'Late Friday trades (after 3 PM) show poor performance: ${late_friday_performance:.2f} with {late_friday_win_rate*100:.1f}% win rate.',
                        'value': float(late_friday_performance),
                        'confidence': 0.8,
                        'recommendation': 'Avoid opening new positions on Friday afternoons due to weekend gap risk and reduced liquidity.'
                    })
        
        return insights
    
    def _analyze_month_seasonality(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze monthly performance patterns"""
        insights = []
        
        monthly_stats = df.groupby('month').agg({
            'net_profit': ['sum', 'mean', 'count'],
            'is_profitable': 'mean'
        })
        
        monthly_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
        significant_months = monthly_stats[monthly_stats['trade_count'] >= 5]
        
        if len(significant_months) >= 3:
            best_month = significant_months['total_profit'].idxmax()
            worst_month = significant_months['total_profit'].idxmin()
            
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            
            best_profit = significant_months.loc[best_month, 'total_profit']
            worst_profit = significant_months.loc[worst_month, 'total_profit']
            
            if best_profit > abs(worst_profit) * 1.5:
                insights.append({
                    'type': 'seasonal_pattern',
                    'title': f'Strong Seasonal Performance: {month_names[best_month-1]}',
                    'description': f'{month_names[best_month-1]} consistently shows strong performance with ${best_profit:.2f} average profit.',
                    'value': float(best_profit),
                    'confidence': 0.7,
                    'recommendation': f'Consider increasing trading activity during {month_names[best_month-1]} based on historical seasonal strength.'
                })
        
        return insights
    
    def _analyze_position_duration(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze optimal position holding duration"""
        insights = []
        
        df_with_duration = df[df['duration_hours'].notna()]
        if not df_with_duration.empty:
            # Categorize by duration
            df_with_duration['duration_category'] = pd.cut(
                df_with_duration['duration_hours'], 
                bins=[0, 1, 4, 24, 168, float('inf')], 
                labels=['Scalp (<1h)', 'Short (1-4h)', 'Day (4-24h)', 'Swing (1-7d)', 'Position (>7d)']
            )
            
            duration_stats = df_with_duration.groupby('duration_category').agg({
                'net_profit': ['sum', 'mean', 'count'],
                'is_profitable': 'mean'
            })
            
            duration_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'win_rate']
            
            best_duration = duration_stats['avg_profit'].idxmax()
            best_avg_profit = duration_stats.loc[best_duration, 'avg_profit']
            best_win_rate = duration_stats.loc[best_duration, 'win_rate']
            
            insights.append({
                'type': 'duration_optimization',
                'title': f'Optimal Holding Period: {best_duration}',
                'description': f'{best_duration} trades show best average profit of ${best_avg_profit:.2f} with {best_win_rate*100:.1f}% win rate.',
                'value': float(best_avg_profit),
                'confidence': 0.8,
                'recommendation': f'Focus on {best_duration} trades as they align with your trading strength and market timing.'
            })
        
        return insights
    
    def _analyze_lot_size_optimization(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Advanced lot size optimization analysis"""
        insights = []
        
        if df['volume'].std() > 0:  # Variable lot sizes
            # Find optimal lot size for risk-adjusted returns
            try:
                # Try quantile-based binning first
                df['lot_category'] = pd.qcut(df['volume'], q=4, labels=['Small', 'Medium', 'Large', 'XLarge'], duplicates='drop')
            except (ValueError, TypeError) as e:
                # Fallback to simple binning if qcut fails
                try:
                    unique_volumes = df['volume'].nunique()
                    if unique_volumes >= 4:
                        df['lot_category'] = pd.cut(df['volume'], bins=4, labels=['Small', 'Medium', 'Large', 'XLarge'])
                    elif unique_volumes >= 2:
                        df['lot_category'] = pd.cut(df['volume'], bins=unique_volumes, labels=[f'Size_{i+1}' for i in range(unique_volumes)])
                    else:
                        # Not enough variation for meaningful analysis
                        return insights
                except (ValueError, TypeError):
                    # Skip lot size analysis if binning continues to fail
                    return insights
            
            lot_stats = df.groupby('lot_category').agg({
                'net_profit': ['sum', 'mean', 'count', 'std'],
                'is_profitable': 'mean'
            })
            
            lot_stats.columns = ['total_profit', 'avg_profit', 'trade_count', 'profit_std', 'win_rate']
            lot_stats['sharpe_ratio'] = lot_stats['avg_profit'] / lot_stats['profit_std']
            
            best_sharpe_category = lot_stats['sharpe_ratio'].idxmax()
            best_sharpe = lot_stats.loc[best_sharpe_category, 'sharpe_ratio']
            
            insights.append({
                'type': 'position_sizing',
                'title': f'Optimal Position Size: {best_sharpe_category}',
                'description': f'{best_sharpe_category} lot sizes show best risk-adjusted returns (Sharpe ratio: {best_sharpe:.2f}).',
                'value': float(best_sharpe),
                'confidence': 0.85,
                'recommendation': f'Focus on {best_sharpe_category} position sizes for optimal risk-adjusted performance.'
            })
        
        return insights
    
    def _analyze_take_profit_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze take profit effectiveness"""
        insights = []
        
        trades_with_tp = df[df['take_profit'].notna()]
        if not trades_with_tp.empty:
            # Calculate how often TP was hit vs manually closed
            tp_hit_trades = trades_with_tp[abs(trades_with_tp['close_price'] - trades_with_tp['take_profit']) < 0.001]
            manual_close_trades = trades_with_tp[abs(trades_with_tp['close_price'] - trades_with_tp['take_profit']) > 0.001]
            
            if not tp_hit_trades.empty and not manual_close_trades.empty:
                tp_hit_avg_profit = tp_hit_trades['net_profit'].mean()
                manual_avg_profit = manual_close_trades['net_profit'].mean()
                
                if manual_avg_profit > tp_hit_avg_profit * 1.2:
                    insights.append({
                        'type': 'exit_strategy',
                        'title': 'Early Exit Opportunity',
                        'description': f'Manually closed trades averaged ${manual_avg_profit:.2f} vs ${tp_hit_avg_profit:.2f} for TP hits.',
                        'value': float(manual_avg_profit - tp_hit_avg_profit),
                        'confidence': 0.75,
                        'recommendation': 'Consider trailing stops or partial profit taking instead of fixed take profits.'
                    })
        
        return insights
    
    def _analyze_news_impact_times(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze performance during typical news hours"""
        insights = []
        
        # Major news release hours (EST): 8:30 AM, 2:00 PM, etc.
        news_hours = [8, 9, 14, 15, 16]  # Convert to UTC as needed
        news_trades = df[df['hour_opened'].isin(news_hours)]
        non_news_trades = df[~df['hour_opened'].isin(news_hours)]
        
        if not news_trades.empty and not non_news_trades.empty:
            news_volatility = news_trades['net_profit'].std()
            non_news_volatility = non_news_trades['net_profit'].std()
            news_avg_profit = news_trades['net_profit'].mean()
            
            if news_volatility > non_news_volatility * 1.5:
                insights.append({
                    'type': 'market_timing',
                    'title': 'High Volatility During News Hours',
                    'description': f'Trading during news hours shows {(news_volatility/non_news_volatility-1)*100:.0f}% higher volatility.',
                    'value': float(news_volatility - non_news_volatility),
                    'confidence': 0.8,
                    'recommendation': 'Use smaller position sizes during major news hours (8-9 AM, 2-4 PM EST) due to increased volatility.'
                })
        
        return insights
    
    def _analyze_weekend_gap_exposure(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze weekend gap risk exposure"""
        insights = []
        
        # Trades held over weekend (Friday late to Sunday)
        friday_late = df[(df['day_of_week'] == 4) & (df['hour_opened'] >= 20)]  # Friday after 8 PM
        sunday_early = df[(df['day_of_week'] == 6) & (df['hour_opened'] <= 4)]   # Sunday before 4 AM
        
        weekend_exposure_trades = pd.concat([friday_late, sunday_early])
        
        if not weekend_exposure_trades.empty:
            weekend_avg_profit = weekend_exposure_trades['net_profit'].mean()
            weekend_volatility = weekend_exposure_trades['net_profit'].std()
            regular_volatility = df[~df.index.isin(weekend_exposure_trades.index)]['net_profit'].std()
            
            if weekend_volatility > regular_volatility * 1.3:
                insights.append({
                    'type': 'gap_risk',
                    'title': 'Weekend Gap Risk Exposure',
                    'description': f'Weekend-exposed trades show {(weekend_volatility/regular_volatility-1)*100:.0f}% higher volatility.',
                    'value': float(weekend_volatility),
                    'confidence': 0.85,
                    'recommendation': 'Consider closing positions before weekend or using tighter stops for weekend-held trades.'
                })
        
        return insights
    
    def _analyze_economic_event_correlation(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze correlation with typical economic event times"""
        insights = []
        
        # First Friday of month (NFP), Wednesday 2 PM (FOMC), etc.
        # This is a simplified analysis - in production, you'd use actual economic calendar
        month_start_trades = df[df['open_time'].dt.day <= 7]  # First week of month
        month_end_trades = df[df['open_time'].dt.day >= 25]    # Last week of month
        
        if not month_start_trades.empty and not month_end_trades.empty:
            start_avg_profit = month_start_trades['net_profit'].mean()
            end_avg_profit = month_end_trades['net_profit'].mean()
            
            if abs(start_avg_profit - end_avg_profit) > 20:
                better_period = "start" if start_avg_profit > end_avg_profit else "end"
                profit_diff = abs(start_avg_profit - end_avg_profit)
                
                insights.append({
                    'type': 'monthly_cycle',
                    'title': f'Monthly Performance Cycle: {better_period.title()}',
                    'description': f'{"First week" if better_period == "start" else "Last week"} of month shows ${profit_diff:.2f} better average performance.',
                    'value': float(profit_diff),
                    'confidence': 0.7,
                    'recommendation': f'Consider increased activity during {"first" if better_period == "start" else "last"} week of month.'
                })
        
        return insights
    
    def _analyze_profit_taking_behavior(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze profit-taking and loss-cutting behavior"""
        insights = []
        
        profitable_trades = df[df['net_profit'] > 0]
        losing_trades = df[df['net_profit'] < 0]
        
        if not profitable_trades.empty and not losing_trades.empty:
            avg_win = profitable_trades['net_profit'].mean()
            avg_loss = abs(losing_trades['net_profit'].mean())
            
            if avg_loss > avg_win * 2:
                insights.append({
                    'type': 'behavioral_pattern',
                    'title': 'Loss Aversion Pattern Detected',
                    'description': f'Average loss (${avg_loss:.2f}) is {avg_loss/avg_win:.1f}x larger than average win (${avg_win:.2f}).',
                    'value': float(avg_loss - avg_win),
                    'confidence': 0.9,
                    'recommendation': 'Cut losses earlier or let winners run longer to improve risk-reward ratio.'
                })
        
        return insights
    
    def _analyze_entry_timing_precision(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze entry timing quality"""
        insights = []
        
        if 'stop_loss' in df.columns and 'open_price' in df.columns:
            trades_with_sl = df[df['stop_loss'].notna()]
            
            if not trades_with_sl.empty:
                # Calculate how far price moved against position before recovering
                trades_with_sl['risk_distance'] = abs(trades_with_sl['open_price'] - trades_with_sl['stop_loss'])
                trades_with_sl['actual_distance'] = abs(trades_with_sl['close_price'] - trades_with_sl['open_price'])
                
                # Good entries: price moved favorably immediately
                good_entries = trades_with_sl[
                    (trades_with_sl['net_profit'] > 0) & 
                    (trades_with_sl['actual_distance'] > trades_with_sl['risk_distance'] * 0.5)
                ]
                
                if len(good_entries) >= 5:
                    good_entry_rate = len(good_entries) / len(trades_with_sl)
                    
                    if good_entry_rate > 0.7:
                        insights.append({
                            'type': 'skill_recognition',
                            'title': 'Excellent Entry Timing',
                            'description': f'{good_entry_rate*100:.1f}% of trades show precise entry timing with favorable immediate price movement.',
                            'value': float(good_entry_rate),
                            'confidence': 0.85,
                            'recommendation': 'Your entry timing is excellent. Consider increasing position sizes on high-confidence setups.'
                        })
        
        return insights
    
    def _analyze_emotional_trading_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect emotional trading patterns"""
        insights = []
        
        # Rapid-fire trading after losses
        df_sorted = df.sort_values('open_time')
        df_sorted['time_to_next'] = df_sorted['open_time'].shift(-1) - df_sorted['open_time']
        df_sorted['next_trade_minutes'] = df_sorted['time_to_next'].dt.total_seconds() / 60
        
        loss_trades = df_sorted[df_sorted['net_profit'] < 0]
        if not loss_trades.empty:
            quick_revenge = loss_trades[loss_trades['next_trade_minutes'] < 15]  # Within 15 minutes
            
            if len(quick_revenge) >= 3:
                # Get next trade indices that actually exist
                next_indices = quick_revenge.index + 1
                valid_next_indices = [idx for idx in next_indices if idx in df_sorted.index]
                
                if valid_next_indices:
                    revenge_success = (df_sorted.loc[valid_next_indices, 'net_profit'] > 0).mean()
                else:
                    revenge_success = 0.0
                
                insights.append({
                    'type': 'emotional_trading',
                    'title': 'Impulsive Trading After Losses',
                    'description': f'{len(quick_revenge)} trades were opened within 15 minutes of a loss, with {revenge_success*100:.1f}% success rate.',
                    'value': float(len(quick_revenge)),
                    'confidence': 0.8,
                    'recommendation': 'Implement a cooling-off period of at least 30 minutes after any loss to avoid emotional decisions.'
                })
        
        return insights
    
    def _analyze_diversification_efficiency(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze portfolio diversification efficiency"""
        insights = []
        
        if len(df['symbol'].unique()) >= 3:
            symbol_profits = df.groupby('symbol')['net_profit'].sum()
            
            # Check if profits are concentrated in few pairs
            total_profit = symbol_profits.sum()
            if total_profit > 0:
                symbol_profits_positive = symbol_profits[symbol_profits > 0]
                if not symbol_profits_positive.empty:
                    top_contributor = symbol_profits_positive.max()
                    contribution_pct = top_contributor / total_profit
                    
                    if contribution_pct > 0.8:
                        best_pair = symbol_profits_positive.idxmax()
                        insights.append({
                            'type': 'concentration_risk',
                            'title': f'Profit Concentration Risk: {best_pair}',
                            'description': f'{best_pair} contributes {contribution_pct*100:.1f}% of total profits, showing high concentration risk.',
                            'value': float(contribution_pct),
                            'confidence': 0.85,
                            'recommendation': f'Consider diversifying beyond {best_pair} to reduce dependency on single pair performance.'
                        })
        
        return insights
    
    def _analyze_capital_utilization(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze capital utilization efficiency"""
        insights = []
        
        # Calculate capital usage over time
        df['date'] = pd.to_datetime(df['open_time']).dt.date
        daily_volume = df.groupby('date')['volume'].sum()
        daily_profit = df.groupby('date')['net_profit'].sum()
        
        # Capital efficiency = profit per unit of volume
        daily_efficiency = daily_profit / daily_volume
        daily_efficiency = daily_efficiency.replace([np.inf, -np.inf], np.nan).dropna()
        
        if len(daily_efficiency) >= 10:
            high_efficiency_days = daily_efficiency[daily_efficiency > daily_efficiency.quantile(0.8)]
            low_efficiency_days = daily_efficiency[daily_efficiency < daily_efficiency.quantile(0.2)]
            
            if len(high_efficiency_days) >= 3 and len(low_efficiency_days) >= 3:
                efficiency_diff = high_efficiency_days.mean() - low_efficiency_days.mean()
                
                insights.append({
                    'type': 'capital_efficiency',
                    'title': 'Capital Utilization Variability',
                    'description': f'High-efficiency days generate ${efficiency_diff:.2f} more profit per lot than low-efficiency days.',
                    'value': float(efficiency_diff),
                    'confidence': 0.8,
                    'recommendation': 'Identify patterns in high-efficiency trading days to optimize capital utilization.'
                })
        
        return insights
    
    def _analyze_compounding_effectiveness(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze compounding effectiveness over time"""
        insights = []
        
        # Calculate cumulative returns over time
        df_sorted = df.sort_values('open_time')
        df_sorted['cumulative_profit'] = df_sorted['net_profit'].cumsum()
        
        # Split into periods
        total_days = (df_sorted['open_time'].max() - df_sorted['open_time'].min()).days
        if total_days > 60:  # At least 2 months of data
            midpoint = df_sorted['open_time'].min() + pd.Timedelta(days=total_days//2)
            
            first_half = df_sorted[df_sorted['open_time'] <= midpoint]
            second_half = df_sorted[df_sorted['open_time'] > midpoint]
            
            if not first_half.empty and not second_half.empty:
                first_half_profit = first_half['net_profit'].sum()
                second_half_profit = second_half['net_profit'].sum()
                
                if second_half_profit > first_half_profit * 1.5:
                    insights.append({
                        'type': 'growth_acceleration',
                        'title': 'Accelerating Performance Growth',
                        'description': f'Second half performance (${second_half_profit:.2f}) significantly exceeds first half (${first_half_profit:.2f}).',
                        'value': float(second_half_profit - first_half_profit),
                        'confidence': 0.8,
                        'recommendation': 'Performance is accelerating. Consider gradually increasing position sizes as account grows.'
                    })
        
        return insights
    
    def _analyze_winning_streaks(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze winning streak patterns"""
        insights = []
        
        df_sorted = df.sort_values('open_time')
        
        # Find winning streaks
        winning_streaks = []
        current_streak = 0
        
        for profit in df_sorted['net_profit']:
            if profit > 0:
                current_streak += 1
            else:
                if current_streak > 0:
                    winning_streaks.append(current_streak)
                current_streak = 0
        
        if current_streak > 0:
            winning_streaks.append(current_streak)
        
        if winning_streaks:
            max_winning_streak = max(winning_streaks)
            avg_winning_streak = statistics.mean(winning_streaks)
            
            if max_winning_streak >= 8:
                insights.append({
                    'type': 'performance_strength',
                    'title': f'Exceptional Winning Streak: {max_winning_streak} Trades',
                    'description': f'Maximum winning streak reached {max_winning_streak} consecutive profitable trades (average: {avg_winning_streak:.1f}).',
                    'value': float(max_winning_streak),
                    'confidence': 0.9,
                    'recommendation': 'Strong momentum trading ability detected. Consider trend-following strategies to capitalize on this strength.'
                })
        
        return insights
    
    def _analyze_performance_cycles(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze cyclical performance patterns"""
        insights = []
        
        # Weekly performance cycles
        df['week'] = pd.to_datetime(df['open_time']).dt.isocalendar().week
        weekly_profits = df.groupby('week')['net_profit'].sum()
        
        if len(weekly_profits) >= 8:  # At least 2 months
            # Look for alternating good/bad weeks
            weekly_profits_list = weekly_profits.tolist()
            alternating_pattern = 0
            
            for i in range(1, len(weekly_profits_list)):
                if (weekly_profits_list[i] > 0) != (weekly_profits_list[i-1] > 0):
                    alternating_pattern += 1
            
            alternating_ratio = alternating_pattern / (len(weekly_profits_list) - 1)
            
            if alternating_ratio > 0.7:
                insights.append({
                    'type': 'cyclical_pattern',
                    'title': 'Weekly Performance Cycles',
                    'description': f'Performance shows {alternating_ratio*100:.0f}% alternating weekly pattern between profitable and unprofitable periods.',
                    'value': float(alternating_ratio),
                    'confidence': 0.75,
                    'recommendation': 'Consider reducing activity during historically weak weeks and increasing during strong weeks.'
                })
        
        return insights