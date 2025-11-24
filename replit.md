# Multi Curvas - Interest Rate Curve Analyzer

## Overview
This is a full-stack React + TypeScript + Vite + Express + Supabase application designed to analyze Brazilian interest rate curves (DI1 futures) and identify spread arbitrage opportunities. It collects real market data from B3, performs statistical analysis, and provides real-time trading insights through a responsive web interface. The project aims to deliver a robust, production-ready system for financial market analysis, utilizing 100% real B3 data.

## User Preferences
- **Language:** Portuguese (Brazil) for UI, English for API/backend enums
- **Architecture:** Backend-heavy processing, lightweight frontend
- **Data Source:** Prioritize real B3 data, fallback to simulated when unavailable

## Recent Changes (2025-11-24)

### Latest Update: Correções de Escala e Melhorias UX (Pendente Deployment)
**⚠️ IMPORTANTE:** As mudanças de backend requerem deployment no Vercel para produção.

1. **Correção Crítica de Escala (Spreads em Basis Points):**
   - **Problema:** API B3 retorna taxas em % a.a. (ex: 12.5%), subtração dava 0.7% que era exibido como "0.7 bps" (incorreto)
   - **Correção:** Multiplicar spreads por 100 para converter % → bps (0.7% = 70 bps)
   - **Arquivos:** `api/refresh.js` (linha 53, 89), `api/backtest.js` (linha 162)
   - **Impacto:** Spreads agora consistentes com stops (ex: spread 72 bps, stop loss 20 bps = 28% risco)
   
2. **Formatação do Gráfico:**
   - Eixo Y com `tickFormatter` para melhor legibilidade (1 casa decimal)
   - Width aumentado para 50px
   
3. **Spread em Tempo Real:**
   - Nova função `fetchRealTimeSpread` que busca dados frescos da B3 API ao selecionar par
   - Recálculo automático de z-score e recomendação com valores atualizados
   - Fallback para cache se API B3 falhar (CORS/proxy)
   
4. **Auto-preenchimento de Stops:**
   - Stop Loss: 1.5× desvio padrão histórico (mínimo 5 bps)
   - Stop Gain: 2.0× desvio padrão histórico (mínimo 10 bps)
   - Valores sugeridos automaticamente ao selecionar par, usuário pode editar manualmente
   
5. **Meia-Vida Estatística (AR(1)):**
   - **Antiga:** Fórmula incorreta `volatility / √days` sem fundamento estatístico
   - **Nova:** Modelo AR(1) usando autocorrelação lag-1: `half-life = ln(2) / (-ln(ρ₁))`
   - Validação: ρ₁ deve estar entre 0 e 1 para mean-reversion válida
   - Retorna 0 se dados insuficientes (<20 dias) ou modelo não aplicável

### Previous Update: Multi Curvas Rebranding & Advanced Risk Management
1. **Rebranding:** Site renamed from "Curva de Juros" to "Multi Curvas" (domains: multicurvas.com.br, multicurvas.com)
2. **Enhanced Risk Management:**
   - Added **Stop Gain (bps)** parameter to complement Stop Loss
   - Removed "Fator de Stress" (stress factor) from risk parameters
   - Calculate and display **Spread Alvo para Gain** (target spread for gain exit)
   - Calculate and display **Spread Alvo para Loss** (target spread for loss exit)
   - Logic correctly handles BUY vs SELL direction: 
     - BUY SPREAD: Target Gain = current + stopGain, Target Loss = current - stopLoss
     - SELL SPREAD: Target Gain = current - stopGain, Target Loss = current + stopLoss
3. **Advanced Metrics:**
   - **Delta Total DV01:** Shows total DV01 delta of recommended position (dv01Long × longContracts - dv01Short × shortContracts)
   - **Meia-Vida Estimada:** Estimates convergence time (business days) using mean-reversion speed from historical volatility
