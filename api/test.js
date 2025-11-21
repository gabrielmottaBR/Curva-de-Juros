// api/test.js - Diagnostic endpoint
const { getSupabaseClient, setCorsHeaders, handleOptions } = require('./_shared');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    console.log('[Test] Starting diagnostic...');
    
    // Test 1: Environment variables
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_KEY;
    
    console.log('[Test] SUPABASE_URL:', hasUrl ? 'Present' : 'Missing');
    console.log('[Test] SUPABASE_SERVICE_KEY:', hasKey ? 'Present' : 'Missing');
    
    if (!hasUrl || !hasKey) {
      return res.status(500).json({
        error: 'Environment variables missing',
        hasUrl,
        hasKey
      });
    }
    
    // Test 2: Supabase connection
    const supabase = getSupabaseClient();
    console.log('[Test] Supabase client created');
    
    // Test 3: Database query
    const { data, error } = await supabase
      .from('di1_prices')
      .select('date')
      .limit(1);
    
    if (error) {
      console.error('[Test] Database error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        message: error.message
      });
    }
    
    console.log('[Test] Database query successful');
    
    res.status(200).json({
      success: true,
      message: 'All systems operational',
      envVars: { hasUrl, hasKey },
      database: 'Connected',
      sampleData: data
    });
    
  } catch (err) {
    console.error('[Test] Error:', err);
    res.status(500).json({
      error: 'Test failed',
      message: err.message,
      stack: err.stack
    });
  }
};
