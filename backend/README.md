# QuantaView FastAPI Backend

AI-powered trading analytics backend with pattern detection and ML insights.

## Features

- **FastAPI** with SQLAlchemy ORM
- **Pandas** data processing for advanced analytics  
- **AI Pattern Detection** for time and pair analysis
- **ML Insights** with scikit-learn and statsmodels
- **Heatmaps** for profitability visualization
- **Risk Analysis** and optimization suggestions

## Setup

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your database connection
```

4. **Run the server:**
```bash
python main.py
```

## API Endpoints

### Analytics
- `GET /api/v1/analytics/insights/{account_id}` - AI-generated trading insights
- `GET /api/v1/analytics/time-analysis/{account_id}` - Hourly profitability analysis
- `GET /api/v1/analytics/pair-analysis/{account_id}` - Currency pair performance
- `GET /api/v1/analytics/heatmap/hourly/{account_id}` - Hourly heatmap data
- `GET /api/v1/analytics/heatmap/daily/{account_id}` - Daily heatmap data
- `GET /api/v1/analytics/lot-size-analysis/{account_id}` - Lot size optimization

### Trades
- `GET /api/v1/trades/{account_id}` - Get all trades for account
- `POST /api/v1/trades/` - Create new trade
- `GET /api/v1/trades/trade/{trade_id}` - Get specific trade

### Accounts  
- `GET /api/v1/accounts/{user_id}` - Get user's trading accounts
- `POST /api/v1/accounts/` - Create new trading account
- `GET /api/v1/accounts/account/{account_id}` - Get specific account

## AI Insights Generated

- **Time Patterns**: Most/least profitable hours and days
- **Pair Performance**: Best/worst performing currency pairs  
- **Risk Analysis**: High volatility warnings and risk patterns
- **Session Analysis**: Asian/European/US session performance
- **Lot Size Optimization**: Profitability vs risk by position size
- **Automated Suggestions**: Personalized trading recommendations

## Development

The backend is structured for easy extension of ML models and analytics:

- `analytics/` - Pattern detection and ML algorithms
- `services/` - Data processing with pandas
- `models/` - SQLAlchemy database models
- `routers/` - FastAPI route handlers
- `schemas/` - Pydantic data models