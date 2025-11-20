# Curva de Juros - Interest Rate Curve Analyzer

## Overview
This is a React + TypeScript + Vite web application that analyzes Brazilian interest rate curves (DI1 futures) and identifies spread arbitrage opportunities. The app fetches live market data from B3 (Brazilian stock exchange) and performs statistical analysis to find trading opportunities.

**Current State:** Imported from GitHub and configured for Replit environment.

## Recent Changes
- **2025-11-20:** Initial Replit setup
  - Updated Vite config to use port 5000 (required for Replit webview)
  - Configured HMR client port for proper hot module reload in Replit
  - Installed all npm dependencies
  - Created workflow for frontend dev server
  - GEMINI_API_KEY environment variable needs to be set by user

## Project Architecture

### Tech Stack
- **Frontend Framework:** React 19.2.0
- **Language:** TypeScript 5.8.2
- **Build Tool:** Vite 6.2.0
- **Charts:** Recharts 3.4.1
- **Icons:** Lucide React
- **Dev Server:** Port 5000 on 0.0.0.0

### Project Structure
- `/components/` - React components (Header, Charts, StatCard, etc.)
- `/services/` - Market data fetching logic (B3 API integration)
- `/utils/` - Mathematical and financial calculations
- `App.tsx` - Main application component
- `types.ts` - TypeScript type definitions
- `constants.ts` - Application constants

### Key Features
1. **Live Market Data:** Fetches DI1 futures data from B3 using CORS proxy
2. **Statistical Analysis:** Calculates spreads, z-scores, cointegration
3. **Visual Analytics:** Interactive charts showing historical spreads
4. **Risk Management:** DV01 calculations and position sizing
5. **Opportunity Scanner:** Identifies arbitrage opportunities across maturities

### External Dependencies
- **B3 Market Data:** Fetches from B3's public portal (may fallback to simulated data)
- **CORS Proxy:** Uses allorigins.win for cross-origin requests
- **Gemini API:** Optional API key for enhanced features (environment variable)

## Environment Variables
- `GEMINI_API_KEY` - Optional: Gemini API key (set via Replit secrets)

## User Preferences
None specified yet.
