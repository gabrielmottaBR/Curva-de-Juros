/**
 * Endpoint: GET /api/backtest
 * 
 * Simula trading histórico baseado nos sinais de spread arbitrage
 * 
 * Query params:
 *   - start_date: Data inicial (YYYY-MM-DD)
 *   - end_date: Data final (YYYY-MM-DD)
 *   - trade_type: Tipo de operação ('BOTH', 'LONG', 'SHORT') [padrão: 'BOTH']
 *   - risk_per_trade: Risco financeiro por operação em R$ [padrão: 10000]
 *   - pair_id: (opcional) Par específico para backtesting
 * 
 * Retorna:
 *   - trades: Array de trades executados
 *   - metrics: Métricas agregadas (win_rate, pnl_total, sharpe, max_drawdown)
 *   - equity_curve: Curva de P&L acumulado
 */

const { getSupabaseClient, setCorsHeaders, handleOptions } = require('../lib/_shared');

// Funções auxiliares para cálculo de z-score
function calculateMean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values, mean) {
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

module.exports = async (req, res) => {
  // Handle CORS
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  try {
    const { 
      start_date, 
      end_date, 
      pair_id,
      trade_type = 'BOTH',
      risk_per_trade = '10000'
    } = req.query;
    
    const tradeTypeFilter = trade_type.toUpperCase();
    const riskAmount = parseFloat(risk_per_trade);

    // Validações
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing start_date or end_date parameters'
      });
    }
    
    if (isNaN(riskAmount) || riskAmount < 100 || riskAmount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'risk_per_trade must be between R$ 100 and R$ 1,000,000'
      });
    }
    
    if (!['BOTH', 'LONG', 'SHORT'].includes(tradeTypeFilter)) {
      return res.status(400).json({
        success: false,
        error: 'trade_type must be BOTH, LONG, or SHORT'
      });
    }

    const supabase = getSupabaseClient();
    const LOOKBACK = 60; // Janela para calcular z-score

    console.log(`[Backtest] Período: ${start_date} a ${end_date}`);
    console.log(`[Backtest] Tipo de Trade: ${tradeTypeFilter}`);
    console.log(`[Backtest] Risco por Trade: R$ ${riskAmount.toFixed(2)}`);
    console.log(`[Backtest] Lookback: ${LOOKBACK} dias`);
    if (pair_id) console.log(`[Backtest] Par específico: ${pair_id}`);

    // Buscar preços históricos de di1_prices
    const { data: prices, error } = await supabase
      .from('di1_prices')
      .select('*')
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true });

    if (error) {
      console.error('[Backtest] Erro ao buscar preços:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!prices || prices.length === 0) {
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

    console.log(`[Backtest] ${prices.length} preços carregados`);

    // Agrupar preços por data
    const pricesByDate = {};
    for (const p of prices) {
      if (!pricesByDate[p.date]) pricesByDate[p.date] = {};
      pricesByDate[p.date][p.contract_code] = p.rate;
    }

    const dates = Object.keys(pricesByDate).sort();
    console.log(`[Backtest] ${dates.length} dias únicos encontrados`);

    // Definir pares a serem testados
    const PAIRS = [
      ['DI1F27', 'DI1F28'],
      ['DI1F28', 'DI1F29'],
      ['DI1F29', 'DI1F30'],
      ['DI1F30', 'DI1F31'],
      ['DI1F31', 'DI1F32'],
      ['DI1F32', 'DI1F33']
    ];

    // Filtrar por pair_id se especificado
    const pairsToTest = pair_id 
      ? PAIRS.filter(([short, long]) => `${short}_${long}` === pair_id)
      : PAIRS;

    const trades = [];
    const openPositions = new Map();
    const ENTRY_THRESHOLD = 1.5;
    const EXIT_THRESHOLD = 0.5;

    // Para cada par, calcular spreads e z-scores
    for (const [shortContract, longContract] of pairsToTest) {
      const pairKey = `${shortContract}_${longContract}`;
      const spreads = [];
      const validDates = [];

      // Montar série de spreads
      for (const date of dates) {
        const shortRate = pricesByDate[date][shortContract];
        const longRate = pricesByDate[date][longContract];
        
        if (shortRate && longRate) {
          spreads.push(shortRate - longRate);
          validDates.push(date);
        }
      }

      if (spreads.length < LOOKBACK + 10) {
        console.log(`[Backtest] Par ${pairKey}: dados insuficientes (${spreads.length} dias)`);
        continue;
      }

      console.log(`[Backtest] Par ${pairKey}: ${spreads.length} spreads calculados`);

      // Simular trades com janela móvel
      for (let i = LOOKBACK; i < spreads.length; i++) {
        const window = spreads.slice(i - LOOKBACK, i);
        const mean = calculateMean(window);
        const stdDev = calculateStdDev(window, mean);
        const currentSpread = spreads[i];
        const zScore = calculateZScore(currentSpread, mean, stdDev);
        const date = validDates[i];

        const position = openPositions.get(pairKey);

        // Verificar saída
        if (position) {
          if (Math.abs(zScore) < EXIT_THRESHOLD) {
            const spreadChange = currentSpread - position.entry_spread;
            const pnlBps = position.type === 'BUY' ? spreadChange : -spreadChange;
            const pnlReais = pnlBps * (riskAmount / 100);

            trades.push({
              pair: pairKey,
              entry_date: position.entry_date,
              exit_date: date,
              entry_spread: position.entry_spread,
              exit_spread: currentSpread,
              entry_zscore: position.entry_zscore,
              exit_zscore: zScore,
              type: position.type,
              pnl: pnlReais,
              pnl_bps: pnlBps
            });

            openPositions.delete(pairKey);
            console.log(`[Backtest] ${date} - FECHAR ${position.type} ${pairKey}: P&L = ${pnlBps.toFixed(2)} bps (R$ ${pnlReais.toFixed(2)})`);
          }
        } else {
          // Verificar entrada
          if (Math.abs(zScore) > ENTRY_THRESHOLD) {
            const tradeType = zScore > 0 ? 'SELL' : 'BUY';
            
            const shouldEnter = 
              tradeTypeFilter === 'BOTH' ||
              (tradeTypeFilter === 'LONG' && tradeType === 'BUY') ||
              (tradeTypeFilter === 'SHORT' && tradeType === 'SELL');
            
            if (shouldEnter) {
              openPositions.set(pairKey, {
                entry_spread: currentSpread,
                entry_zscore: zScore,
                entry_date: date,
                type: tradeType
              });
              console.log(`[Backtest] ${date} - ABRIR ${tradeType} ${pairKey}: Z = ${zScore.toFixed(2)}`);
            }
          }
        }
      }
    }

    // Calcular P&L diário
    const pnlByDate = {};
    for (const trade of trades) {
      if (!pnlByDate[trade.exit_date]) pnlByDate[trade.exit_date] = 0;
      pnlByDate[trade.exit_date] += trade.pnl;
    }

    const dailyPnL = [];
    let cumulativePnL = 0;
    for (const date of dates) {
      const dailyPnLAmount = pnlByDate[date] || 0;
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

    console.log(`[Backtest] Concluído: ${totalTrades} trades, Win Rate = ${winRate.toFixed(1)}%, P&L = R$ ${totalPnL.toFixed(2)}`);

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
      equity_curve: dailyPnL,
      config: {
        trade_type: tradeTypeFilter,
        risk_per_trade: riskAmount
      }
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