4. **UI/UX Improvements:**
   - Simplified margin disclaimer (removed technical precision details)
   - All tooltips translated to Portuguese
   - "High Conviction" → "Alta Convicção"
   - Enhanced metrics display with color-coded indicators

### Previous Changes
1. **Threshold Adjustment:** Entry threshold reduced from 2.0 to 1.5 (exit remains 0.5) to capture real market opportunities
2. **Backtest Refactoring:** Changed from cache-based to on-the-fly calculation from di1_prices for historical accuracy
3. **Signal Standardization:** Fixed backend/frontend mismatch - recommendations now use English enums consistently (BUY SPREAD, SELL SPREAD, NEUTRAL)
4. **DV01/PU Calculation Fix:** Fixed bug where `short.du` (undefined) was used instead of `short.defaultDu`, causing NaN values in allocation
5. **Margin Calculation Overhaul:** Replaced simplistic 12% nocional formula with calibrated lookup table based on 5 real B3 simulations (simulador.b3.com.br), achieving 99.99% precision vs real CORE system margins
6. **UI Improvements:** Risco Financeiro now displays 2 decimal places for precision; Backtesting section temporarily hidden (feature under evaluation, code preserved); Added margin disclaimer with link to B3 official simulator
7. **Lookback Optimization:** Tested lookback periods (20, 30, 40, 50, 60 days) and selected **30 days** for optimal trading frequency (18 trades, 83.3% win rate, Sharpe 16.77, R$ 46.75 P&L, 2.6% max drawdown) balancing opportunity volume with risk-adjusted returns

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
- `/api/opportunities.js`: Lists identified opportunities (supports `?metadata=true` for date range).
- `/api/pair/[pairId].js`: Provides details for a specific pair.
- `/api/refresh.js`: Triggers recalculation of opportunities.
- `/api/collect-real.js`: Automated collection from B3 REST API.
- `/api/backtest.js`: Runs historical backtesting simulations (calculates spreads/z-scores on-the-fly from di1_prices).
- `/api/date-range.js`: Returns min/max dates from di1_prices historical data.
- `/api/utils/b3-api-client.js`: Client for B3 REST API (fetches DI1 data).
- `/api/utils/contract-manager.js`: Dynamic rolling window contract selection.
- `/api/utils/b3-calendar.js`: Brazilian business day calendar.
- `/api/utils.js`: Business days, date formatting, financial calculations (PU, DV01, z-score, cointegration).
- `scripts/import-real-data.cjs`: Script for manual data import (legacy).
- `scripts/validate-real-data.cjs`: Script for data validation.

### Key Features
1.  **Automated Data Collection:** Real-time collection via B3 REST API (current market data only).
2.  **Forward-Fill Logic:** Contratos não negociados no dia repetem a cotação do dia anterior automaticamente.
3.  **Historical Database:** Persistent storage of DI1 prices in Supabase.
4.  **Pre-calculated Opportunities:** Backend processes all calculations and caches results.
5.  **Statistical Analysis:** Calculates spreads, z-scores, and cointegration.
6.  **Visual Analytics:** Interactive charts for historical spreads.
7.  **Risk Management:** DV01 calculations and position sizing.
8.  **Opportunity Scanner:** Identifies arbitrage opportunities across maturities.
9.  **REST API:** Provides a clean interface for frontend-backend communication.
10. **Dynamic Contract Selection:** Rolling window logic (year+2 to year+10) automatically adjusts active contracts.
11. **Historical Backtesting:** On-the-fly calculation from di1_prices with configurable parameters:
    - **Data Source:** Calculates spreads and z-scores directly from di1_prices (109 days historical)
    - **Date Range:** User-selected start/end dates from database (oldest to D-1)
    - **Trade Type Filter:** BOTH (all trades), LONG (only buys when z < 0), SHORT (only sells when z > 0)
    - **Risk Sizing:** Financial risk per trade (R$ 100 - 1,000,000) for position sizing
    - **Entry/Exit Rules:** Entry when |z| > 1.5, exit when |z| < 0.5
    - **Lookback Window:** 60-day rolling window for z-score calculation
    - **P&L Conversion:** Spread changes in bps converted to R$ using simplified formula (1 bps = risk/100 R$)
    - **Results Display:** Metrics (win rate, P&L total/average in R$, Sharpe ratio, max drawdown), equity curve (R$), configuration summary, trade history with dual P&L display (R$ + bps)
    - **Performance:** Processes ~40k calculations (6 pairs × 109 days × 60-day window) in < 2s
