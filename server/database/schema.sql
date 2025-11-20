-- Schema for DI1 Interest Rate Curve Analyzer
-- Execute this SQL in your Supabase SQL Editor

-- Table for storing daily DI1 futures prices
CREATE TABLE IF NOT EXISTS di1_prices (
  id BIGSERIAL PRIMARY KEY,
  contract_code VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  rate DECIMAL(10, 4) NOT NULL,
  price DECIMAL(15, 4),
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_code, date)
);

-- Index for faster queries by contract and date
CREATE INDEX IF NOT EXISTS idx_di1_prices_contract_date ON di1_prices(contract_code, date DESC);
CREATE INDEX IF NOT EXISTS idx_di1_prices_date ON di1_prices(date DESC);

-- Table for caching calculated opportunities
CREATE TABLE IF NOT EXISTS opportunities_cache (
  id BIGSERIAL PRIMARY KEY,
  pair_id VARCHAR(50) NOT NULL UNIQUE,
  short_id VARCHAR(10) NOT NULL,
  long_id VARCHAR(10) NOT NULL,
  short_label VARCHAR(20) NOT NULL,
  long_label VARCHAR(20) NOT NULL,
  z_score DECIMAL(10, 4) NOT NULL,
  current_spread DECIMAL(10, 4) NOT NULL,
  mean_spread DECIMAL(10, 4) NOT NULL,
  std_dev_spread DECIMAL(10, 4) NOT NULL,
  recommendation VARCHAR(20) NOT NULL,
  cointegration_p_value DECIMAL(10, 4),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  details_json JSONB NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_opportunities_cache_calculated_at ON opportunities_cache(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_cache_z_score ON opportunities_cache(ABS(z_score) DESC);

-- Comments for documentation
COMMENT ON TABLE di1_prices IS 'Historical daily prices for DI1 futures contracts from B3';
COMMENT ON TABLE opportunities_cache IS 'Pre-calculated spread arbitrage opportunities with Z-scores and recommendations';
COMMENT ON COLUMN di1_prices.rate IS 'Annual interest rate in percentage (e.g., 11.50 for 11.5%)';
COMMENT ON COLUMN opportunities_cache.details_json IS 'Full historical data and calculations for the opportunity';
