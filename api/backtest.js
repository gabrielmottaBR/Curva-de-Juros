/**
 * Endpoint: GET /api/backtest
 * 
 * Simula trading histórico baseado nos sinais de spread arbitrage
 * 
 * Query params:
 *   - start_date: Data inicial (YYYY-MM-DD)
 *   - end_date: Data final (YYYY-MM-DD)
 *   - pair_id: (opcional) Par específico para backtesting
 * 
 * Retorna:
 *   - trades: Array de trades executados
 *   - metrics: Métricas agregadas (win_rate, pnl_total, sharpe, max_drawdown)
 *   - equity_curve: Curva de P&L acumulado
 */

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('../lib/_shared');

module.exports = async (req, res) => {
  // Handle CORS
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    const { start_date, end_date, pair_id } = req.query;

    // Validações
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing start_date or end_date parameters'
      });
    }

    const supabase = getSupabaseClient();

    console.log(`[Backtest] Período: ${start_date} a ${end_date}`);
    if (pair_id) console.log(`[Backtest] Par específico: ${pair_id}`);

    // Buscar oportunidades históricas do cache
    let query = supabase
      .from('opportunities_cache')
      .select('*')
      .gte('calculated_at', start_date)
      .lte('calculated_at', end_date)
      .order('calculated_at', { ascending: true });

    if (pair_id) {
      query = query.eq('id', pair_id);
    }

    const { data: opportunities, error } = await query;

    if (error) {
      console.error('[Backtest] Erro ao buscar oportunidades:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!opportunities || opportunities.length === 0) {
      return res.json({
        success: true,
        trades: [],
        metrics: {
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0,
          pnl_total: 0,
          avg_pnl_per_trade: 0,
          sharpe_ratio: 0,
          max_drawdown: 0
        },
        equity_curve: []
      });
    }

    console.log(`[Backtest] ${opportunities.length} oportunidades encontradas`);

    // Simular trades
    const trades = [];
    const dailyPnL = [];
    let cumulativePnL = 0;

    // Agrupar por data e par
    const oppsByDate = {};
    for (const opp of opportunities) {
      const date = opp.calculated_at?.substring(0, 10) || opp.date;
      if (!oppsByDate[date]) oppsByDate[date] = [];
      oppsByDate[date].push(opp);
    }

    const dates = Object.keys(oppsByDate).sort();

    // Estratégia simples: entrar quando |z-score| > 2, sair quando |z-score| < 0.5
    const ENTRY_THRESHOLD = 2.0;
    const EXIT_THRESHOLD = 0.5;
    const openPositions = new Map(); // pair_id -> {entry_spread, entry_zscore, entry_date, type}

    for (const date of dates) {
      const dailyOpps = oppsByDate[date];
      let dailyPnLAmount = 0;

      for (const opp of dailyOpps) {
        const pairKey = `${opp.short_contract}_${opp.long_contract}`;
        const currentZScore = opp.z_score;
        const currentSpread = opp.current_spread;
        const position = openPositions.get(pairKey);

        // Verificar saída de posição existente
        if (position) {
          if (Math.abs(currentZScore) < EXIT_THRESHOLD) {
            // Fechar posição
            const spreadChange = currentSpread - position.entry_spread;
            const pnl = position.type === 'BUY' ? spreadChange : -spreadChange;

            trades.push({
              pair: pairKey,
              entry_date: position.entry_date,
              exit_date: date,
              entry_spread: position.entry_spread,
              exit_spread: currentSpread,
              entry_zscore: position.entry_zscore,
              exit_zscore: currentZScore,
              type: position.type,
              pnl: pnl
            });

            dailyPnLAmount += pnl;
            openPositions.delete(pairKey);
            console.log(`[Backtest] ${date} - FECHAR ${position.type} ${pairKey}: P&L = ${pnl.toFixed(2)} bps`);
          }
        } else {
          // Verificar entrada de nova posição
          if (Math.abs(currentZScore) > ENTRY_THRESHOLD) {
            const tradeType = currentZScore > 0 ? 'SELL' : 'BUY';
            openPositions.set(pairKey, {
              entry_spread: currentSpread,
              entry_zscore: currentZScore,
              entry_date: date,
              type: tradeType
            });
            console.log(`[Backtest] ${date} - ABRIR ${tradeType} ${pairKey}: Spread = ${currentSpread.toFixed(2)}, Z = ${currentZScore.toFixed(2)}`);
          }
        }
      }

      cumulativePnL += dailyPnLAmount;
      dailyPnL.push({
        date: date,
        daily_pnl: dailyPnLAmount,
        cumulative_pnl: cumulativePnL
      });
    }

    // Calcular métricas
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    // Sharpe Ratio (simplificado)
    const pnlArray = dailyPnL.map(d => d.daily_pnl);
    const meanPnL = pnlArray.reduce((sum, p) => sum + p, 0) / pnlArray.length;
    const variance = pnlArray.reduce((sum, p) => sum + Math.pow(p - meanPnL, 2), 0) / pnlArray.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanPnL / stdDev) * Math.sqrt(252) : 0; // Anualizado

    // Max Drawdown
    let maxDrawdown = 0;
    let peak = 0;
    for (const point of dailyPnL) {
      if (point.cumulative_pnl > peak) peak = point.cumulative_pnl;
      const drawdown = peak - point.cumulative_pnl;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    console.log(`[Backtest] Concluído: ${totalTrades} trades, Win Rate = ${winRate.toFixed(1)}%, P&L = ${totalPnL.toFixed(2)} bps`);

    res.json({
      success: true,
      trades: trades,
      metrics: {
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: totalTrades - winningTrades,
        win_rate: winRate,
        pnl_total: totalPnL,
        avg_pnl_per_trade: totalTrades > 0 ? totalPnL / totalTrades : 0,
        sharpe_ratio: sharpeRatio,
        max_drawdown: maxDrawdown
      },
      equity_curve: dailyPnL
    });

  } catch (error) {
    console.error('[Backtest] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
