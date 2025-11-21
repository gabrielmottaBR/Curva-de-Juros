#!/usr/bin/env node

/**
 * Import Real B3 Data Script
 * 
 * This script imports real historical DI1 futures data from B3 (Brazilian stock exchange)
 * collected via the rb3 R package. It replaces simulated data with authentic market data.
 * 
 * Data source: rb3 package (100 business days: 2025-06-24 to 2025-11-20)
 * Total records: 2,329 (9 contracts × ~107 business days, some days have <9 contracts)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing environment variables');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse CSV file into array of records
 */
function parseCSV(filePath) {
  console.log(`📂 Reading CSV file: ${filePath}`);
  
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const records = [];
  let skipped = 0;
  
  for (let line of dataLines) {
    // Remove carriage return if present (Windows CRLF)
    line = line.trim();
    
    if (!line) continue; // Skip empty lines
    
    // Parse CSV line: format is: 2025-06-24,"DI1F27",14.2426059864446
    // Date has no quotes, contract_code has quotes, rate has no quotes
    const match = line.match(/^([0-9-]+),"([^"]+)",([0-9.]+)$/);
    
    if (!match) {
      console.warn(`⚠️  Skipping malformed line: ${line.substring(0, 50)}...`);
      skipped++;
      continue;
    }
    
    const [, date, contractCode, rateStr] = match;
    const rate = parseFloat(rateStr);
    
    // Validate data
    if (!date || !contractCode || isNaN(rate)) {
      console.warn(`⚠️  Skipping invalid record: date=${date}, contract=${contractCode}, rate=${rateStr}`);
      skipped++;
      continue;
    }
    
    // Validate rate range (sanity check: Brazilian interest rates typically 10-15%)
    if (rate < 5 || rate > 30) {
      console.warn(`⚠️  Suspicious rate (${rate}%) for ${contractCode} on ${date}, but including anyway`);
    }
    
    records.push({
      date: date,
      contract_code: contractCode,
      rate: rate
    });
  }
  
  console.log(`✅ Parsed ${records.length} valid records (skipped ${skipped})`);
  return records;
}

/**
 * Clear existing simulated data from di1_prices table
 */
async function clearSimulatedData() {
  console.log('\n🗑️  Step 1: Clearing simulated data from di1_prices...');
  
  const { data: existingCount } = await supabase
    .from('di1_prices')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Current records in table: ${existingCount}`);
  
  if (existingCount === 0) {
    console.log('   ✅ Table already empty, skipping delete');
    return;
  }
  
  // Delete all records
  const { error } = await supabase
    .from('di1_prices')
    .delete()
    .neq('id', -1); // Delete all records (neq trick to delete everything)
  
  if (error) {
    console.error('   ❌ Failed to delete:', error);
    throw error;
  }
  
  console.log(`   ✅ Deleted ${existingCount} simulated records`);
}

/**
 * Import real data in batches
 */
async function importRealData(records) {
  console.log('\n📥 Step 2: Importing real B3 data...');
  console.log(`   Total records to import: ${records.length}`);
  
  const BATCH_SIZE = 500;
  const batches = [];
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`   Batches: ${batches.length} (${BATCH_SIZE} records per batch)`);
  
  let totalInserted = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    console.log(`   📦 Batch ${i + 1}/${batches.length}: Inserting ${batch.length} records...`);
    
    const { data, error } = await supabase
      .from('di1_prices')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`   ❌ Error in batch ${i + 1}:`, error);
      throw error;
    }
    
    totalInserted += data.length;
    console.log(`   ✅ Inserted ${data.length} records (cumulative: ${totalInserted})`);
  }
  
  console.log(`\n✅ Successfully imported ${totalInserted} records!`);
  return totalInserted;
}

/**
 * Validate imported data
 */
async function validateImport(expectedCount) {
  console.log('\n✅ Step 3: Validating import...');
  
  // Count total records
  const { count: totalCount, error: countError } = await supabase
    .from('di1_prices')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('   ❌ Failed to count records:', countError);
    throw countError;
  }
  
  console.log(`   Total records in table: ${totalCount}`);
  
  if (totalCount !== expectedCount) {
    console.warn(`   ⚠️  Warning: Expected ${expectedCount}, got ${totalCount}`);
  } else {
    console.log(`   ✅ Count matches expected: ${expectedCount}`);
  }
  
  // Get date range
  const { data: dateRange, error: dateError } = await supabase
    .from('di1_prices')
    .select('date')
    .order('date', { ascending: true })
    .limit(1);
  
  const { data: dateRangeMax, error: dateErrorMax } = await supabase
    .from('di1_prices')
    .select('date')
    .order('date', { ascending: false })
    .limit(1);
  
  if (!dateError && !dateErrorMax && dateRange && dateRangeMax) {
    console.log(`   Date range: ${dateRange[0]?.date} to ${dateRangeMax[0]?.date}`);
  }
  
  // Get unique contracts
  const { data: contracts, error: contractError } = await supabase
    .from('di1_prices')
    .select('contract_code')
    .order('contract_code');
  
  if (!contractError && contracts) {
    const uniqueContracts = [...new Set(contracts.map(c => c.contract_code))];
    console.log(`   Unique contracts (${uniqueContracts.length}): ${uniqueContracts.join(', ')}`);
  }
  
  // Get rate range
  const { data: rates, error: ratesError } = await supabase
    .from('di1_prices')
    .select('rate')
    .order('rate', { ascending: true })
    .limit(1);
  
  const { data: ratesMax, error: ratesErrorMax } = await supabase
    .from('di1_prices')
    .select('rate')
    .order('rate', { ascending: false })
    .limit(1);
  
  if (!ratesError && !ratesErrorMax && rates && ratesMax) {
    console.log(`   Rate range: ${rates[0]?.rate.toFixed(4)}% to ${ratesMax[0]?.rate.toFixed(4)}%`);
  }
  
  console.log('\n✅ Validation complete!');
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🇧🇷  B3 Real Data Import - Curva de Juros');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Read and parse CSV
    const csvPath = path.join(__dirname, '..', 'attached_assets', 'b3_backfill_real_data.csv');
    const records = parseCSV(csvPath);
    
    if (records.length === 0) {
      console.error('❌ No records to import!');
      process.exit(1);
    }
    
    // Clear existing data
    await clearSimulatedData();
    
    // Import real data
    const insertedCount = await importRealData(records);
    
    // Validate import
    await validateImport(insertedCount);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Real B3 data has been imported');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: curl -X POST https://curvadejuros.vercel.app/api/refresh');
    console.log('   2. Verify opportunities in frontend');
    console.log('   3. Update documentation\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run main function
main();
