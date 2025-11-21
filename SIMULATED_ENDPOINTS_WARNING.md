# ⚠️ Simulated Data Endpoints - DEPRECATION WARNING

## IMPORTANT: Production Now Uses Real B3 Data

As of **November 21, 2025**, the Curva de Juros application uses **100% real B3 historical data** collected via rb3 R package.

**Simulated data endpoints are DEPRECATED and should NOT be used in production.**

## ✅ Deleted Endpoints (Removed from Codebase)

### 🗑️ `/api/collect-simple.js` - DELETED
- **Status:** ✅ DELETED (removed from codebase on 2025-11-21)
- **Purpose:** Originally collected simulated B3 data
- **Why deleted:** System now uses real historical data exclusively
- **Recovery:** Code preserved in git history if needed for reference

### 🗑️ `/api/collect-data.js` - DELETED
- **Status:** ✅ DELETED (removed from codebase on 2025-11-21)
- **Purpose:** Original simplified collection endpoint
- **Why deleted:** Replaced by `/api/refresh.js` for real data
- **Recovery:** Code preserved in git history if needed for reference

## Production Endpoints (Safe to Use)

### ✅ `/api/refresh` (POST)
- **Status:** ACTIVE - Production endpoint
- **Purpose:** Recalculate opportunities from existing real data in di1_prices
- **Data source:** Real B3 data stored in Supabase
- **Safe:** YES - Only reads existing data, no simulated generation

### ✅ `/api/opportunities` (GET)
- **Status:** ACTIVE - Production endpoint
- **Purpose:** List all arbitrage opportunities (cached)
- **Data source:** opportunities_cache table (generated from real B3 data)
- **Safe:** YES - Read-only

### ✅ `/api/pair/[pairId]` (GET)
- **Status:** ACTIVE - Production endpoint
- **Purpose:** Get detailed historical data for a specific contract pair
- **Data source:** Real B3 data from di1_prices
- **Safe:** YES - Read-only

## GitHub Actions Workflow

### Current Configuration (REAL DATA)
File: `.github/workflows/daily-collect.yml`

```yaml
- name: Collect data
  run: |
    # IMPORTANT: This calls /api/refresh, NOT /api/collect-simple
    curl -X POST https://curvadejuros.vercel.app/api/refresh
```

**Status:** ✅ Correctly using real data endpoint

### ⚠️ WRONG Configuration (DO NOT USE)
```yaml
# ❌ WRONG - DO NOT USE THIS
- name: Collect data
  run: |
    curl -X POST https://curvadejuros.vercel.app/api/collect-simple
```

**Risk:** This would generate and insert simulated data, corrupting production database

## How to Prevent Accidental Use

### 1. Code Review Checklist
Before deploying any changes:
- [ ] No references to `/api/collect-simple.js` in cron/workflows
- [ ] No references to simulated data generation functions
- [ ] GitHub Actions uses `/api/refresh` only
- [ ] Import scripts use real CSV data only

### 2. Database Validation
After any deployment or data collection:
```sql
-- Check latest import source
SELECT source_type, import_timestamp, notes 
FROM import_metadata 
ORDER BY import_timestamp DESC 
LIMIT 1;
```

**Expected:** `source_type = 'rb3_csv'` (not 'simulated')

### 3. Rate Range Validation
Real B3 data has specific rate ranges:
```sql
SELECT MIN(rate) as min_rate, MAX(rate) as max_rate 
FROM di1_prices 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

**Expected (Real Data):** ~12.84% to ~14.12% (Nov 2025)
**Warning Sign (Simulated):** ~11.20% to ~12.32% (old simulated data)

## Recovery Procedure

If simulated data is accidentally imported:

### Step 1: Verify Contamination
```sql
-- Check rate ranges and import history
SELECT * FROM import_metadata ORDER BY import_timestamp DESC LIMIT 5;
```

### Step 2: Rollback to Real Data
```bash
# Re-run import script with real CSV data
node scripts/import-real-data.js
```

### Step 3: Recalculate Opportunities
```bash
curl -X POST https://curvadejuros.vercel.app/api/refresh
```

### Step 4: Validate
```bash
# Should return 36 opportunities from real data
curl https://curvadejuros.vercel.app/api/opportunities | grep -c '"id"'
```

## File Locations

### ✅ Already Deleted (Simulated Data Code)
These files have been removed from the codebase (2025-11-21):
- ✅ `/api/collect-simple.js` - DELETED (simulated data generation)
- ✅ `/api/collect-data.js` - DELETED (simulated collection)
- ✅ All `generateSimulatedRate()` functions - DELETED

### Must Keep (Real Data Code)
- `/scripts/import-real-data.js` - Real data import from CSV
- `/api/refresh.js` - Recalculate from real data
- `/api/opportunities.js` - Read real opportunities
- `attached_assets/b3_backfill_real_data.csv` - Real historical data

## Daily Automated Collection

**Current Setup (Correct):**
- **Trigger:** GitHub Actions cron (0:00 UTC = 21:00 BRT)
- **Endpoint:** `POST /api/refresh`
- **Action:** Recalculate opportunities from existing real data
- **Data Source:** di1_prices table (real B3 historical data)

**Future Enhancement:**
When BDI CSV parser is implemented (2-3 hours):
1. Parse BDI CSV from B3 website
2. Extract DI1 futures data
3. UPSERT to di1_prices (append new day's data)
4. Call `/api/refresh` to recalculate opportunities

## Summary

| Endpoint | Status | Data Source | Production Safe |
|----------|--------|-------------|-----------------|
| `/api/refresh` | ✅ Active | Real B3 data | YES |
| `/api/opportunities` | ✅ Active | Real cache | YES |
| `/api/pair/[pairId]` | ✅ Active | Real B3 data | YES |
| `/api/collect-simple.js` | 🚫 Deprecated | Simulated | NO - DO NOT USE |
| `/api/collect-data.js` | 🚫 Deprecated | Simulated | NO - DO NOT USE |

## Questions?

Contact the development team before:
- Modifying GitHub Actions workflows
- Changing data collection endpoints
- Removing/renaming files in `/api` directory
- Altering database schema for di1_prices or import_metadata tables
