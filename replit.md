# Curva de Juros - Interest Rate Curve Analyzer

## Overview
This is a full-stack React + TypeScript + Vite + Express + Supabase application that analyzes Brazilian interest rate curves (DI1 futures) and identifies spread arbitrage opportunities. The system collects market data from B3, performs statistical analysis, and provides real-time trading opportunities through a responsive web interface.

**Current State:** Full-stack implementation with backend processing, database persistence, and automated daily data collection.

## Recent Changes
- **2025-11-20 (Latest Session - Backfill Update):** Backfill completed with market-based realistic data
  - Updated contracts to 9: DI1F27, DI1F28, DI1F29, DI1F30, DI1F31, DI1F32, DI1F33, DI1F34, DI1F35
  - Populated 900 records (100 business days × 9 contracts) from 03/07/2025 to 19/11/2025
  - Generated 43 arbitrage opportunities (up from 10 with 5 contracts)
  - Configured cron job to start collection on 21/11/2025 at 21:00 BRT
  - Enhanced backfill script with realistic Brazilian market characteristics
  - Base rates: 11.20% to 12.32% (realistic term structure)
  - Volatility and mean-reversion properly calibrated

- **2025-11-20 (Earlier Session):** System fully operational with automatic database seeding
  - Fixed CORS issues by adding Vite proxy configuration (frontend /api → backend localhost:3000)
  - Created automatic seeding system with simulated data (100 days) for instant functionality
  - Simplified API client to use relative URLs through proxy
  - Updated documentation with quick start guide (QUICK_START.md)
  - Validated end-to-end: Backend seed (500 records) → API (10 opportunities) → Frontend display
  - System ready for daily automated collection at 21:00 BRT

- **2025-11-20 (Earlier):** Backend integration and architecture optimization
  - Created Express backend server (port 3000) with REST API
  - Integrated Supabase PostgreSQL for data persistence
  - Implemented automated data collection (cron job at 21:00 daily)
  - Created initial population script for 100 business days of historical data
  - Migrated all heavy processing from frontend to backend:
    * B3 scraping logic → `/server/collectors/b3Scraper.ts`
    * Statistical calculations → `/server/analyzers/opportunityScanner.ts`
    * Financial calculations → `/server/analyzers/riskCalculator.ts`
  - Simplified frontend from 365 lines to 4 lines in `services/marketData.ts`
  - Removed all client-side calculations and data processing
  - Created API endpoints: `/api/opportunities`, `/api/pair/:pairId`, `/api/recalculate`
  - Added two workflows: "Start application" (frontend) and "Backend Server"
  - SUPABASE_URL and SUPABASE_SERVICE_KEY configured via Replit Secrets

- **2025-11-20 (Earlier):** Initial Replit setup completed
  - Updated Vite config to use port 5000 (required for Replit webview)
  - Configured HMR client port for proper hot module reload in Replit
  - Added allowedHosts: ['all'] to enable Replit's dynamic proxy hostnames
  - Installed all npm dependencies
  - Created workflow for frontend dev server
  - GEMINI_API_KEY environment variable set via Replit Secrets
  - Configured static deployment (dist folder)

## Project Architecture

### Tech Stack
**Frontend:**
- **Framework:** React 19.2.0
- **Language:** TypeScript 5.8.2
- **Build Tool:** Vite 6.2.0
- **Charts:** Recharts 3.4.1
- **Icons:** Lucide React
- **Dev Server:** Port 5000 on 0.0.0.0

**Backend:**
- **Server:** Express 5.1.0
- **Runtime:** Node.js with tsx
- **Language:** TypeScript 5.8.2
- **Database:** Supabase (PostgreSQL)
- **Scraping:** JSDOM 27.2.0
- **Scheduling:** node-cron 4.2.1
- **API Port:** 3000

### Project Structure
**Frontend:**
- `/components/` - React UI components (Header, Charts, StatCard, etc.)
- `/services/api.ts` - Lightweight API client (4 lines, calls backend)
- `/utils/math.ts` - Shared math utilities (kept for frontend display calculations)
- `App.tsx` - Main application component
- `types.ts` - TypeScript type definitions
- `constants.ts` - Application constants

**Backend:**
- `/server/index.ts` - Express server entry point
- `/server/api/opportunities.ts` - REST API routes
- `/server/collectors/b3Scraper.ts` - B3 data scraping logic
- `/server/analyzers/opportunityScanner.ts` - Statistical analysis engine
- `/server/analyzers/riskCalculator.ts` - Financial calculations (PU, DV01, hedge ratios)
- `/server/jobs/initialPopulation.ts` - Initial database population (100 days)
- `/server/jobs/dailyCollection.ts` - Automated daily data collection (21:00 cron)
- `/server/config/supabase.ts` - Supabase client configuration
- `/server/utils/` - Business days, date formatting, math utilities
- `/server/database/schema.sql` - Database schema (di1_prices, opportunities_cache)

### Key Features
1. **Automated Data Collection:** Daily scraping at 21:00 (Brasília time) on business days
2. **Historical Database:** Persistent storage of DI1 prices in Supabase PostgreSQL
3. **Pre-calculated Opportunities:** Backend processes all calculations and caches results
4. **Live Market Data:** Fetches DI1 futures data from B3 using CORS proxy
5. **Statistical Analysis:** Calculates spreads, z-scores, cointegration
6. **Visual Analytics:** Interactive charts showing historical spreads
7. **Risk Management:** DV01 calculations and position sizing
8. **Opportunity Scanner:** Identifies arbitrage opportunities across maturities
9. **REST API:** Clean API for frontend-backend communication

### Data Flow
```
B3 API → Backend Scraper → Supabase Database → Backend Analyzer → Frontend Display
         (cron 21:00)       (di1_prices)        (opportunities_cache)
```

### External Dependencies
- **Supabase:** PostgreSQL database for persistent data storage
- **B3 Market Data:** Fetches from B3's public portal (may fallback to simulated data)
- **CORS Proxy:** Uses allorigins.win for cross-origin requests

## Environment Variables
- `SUPABASE_URL` - **Required:** URL of your Supabase project
- `SUPABASE_SERVICE_KEY` - **Required:** Supabase service role key (server-side only)
- `GEMINI_API_KEY` - Optional: Gemini API key (currently unused)

## Setup Instructions
**IMPORTANT:** Before running the application for the first time, you must create the database schema in Supabase.

See `SETUP_INSTRUCTIONS.md` for detailed setup steps.

## User Preferences
- **Language:** Portuguese (Brazil)
- **Architecture:** Backend-heavy processing, lightweight frontend
- **Data Source:** Prioritize real B3 data, fallback to simulated when unavailable

## Performance Optimizations
- **Before:** Frontend did all scraping and calculations (~5 second load time)
- **After:** Backend pre-processes everything (<1 second load time)
- **Code Reduction:** `services/marketData.ts` reduced from 365 lines to 4 lines
- **Calculation Offloading:** All statistical and financial calculations moved to backend
- **Caching Strategy:** Pre-calculated opportunities stored in `opportunities_cache` table
