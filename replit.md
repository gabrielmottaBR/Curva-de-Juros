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
- `/api/utils.js`: Business days, date formatting, financial calculations (PU, DV01, z-score, cointegration).
- `scripts/import-real-data.cjs`: Script for manual data import.
- `scripts/validate-real-data.cjs`: Script for data validation.

### Key Features
1.  **Manual Data Updates:** Supports importing real B3 data via script.
2.  **Historical Database:** Persistent storage of DI1 prices in Supabase.
3.  **Pre-calculated Opportunities:** Backend processes all calculations and caches results.
4.  **Statistical Analysis:** Calculates spreads, z-scores, and cointegration.
5.  **Visual Analytics:** Interactive charts for historical spreads.
6.  **Risk Management:** DV01 calculations and position sizing.
7.  **Opportunity Scanner:** Identifies arbitrage opportunities across maturities.
8.  **REST API:** Provides a clean interface for frontend-backend communication.
9.  **Automated Daily Data Collection:** System for daily collection of B3 BDI PDF files.

### Data Flow
Manual Import (when needed) -> `scripts/import-real-data.cjs` -> rb3 CSV -> UPSERT to Supabase (di1_prices) -> POST `/api/refresh` -> Calculate Opportunities -> Update Cache (opportunities_cache) -> Frontend -> GET `/api/opportunities` -> Display Opportunities.

## External Dependencies
-   **Supabase:** PostgreSQL database for persistent data storage.
-   **B3 Market Data:** Fetches data from B3's public portal.
-   **rb3 R package:** Used for collecting real B3 historical data.
-   **pdf-parse:** For extracting DI1 data from BDI_05 PDF files.