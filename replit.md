# Curva de Juros - Interest Rate Curve Analyzer

## Overview
This is a full-stack React + TypeScript + Vite + Express + Supabase application designed to analyze Brazilian interest rate curves (DI1 futures) and identify spread arbitrage opportunities. It collects real market data from B3, performs statistical analysis, and provides real-time trading insights through a responsive web interface. The project aims to deliver a robust, production-ready system for financial market analysis, utilizing 100% real B3 data.

## User Preferences
- **Language:** Portuguese (Brazil)
- **Architecture:** Backend-heavy processing, lightweight frontend
- **Data Source:** Prioritize real B3 data, fallback to simulated when unavailable

## System Architecture

### Tech Stack
**Frontend:**
- **Framework:** React
- **Language:** TypeScript
- **Build Tool:** Vite
- **Charts:** Recharts
- **Icons:** Lucide React

**Backend (Vercel Serverless):**
- **Platform:** Vercel Serverless Functions (Node.js)
- **Language:** JavaScript (CommonJS)
- **Database:** Supabase (PostgreSQL)

### Project Structure
**Frontend:**
- `/components/`: React UI components.
- `/services/api.ts`: Lightweight API client.
- `/utils/math.ts`: Shared math utilities.
- `App.tsx`: Main application component.
- `types.ts`: TypeScript type definitions.
- `constants.ts`: Application constants.

**Backend (Vercel Serverless API):**
- `/api/_shared.js`: Shared utilities (Supabase client, CORS headers).
- `/api/health.js`: Health check endpoint.
- `/api/opportunities.js`: Lists identified opportunities.
- `/api/pair/[pairId].js`: Provides details for a specific pair.
- `/api/refresh.js`: Triggers recalculation of opportunities.
- `/api/collect-real.js`: Automated collection from B3 REST API.
- `/api/utils/b3-api-client.js`: Client for B3 REST API (fetches DI1 data).
- `/api/utils/contract-manager.js`: Dynamic rolling window contract selection.
- `/api/utils/b3-calendar.js`: Brazilian business day calendar.
- `/api/utils.js`: Business days, date formatting, financial calculations (PU, DV01, z-score, cointegration).
- `scripts/import-real-data.cjs`: Script for manual data import (legacy).
- `scripts/validate-real-data.cjs`: Script for data validation.

### Key Features
1.  **Automated Data Collection:** Real-time collection via B3 REST API (current market data only).
2.  **Historical Database:** Persistent storage of DI1 prices in Supabase.
3.  **Pre-calculated Opportunities:** Backend processes all calculations and caches results.
4.  **Statistical Analysis:** Calculates spreads, z-scores, and cointegration.
5.  **Visual Analytics:** Interactive charts for historical spreads.
6.  **Risk Management:** DV01 calculations and position sizing.
7.  **Opportunity Scanner:** Identifies arbitrage opportunities across maturities.
8.  **REST API:** Provides a clean interface for frontend-backend communication.
9.  **Dynamic Contract Selection:** Rolling window logic (year+2 to year+10) automatically adjusts active contracts.

### Important Limitations
- **B3 REST API:** Returns ONLY current market data (real-time). Cannot fetch historical data.
- **Historical Backfill:** Use `scripts/import-real-data.cjs` for importing past dates via rb3 CSV files.

### Data Flow
**Automated Collection (Primary):**
POST `/api/collect-real` → B3 REST API (`https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1`) → Parse & Deduplicate → UPSERT to Supabase (di1_prices) → POST `/api/refresh` → Calculate Opportunities → Update Cache (opportunities_cache) → Frontend → GET `/api/opportunities` → Display Opportunities.

**Manual Import (Legacy/Backup):**
`scripts/import-real-data.cjs` → rb3 CSV → UPSERT to Supabase (di1_prices) → POST `/api/refresh` → ...same flow.

## External Dependencies
-   **Supabase:** PostgreSQL database for persistent data storage.
-   **B3 REST API:** Public API for real-time DI1 quotes (`https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1`).
-   **rb3 R package:** (Legacy) Used for historical data collection via CSV.