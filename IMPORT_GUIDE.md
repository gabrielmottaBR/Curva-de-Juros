# Import Guide - B3 Real Data

## Overview
This guide explains how to safely import real B3 historical data into the Curva de Juros application.

## Prerequisites
- Supabase database with tables created (see `database/schema.sql`)
- Real B3 data CSV file in `attached_assets/b3_backfill_real_data.csv`
- Node.js environment with dependencies installed

## Import Script Features

### 🔄 Idempotent (Safe to Re-run)
The import script uses **UPSERT** instead of INSERT, meaning:
- ✅ You can run it multiple times safely
- ✅ Existing records are updated, not duplicated
- ✅ No errors if data already exists
- ✅ Perfect for incremental updates

### 📊 Automatic Deduplication
The script handles duplicate (date, contract) pairs by:
- **Strategy:** Averaging rates for duplicate entries
- **Example:** If CSV has 2,329 raw records, it deduplicates to 963 unique records
- **Logging:** Shows before/after counts in console

### 📝 Audit Trail
Every import is logged to `import_metadata` table with:
- Source type (rb3_csv, bdi_csv, etc.)
- Source file path
- Record counts (raw → unique → imported)
- Date range and contract coverage
- Rate min/max values
- Deduplication strategy used
- Timestamp and notes

## How to Run

### 1. First Time Import
```bash
node scripts/import-real-data.js
```

Expected output:
```
═══════════════════════════════════════════════════════
🇧🇷  B3 Real Data Import - Curva de Juros
═══════════════════════════════════════════════════════

📂 Reading CSV file: /path/to/attached_assets/b3_backfill_real_data.csv
✅ Parsed 2329 valid records (skipped 0)

🔄 Removing duplicates (averaging rates for same date+contract)...
   Before deduplication: 2329
   After deduplication: 963
   Removed 1366 duplicate entries

🗑️  Step 1: Clearing simulated data from di1_prices...
   Current records in table: 0
   ✅ Table already empty, skipping delete

📥 Step 2: Importing real B3 data (UPSERT mode - safe to re-run)...
   Total records to import: 963
   Batches: 2 (500 records per batch)
   📦 Batch 1/2: Upserting 500 records...
   ✅ Upserted 500 records (cumulative: 500)
   📦 Batch 2/2: Upserting 463 records...
   ✅ Upserted 463 records (cumulative: 963)

✅ Successfully upserted 963 records!

✅ Step 3: Validating import...
   Total records in table: 963
   ✅ Count matches expected: 963
   Date range: 2025-06-24 to 2025-11-19
   Unique contracts (9): DI1F27, DI1F28, DI1F29, DI1F30, DI1F31, DI1F32, DI1F33, DI1F34, DI1F35
   Rate range: 12.8403% to 14.1190%

✅ Validation complete!

📝 Step 4: Saving import metadata for audit trail...
   ✅ Import metadata saved successfully

═══════════════════════════════════════════════════════
✅ SUCCESS! Real B3 data has been imported
═══════════════════════════════════════════════════════
```

### 2. Re-running Import (Updates)
Running the script again is **100% safe**:
- Existing records are updated (not duplicated)
- New records are added
- Import metadata tracks each run

```bash
node scripts/import-real-data.js
```

### 3. After Import: Recalculate Opportunities
```bash
curl -X POST https://curvadejuros.vercel.app/api/refresh
```

This recalculates all arbitrage opportunities based on the imported data.

## Validating Import

### Check Record Counts
```sql
SELECT COUNT(*) as total_records,
       MIN(date) as oldest_date,
       MAX(date) as newest_date,
       COUNT(DISTINCT contract_code) as unique_contracts
FROM di1_prices;
```

### View Import History
```sql
SELECT id,
       source_type,
       import_timestamp,
       records_raw,
       records_unique,
       records_imported,
       date_range_start,
       date_range_end,
       contracts_count
FROM import_metadata
ORDER BY import_timestamp DESC
LIMIT 10;
```

### Check Latest Import
```sql
SELECT * FROM import_metadata 
ORDER BY import_timestamp DESC 
LIMIT 1;
```

## CSV Format

The CSV must have these columns:
```
date,contract_code,rate
2025-06-24,DI1F27,13.4123
2025-06-24,DI1F28,13.5456
...
```

- **date:** YYYY-MM-DD format
- **contract_code:** DI1F27, DI1F28, etc.
- **rate:** Decimal percentage (13.4123 = 13.4123%)

## Automated Validation

### Run Production Safety Check
```bash
node scripts/validate-real-data.js
```

This validates:
- ✅ Latest import uses real B3 data (not simulated)
- ✅ Data quality (rate ranges 12-15%)
- ✅ No simulated endpoints in codebase
- ✅ Opportunities cache exists

**Exit codes:**
- `0`: All validations passed (production-safe)
- `1`: Validation failed (immediate action required)

**Recommended:** Run this in CI/CD pipeline or as scheduled cron to detect issues early.

## Troubleshooting

### Error: "relation 'import_metadata' does not exist"
Run the SQL schema creation in Supabase:
```bash
cat database/schema.sql | grep -A 25 "Table: import_metadata"
```
Then execute that SQL in Supabase SQL Editor.

### Error: "CSV file not found"
Ensure CSV file exists at:
```
attached_assets/b3_backfill_real_data.csv
```

### Warning: Count mismatch
If validation shows mismatch between expected and actual:
1. Check if previous imports added extra records
2. Review deduplication logic
3. Query `import_metadata` to see import history

## Data Source

Current CSV source: **rb3 R package**
- Collected manually by user running R script
- Historical data: 2025-06-24 to 2025-11-19 (~107 business days)
- All 9 DI1 contracts (DI1F27 - DI1F35)

## Next Steps

After successful import:
1. ✅ Recalculate opportunities: `POST /api/refresh`
2. ✅ Validate frontend: https://curvadejuros.vercel.app
3. ✅ Check opportunities count: `GET /api/opportunities`
4. ✅ Monitor for daily automated collection (0:00 UTC via GitHub Actions)

## Production Safety

✅ **Safe to run in production** because:
- UPSERT prevents duplicates
- Audit trail tracks all changes
- No data loss on re-runs
- Validation confirms integrity

❌ **Do NOT**:
- Delete `import_metadata` table (audit trail)
- Modify CSV after import (breaks reproducibility)
- Run without backup if making schema changes
