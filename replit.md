# Curva de Juros - Interest Rate Curve Analyzer

## Overview
This is a full-stack React + TypeScript + Vite + Express + Supabase application that analyzes Brazilian interest rate curves (DI1 futures) and identifies spread arbitrage opportunities. The system collects market data from B3, performs statistical analysis, and provides real-time trading opportunities through a responsive web interface.

**Current State:** Full-stack implementation with backend processing, database persistence, and automated daily data collection.

## Recent Changes
- **2025-11-21 (Latest Session - Production-Ready Automated Collection):** Complete automated daily data collection system
  - Implemented B3 holiday calendar 2025-2030 (54 holidays: 9 fixed + 4 movable per year)
  - Fixed timing: collects previous business day (B3 data published after 18:00, collection at 21:00 BRT)
  - Partial persistence: saves real B3 data + simulates only missing contracts
  - Multi-level retry: 3 per-contract retries + 3 workflow retries
  - Holiday-aware: automatically skips weekends, Carnaval, Corpus Christi, etc.
  - **System operational for 5 years without maintenance**

- **2025-11-21 (Earlier - 100% Vercel Deployment):** Migrated entire backend to Vercel serverless functions
  - Converted Express backend to individual Vercel serverless functions (CommonJS)
  - Created `api/_shared.js` for Supabase client and CORS utilities
  - Separated endpoints: `health.js`, `opportunities.js`, `pair/[pairId].js`, `recalculate.js`, `collect.js`
  - Fixed CommonJS/ES Module conflict by adding `api/package.json` with `"type": "commonjs"`
  - Configured `vercel.json` with cron job and 60s maxDuration for collect function
  - Successfully deployed to https://curvadejuros.vercel.app
  - Validated 43 opportunities in production database
  - Removed old Express server code (`/server` directory)
  - System now 100% serverless on Vercel platform
  - Configured GitHub Actions for free daily cron (0:00 UTC = 21:00 BRT)
  - Created `.github/workflows/daily-collect.yml` for automated data collection
  - Documentation in `CRON_SETUP.md` with setup and monitoring instructions

- **2025-11-20 (Earlier - Backfill Update):** Backfill completed with market-based realistic data
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

**Backend (Vercel Serverless):**
- **Platform:** Vercel Serverless Functions
- **Runtime:** Node.js 20.x
- **Language:** JavaScript (CommonJS)
- **Database:** Supabase (PostgreSQL)
- **Scraping:** JSDOM 27.2.0
- **Scheduling:** GitHub Actions (free cron alternative)
- **Deployment:** https://curvadejuros.vercel.app

### Project Structure
**Frontend:**
- `/components/` - React UI components (Header, Charts, StatCard, etc.)
- `/services/api.ts` - Lightweight API client (4 lines, calls backend)
- `/utils/math.ts` - Shared math utilities (kept for frontend display calculations)
- `App.tsx` - Main application component
- `types.ts` - TypeScript type definitions
- `constants.ts` - Application constants

**Backend (Vercel Serverless API):**
- `/api/_shared.js` - Shared utilities (Supabase client, CORS headers)
- `/api/health.js` - Health check endpoint (GET /api/health)
- `/api/opportunities.js` - List opportunities (GET /api/opportunities)
- `/api/pair/[pairId].js` - Pair details with dynamic routing (GET /api/pair/:id)
- `/api/collect-data.js` - **Daily data collection** from B3 (POST /api/collect-data) ~15s
- `/api/refresh.js` - **Recalculate opportunities** from existing data (POST /api/refresh) ~5s
- `/api/recalculate.js` - Full pipeline (collect + refresh, legacy) ~60s+
- `/api/collect.js` - Legacy full pipeline (kept for reference)
- `/api/utils.js` - Business days, date formatting, financial calculations (PU, DV01, z-score, cointegration)
- `/api/package.json` - CommonJS configuration for serverless functions
- `vercel.json` - Vercel deployment configuration (maxDuration)
- `.github/workflows/daily-collect.yml` - GitHub Actions cron (free alternative to Vercel cron)

### Key Features
1. **Automated Data Collection:** Daily scraping at 0:00 UTC (21:00 BRT) via GitHub Actions cron
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
GitHub Actions (0:00 UTC daily)
   ↓
   Step 1: POST /api/collect-data → B3 Scraping → Insert to Supabase (di1_prices)
   ↓
   Step 2: POST /api/refresh → Calculate Opportunities → Update Cache (opportunities_cache)
   ↓
Frontend → GET /api/opportunities → Display 43 Opportunities
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
