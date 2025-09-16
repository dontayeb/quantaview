# QuantaView - MT5 Trading Dashboard

A modern, interactive trading dashboard for MT5 trading data built with Next.js, Tailwind CSS, and Recharts.

## Features

- **Real-time Dashboard**: Interactive dashboard showing trading metrics and performance
- **Account Overview**: Display account balance, equity, margin levels, and broker information
- **Trading Analytics**: Charts showing trading activity by symbol and cumulative profit/loss
- **Trade Management**: Sortable table of all trades with detailed information
- **Responsive Design**: Fully responsive design that works on desktop and mobile devices
- **Real-time Updates**: Live updates when new trading data is received via Supabase

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- MT5 trading data bridge (separate component)

## Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **Database Schema**:
   Ensure your Supabase database has these tables:

   **trades table**:
   ```sql
   CREATE TABLE trades (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     ticket BIGINT NOT NULL,
     symbol TEXT NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
     volume DECIMAL NOT NULL,
     open_price DECIMAL NOT NULL,
     close_price DECIMAL,
     open_time TIMESTAMP WITH TIME ZONE NOT NULL,
     close_time TIMESTAMP WITH TIME ZONE,
     profit DECIMAL,
     commission DECIMAL,
     swap DECIMAL,
     comment TEXT,
     magic INTEGER,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

   **accounts table**:
   ```sql
   CREATE TABLE accounts (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     account_number BIGINT NOT NULL UNIQUE,
     balance DECIMAL NOT NULL,
     equity DECIMAL NOT NULL,
     margin DECIMAL NOT NULL DEFAULT 0,
     free_margin DECIMAL NOT NULL DEFAULT 0,
     margin_level DECIMAL NOT NULL DEFAULT 0,
     currency TEXT NOT NULL DEFAULT 'USD',
     server TEXT,
     company TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles with Tailwind
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── AccountInfo.tsx      # Account information cards
│   ├── MetricsCards.tsx     # Trading metrics overview
│   ├── ProfitChart.tsx      # Cumulative profit/loss chart
│   ├── TradingChart.tsx     # Trading activity by symbol chart
│   └── TradesList.tsx       # Sortable trades table
├── hooks/
│   └── useTrades.ts         # Custom hook for data fetching
└── lib/
    └── supabase.ts          # Supabase client and type definitions
```

## Components

### AccountInfo
Displays account balance, equity, free margin, and margin level with color-coded status indicators.

### MetricsCards
Shows key trading metrics: total profit/loss, win rate, total trades, and total volume.

### TradingChart
Bar chart showing wins vs losses for each trading symbol.

### ProfitChart
Line chart displaying cumulative profit/loss over time and individual trade results.

### TradesList
Interactive table with sorting capabilities showing all trading activity.

## Data Flow

1. **Data Fetching**: The `useTrades` hook manages data fetching from Supabase
2. **Real-time Updates**: Supabase real-time subscriptions update data automatically
3. **State Management**: React hooks manage local component state
4. **Error Handling**: Comprehensive error handling for data fetching operations

## Customization

- Modify the chart colors and styling in the respective chart components
- Adjust the responsive breakpoints in Tailwind classes
- Add new metrics or charts by creating additional components
- Extend the database schema to include additional trading data

## Performance

- Uses React's built-in optimization with hooks
- Implements efficient data sorting and filtering
- Responsive charts that adapt to screen size
- Lazy loading for large trade lists

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details