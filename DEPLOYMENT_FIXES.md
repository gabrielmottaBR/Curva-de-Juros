# Deployment Fixes - 2025-11-22

## Problems Resolved

### 1. Module Type Conflict ⚡ CRITICAL
**Problem:** Project had `"type": "module"` in package.json but serverless functions use CommonJS (`require`, `module.exports`)

**Solution:**
- Removed `"type": "module"` from root package.json
- Created `api/package.json` with `"type": "commonjs"`
- Created `lib/package.json` with `"type": "commonjs"`
- Frontend (Vite) still uses ESM via .js extensions

**Result:** ✅ Serverless functions load correctly

---

### 2. Canvas Dependency (164 MB) 🎯
**Problem:** `pdf-parse` → `canvas` (164 MB) exceeds Vercel's 50 MB limit

**Solution:**
- Added override in package.json: `canvas` → `empty-npm-package`
- Canvas not needed for PDF parsing in serverless environment

**Result:** ✅ Bundle size within limits

---

### 3. Serverless Function Limit (12 max) 📊
**Problem:** Vercel Hobby plan allows max 12 functions, had utility files in /api

**Solution:**
- Moved utilities to `/lib` (don't count as functions)
- Deleted legacy endpoints (collect.js, test.js, recalculate.js)
- Updated all imports to new paths

**Final Count:** 5 active functions (well below 12 limit)

---

## Current Architecture

**Active Endpoints (5/12):**
1. `api/collect-real.js` - B3 BDI PDF collection (60s timeout)
2. `api/health.js` - Health check
3. `api/opportunities.js` - List opportunities
4. `api/refresh.js` - Recalculate opportunities
5. `api/pair/[pairId].js` - Pair details

**Utilities (don't count as functions):**
- `/lib/_shared.js` - Supabase client, CORS
- `/lib/utils.js` - Financial calculations
- `/api/utils/*` - PDF download, B3 calendar, contract manager
- `/api/parsers/*` - BDI parser

---

## Testing Commands

```bash
# Health check
curl https://curvadejuros.vercel.app/api/health

# Collect B3 data
curl -X POST "https://curvadejuros.vercel.app/api/collect-real?date=2025-11-19"

# List opportunities
curl https://curvadejuros.vercel.app/api/opportunities
```

---

## Status
✅ Ready for production deployment