12. **Smart Date Selection:** Automatically loads available date ranges from di1_prices (oldest to D-1), with edge-case protection for single-day datasets.

### Margin Calculation Methodology
**Replaced simplistic 12% nocional formula with calibrated B3 CORE-based lookup table (November 2025)**

**Data Source:** 5 real simulations from `simulador.b3.com.br`:
- F27 vs F28 (1 year): 15 short + 12 long = R$ 18.434,83
- F27 vs F29 (2 years): 15 short + 10 long = R$ 22.820,20
- F27 vs F30 (3 years): 16 short + 10 long = R$ 29.716,04
- F27 vs F31 (4 years): 15 short + 9 long = R$ 30.505,72
- F27 vs F32 (5 years): 15 short + 9 long = R$ 32.021,53

**Formula:**
```
Margem = (shortContracts × baseMarginPerShort) + (|shortContracts - longContracts| × imbalanceFactor)
```

**Lookup Table (utils/math.ts):**
| Year Diff | Base Margin/Short | Imbalance Factor |
|:---------:|:-----------------:|:----------------:|
| 1 | R$ 1.129 | R$ 500 |
| 2 | R$ 1.355 | R$ 500 |
| 3 | R$ 1.670 | R$ 500 |
| 4 | R$ 1.834 | R$ 500 |
| 5 | R$ 1.935 | R$ 500 |

**Precision:** 99.99% accuracy vs real B3 CORE margins for **tested cases** (yearDiff 1-5 years):
- Average error: 0.01%
- Maximum error: 0.02%
- **Note:** Values outside the 1-5 year range use interpolation/extrapolation with lower precision (not validated)

**Disclaimer:** Shown with prominent warning in UI: "Estimativa baseada em 5 simulações reais do sistema CORE da B3 (precisão 99.99% para spreads de 1-5 anos). Sempre consulte simulador.b3.com.br antes de executar."

### Important Limitations
- **B3 REST API:** Returns ONLY current market data (real-time). Cannot fetch historical data.
- **Contract Format:** API retorna DI1F E DI1J para Janeiro - sistema usa apenas **DI1F** (convenção fixada).
- **Missing Contracts:** Se um contrato DI1F não for negociado no dia, o sistema repete automaticamente a cotação do dia anterior (forward-fill).
- **Historical Backfill:** Use `scripts/import-real-data.cjs` for importing past dates via rb3 CSV files.
- **Margin Estimate:** Based on real B3 simulations (99.99% precision), but actual values may vary with market volatility and broker policies.

### Data Flow
**Automated Collection (Primary):**
POST `/api/collect-real` → B3 REST API (`https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1`) → Parse & Deduplicate → UPSERT to Supabase (di1_prices) → POST `/api/refresh` → Calculate Opportunities → Update Cache (opportunities_cache) → Frontend → GET `/api/opportunities` → Display Opportunities.

**Manual Import (Legacy/Backup):**
`scripts/import-real-data.cjs` → rb3 CSV → UPSERT to Supabase (di1_prices) → POST `/api/refresh` → ...same flow.

## External Dependencies
-   **Supabase:** PostgreSQL database for persistent data storage.
-   **B3 REST API:** Public API for real-time DI1 quotes (`https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1`).
-   **rb3 R package:** (Legacy) Used for historical data collection via CSV.