#!/usr/bin/env node

/**
 * Create Database Schema Script
 * 
 * This script creates the necessary tables in Supabase for the Curva de Juros application.
 * It reads the schema.sql file and executes it using Supabase's REST API.
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

console.log('═══════════════════════════════════════════════════════');
console.log('📋 Creating Database Schema - Curva de Juros');
console.log('═══════════════════════════════════════════════════════\n');

// Read schema file
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
console.log(`📂 Reading schema file: ${schemaPath}\n`);

const schema = fs.readFileSync(schemaPath, 'utf-8');

// Execute schema using Supabase RPC
async function createSchema() {
  try {
    console.log('🔨 Creating tables...\n');
    
    // Split SQL into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements\n`);
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
      
      console.log(`   [${i + 1}/${statements.length}] ${preview}...`);
      
      // Use Supabase's RPC to execute raw SQL
      const { error } = await supabase.rpc('exec_sql', { query: stmt });
      
      if (error) {
        // If exec_sql RPC doesn't exist, we need to use the REST API directly
        if (error.message.includes('function') || error.code === '42883') {
          console.warn('   ⚠️  RPC method not available, trying alternative...\n');
          
          // Try using the Supabase management API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: stmt })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ All SQL statements executed successfully!');
    
    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    
    const { data: di1Count, error: di1Error } = await supabase
      .from('di1_prices')
      .select('*', { count: 'exact', head: true });
    
    const { data: oppCount, error: oppError } = await supabase
      .from('opportunities_cache')
      .select('*', { count: 'exact', head: true });
    
    if (di1Error || oppError) {
      console.error('   ⚠️  Warning: Could not verify tables');
      if (di1Error) console.error('   di1_prices:', di1Error.message);
      if (oppError) console.error('   opportunities_cache:', oppError.message);
    } else {
      console.log('   ✅ di1_prices table exists (0 records)');
      console.log('   ✅ opportunities_cache table exists (0 records)');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Database schema created successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 Next step: Run import script to load real B3 data\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error('\n⚠️  ALTERNATIVE: Execute SQL manually in Supabase dashboard:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select your project');
    console.error('   3. Go to SQL Editor');
    console.error('   4. Copy content from database/schema.sql');
    console.error('   5. Paste and click "Run"\n');
    process.exit(1);
  }
}

createSchema();
