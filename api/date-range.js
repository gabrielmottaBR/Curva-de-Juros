/**
 * Endpoint: GET /api/date-range
 * 
 * Retorna as datas mínima e máxima disponíveis no banco de dados
 * para definir o range de datas do backtesting
 * 
 * Retorno:
 *   {
 *     success: true,
 *     min_date: '2024-01-15',
 *     max_date: '2025-11-21',
 *     total_days: 315
 *   }
 */

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('../lib/_shared');

module.exports = async (req, res) => {
  // Handle CORS
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    const supabase = getSupabaseClient();

    // Buscar data mínima e máxima da tabela di1_prices (dados históricos)
    const { data, error } = await supabase
      .from('di1_prices')
      .select('date')
      .order('date', { ascending: true })
      .limit(1)
      .single();

    const { data: maxData, error: maxError } = await supabase
      .from('di1_prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || maxError) {
      console.error('[Date Range] Erro ao buscar datas:', error || maxError);
      
      // Retornar dados padrão se não houver dados no banco
      return res.json({
        success: true,
        min_date: '2024-01-01',
        max_date: new Date().toISOString().split('T')[0],
        total_days: 0,
        has_data: false
      });
    }

    const minDate = data?.date || '2024-01-01';
    const maxDate = maxData?.date || new Date().toISOString().split('T')[0];

    // Calcular diferença em dias
    const diffTime = Math.abs(new Date(maxDate) - new Date(minDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    console.log(`[Date Range] Min: ${minDate}, Max: ${maxDate}, Days: ${diffDays}`);

    res.json({
      success: true,
      min_date: minDate,
      max_date: maxDate,
      total_days: diffDays,
      has_data: true
    });

  } catch (error) {
    console.error('[Date Range] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
