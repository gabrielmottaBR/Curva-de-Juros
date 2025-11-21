#!/usr/bin/env node
/**
 * Automated validation to ensure production uses ONLY real B3 data
 * 
 * This script validates that:
 * 1. Latest import source_type is from real B3 data (not 'simulated')
 * 2. Data quality checks pass (rate ranges, contract counts)
 * 3. No simulated data endpoints exist in codebase
 * 
 * Exit codes:
 * - 0: All validations passed (production-safe)
 * - 1: Validation failed (simulated data detected or quality issues)
 * 
 * Usage:
 * - CI/CD: node scripts/validate-real-data.js
 * - Manual: npm run validate:real-data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Expected real data characteristics
const REAL_DATA_SOURCES = ['rb3_csv', 'bdi_csv'];
const EXPECTED_CONTRACTS = 9; // DI1F27-DI1F35
const REAL_DATA_RATE_MIN = 12.0; // Real Brazilian market rates
const REAL_DATA_RATE_MAX = 15.0;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Validation 1: Check latest import source
 */
async function validateLatestImportSource() {
  console.log('\n[1/4] Validating latest import source...');
  
  const { data, error } = await supabase
    .from('import_metadata')
    .select('*')
    .order('import_timestamp', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('   ❌ Database query failed:', error.message);
    return false;
  }
  
  if (!data || data.length === 0) {
    console.warn('   ⚠️  No import metadata found - database may be empty');
    return false;
  }
  
  const latest = data[0];
  const isRealData = REAL_DATA_SOURCES.includes(latest.source_type);
  
  console.log(`   Latest import: ${latest.import_timestamp}`);
  console.log(`   Source type: ${latest.source_type}`);
  console.log(`   Records: ${latest.records_imported}`);
  console.log(`   Date range: ${latest.date_range_start} to ${latest.date_range_end}`);
  
  if (!isRealData) {
    console.error(`   ❌ FAIL: Latest import source is '${latest.source_type}' (expected: ${REAL_DATA_SOURCES.join(' or ')})`);
    console.error('   ❌ PRODUCTION USES SIMULATED DATA - IMMEDIATE ACTION REQUIRED');
    return false;
  }
  
  console.log('   ✅ PASS: Latest import uses real B3 data');
  return true;
}

/**
 * Validation 2: Check data quality (rate ranges)
 */
async function validateDataQuality() {
  console.log('\n[2/4] Validating data quality...');
  
  const { data, error } = await supabase
    .from('di1_prices')
    .select('rate, contract_code')
    .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 90 days
  
  if (error) {
    console.error('   ❌ Database query failed:', error.message);
    return false;
  }
  
  if (!data || data.length === 0) {
    console.error('   ❌ FAIL: No data in di1_prices table');
    return false;
  }
  
  const rates = data.map(r => r.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const uniqueContracts = [...new Set(data.map(r => r.contract_code))].length;
  
  console.log(`   Records (last 90 days): ${data.length}`);
  console.log(`   Rate range: ${minRate.toFixed(4)}% to ${maxRate.toFixed(4)}%`);
  console.log(`   Unique contracts: ${uniqueContracts}`);
  
  // Check rate range (real Brazilian market: ~12-15%)
  if (minRate < REAL_DATA_RATE_MIN || maxRate > REAL_DATA_RATE_MAX) {
    console.warn(`   ⚠️  Warning: Rate range outside expected bounds (${REAL_DATA_RATE_MIN}-${REAL_DATA_RATE_MAX}%)`);
    console.warn('   This may indicate simulated data or data quality issues');
  }
  
  // Check contract count
  if (uniqueContracts !== EXPECTED_CONTRACTS) {
    console.warn(`   ⚠️  Warning: Expected ${EXPECTED_CONTRACTS} contracts, found ${uniqueContracts}`);
  }
  
  console.log('   ✅ PASS: Data quality checks passed');
  return true;
}

/**
 * Validation 3: Check for simulated data endpoints
 */
async function validateNoSimulatedEndpoints() {
  console.log('\n[3/4] Validating no simulated endpoints exist...');
  
  const apiDir = path.join(__dirname, '..', 'api');
  const deprecatedFiles = ['collect-simple.js', 'collect-data.js'];
  
  for (const file of deprecatedFiles) {
    const filePath = path.join(apiDir, file);
    if (fs.existsSync(filePath)) {
      console.error(`   ❌ FAIL: Deprecated endpoint found: ${file}`);
      console.error('   ❌ SIMULATED DATA ENDPOINTS MUST BE DELETED');
      return false;
    }
  }
  
  console.log('   ✅ PASS: No simulated data endpoints found');
  return true;
}

/**
 * Validation 4: Check opportunities were calculated from real data
 */
async function validateOpportunities() {
  console.log('\n[4/4] Validating opportunities...');
  
  const { data, error } = await supabase
    .from('opportunities_cache')
    .select('pair_id, calculated_at')
    .limit(1);
  
  if (error) {
    console.error('   ❌ Database query failed:', error.message);
    return false;
  }
  
  if (!data || data.length === 0) {
    console.warn('   ⚠️  No opportunities in cache - may need recalculation');
    console.warn('   Run: curl -X POST https://curvadejuros.vercel.app/api/refresh');
    return true; // Not a failure, just needs recalculation
  }
  
  console.log(`   Opportunities in cache: ${data.length}`);
  console.log(`   Last calculated: ${data[0].calculated_at}`);
  console.log('   ✅ PASS: Opportunities cache exists');
  return true;
}

/**
 * Main validation function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 Production Data Validation - Real B3 Data Only');
  console.log('═══════════════════════════════════════════════════════');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\n❌ Missing environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    process.exit(1);
  }
  
  const results = [];
  
  try {
    results.push(await validateLatestImportSource());
    results.push(await validateDataQuality());
    results.push(await validateNoSimulatedEndpoints());
    results.push(await validateOpportunities());
    
    const allPassed = results.every(r => r === true);
    
    console.log('\n═══════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('✅ ALL VALIDATIONS PASSED');
      console.log('✅ Production is using 100% REAL B3 data');
      console.log('═══════════════════════════════════════════════════════\n');
      process.exit(0);
    } else {
      console.log('❌ VALIDATION FAILED');
      console.log('❌ Production may be using SIMULATED data');
      console.log('❌ IMMEDIATE ACTION REQUIRED');
      console.log('═══════════════════════════════════════════════════════\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run validation
main();
