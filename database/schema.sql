-- Schema for Curva de Juros Application
-- Creates tables for DI1 futures prices and arbitrage opportunities cache

-- Table: di1_prices
-- Stores historical price data for DI1 futures contracts
CREATE TABLE IF NOT EXISTS di1_prices (
  id SERIAL PRIMARY KEY,
  contract_code VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  rate NUMERIC(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: one price per contract per day
  CONSTRAINT di1_prices_contract_code_date_key UNIQUE (contract_code, date)
);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_di1_prices_date ON di1_prices(date DESC);

-- Index for faster queries by contract
CREATE INDEX IF NOT EXISTS idx_di1_prices_contract ON di1_prices(contract_code);

-- Table: opportunities_cache
-- Stores pre-calculated arbitrage opportunities for fast API response
CREATE TABLE IF NOT EXISTS opportunities_cache (
  id SERIAL PRIMARY KEY,
  pair_id VARCHAR(50) NOT NULL UNIQUE,
  short_id VARCHAR(10) NOT NULL,
  long_id VARCHAR(10) NOT NULL,
  short_label VARCHAR(50) NOT NULL,
  long_label VARCHAR(50) NOT NULL,
  z_score NUMERIC(10, 4),
  current_spread NUMERIC(10, 4),
  mean_spread NUMERIC(10, 4),
  std_dev_spread NUMERIC(10, 4),
  cointegration_p_value NUMERIC(10, 6),
  recommendation VARCHAR(50),
  details_json TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by pair_id
CREATE INDEX IF NOT EXISTS idx_opportunities_pair ON opportunities_cache(pair_id);

-- Index for filtering by recommendation
CREATE INDEX IF NOT EXISTS idx_opportunities_recommendation ON opportunities_cache(recommendation);

-- Comments for documentation
COMMENT ON TABLE di1_prices IS 'Historical daily rates for DI1 futures contracts from B3';
COMMENT ON TABLE opportunities_cache IS 'Pre-calculated spread arbitrage opportunities with statistical analysis';
COMMENT ON COLUMN di1_prices.rate IS 'Implied annual interest rate in percentage (e.g., 11.25 for 11.25%)';
COMMENT ON COLUMN opportunities_cache.z_score IS 'Statistical z-score indicating how far current spread deviates from mean';
COMMENT ON COLUMN opportunities_cache.details_json IS 'JSON string containing historical data, PU values, DV01, and hedge ratios';
