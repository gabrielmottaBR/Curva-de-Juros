import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign } from 'lucide-react';

interface BacktestMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  pnl_total: number;
  avg_pnl_per_trade: number;
  sharpe_ratio: number;
  max_drawdown: number;
}

interface Trade {
  pair: string;
  entry_date: string;
  exit_date: string;
  entry_spread: number;
  exit_spread: number;
  entry_zscore: number;
  exit_zscore: number;
  type: 'BUY' | 'SELL';
  pnl: number;
  pnl_bps?: number;
}

interface EquityCurvePoint {
  date: string;
  daily_pnl: number;
  cumulative_pnl: number;
}

const BacktestPanel: React.FC = () => {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeType, setTradeType] = useState<'BOTH' | 'LONG' | 'SHORT'>('BOTH');
  const [riskPerTrade, setRiskPerTrade] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(true);
  const [results, setResults] = useState<{
    metrics: BacktestMetrics;
    trades: Trade[];
    equity_curve: EquityCurvePoint[];
    config?: {
      trade_type: string;
      risk_per_trade: number;
    };
  } | null>(null);

  // Carregar datas disponíveis do banco de dados
  useEffect(() => {
    const fetchDateRange = async () => {
      setLoadingDates(true);
      try {
        const response = await fetch('/api/date-range');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.has_data) {
          setStartDate(data.min_date);
          
          // Data final = dia anterior aos dados mais recentes (D-1)
          // IMPORTANTE: Garantir que end_date nunca seja menor que min_date
          const minDate = new Date(data.min_date);
          const maxDate = new Date(data.max_date);
          
          // Se só há 1 dia de dados, usar a mesma data para início e fim
          if (maxDate.getTime() === minDate.getTime()) {
            setEndDate(data.min_date);
            console.log(`[Backtest] Apenas 1 dia de dados: ${data.min_date}`);
          } else {
            // Subtrair 1 dia do max_date
            maxDate.setDate(maxDate.getDate() - 1);
            const dayBefore = maxDate.toISOString().split('T')[0];
            
            // Garantir que dayBefore >= min_date
            if (dayBefore < data.min_date) {
              setEndDate(data.min_date);
            } else {
              setEndDate(dayBefore);
            }
            console.log(`[Backtest] Datas do banco: ${data.min_date} a ${dayBefore}`);
          }
        } else {
          // Fallback se não houver dados
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          setEndDate(yesterday.toISOString().split('T')[0]);
          console.log('[Backtest] Usando datas padrão (sem dados no banco)');
        }
      } catch (error) {
        console.error('[Backtest] Erro ao carregar datas:', error);
        // Fallback em caso de erro
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setEndDate(yesterday.toISOString().split('T')[0]);
      } finally {
        setLoadingDates(false);
      }
    };
    
    fetchDateRange();
  }, []);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        trade_type: tradeType,
        risk_per_trade: riskPerTrade.toString()
      });
      
      const response = await fetch(`/api/backtest?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data);
      } else {
        alert('Erro ao executar backtesting: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao executar backtesting:', error);
      alert('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-cyan-500/10 p-2 rounded-lg">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Backtesting</h2>
      </div>

      {/* Controles de Período */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Data Inicial</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loadingDates}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Data Final</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loadingDates}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Controles de Parametrização */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Tipo de Operação</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTradeType('BOTH')}
              className={`py-2 px-3 rounded-lg font-medium transition-all ${
                tradeType === 'BOTH'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setTradeType('LONG')}
              className={`py-2 px-3 rounded-lg font-medium transition-all ${
                tradeType === 'LONG'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              Compra
            </button>
            <button
              onClick={() => setTradeType('SHORT')}
              className={`py-2 px-3 rounded-lg font-medium transition-all ${
                tradeType === 'SHORT'
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              Venda
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Risco por Operação (R$)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="number"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              min="100"
              max="1000000"
              step="100"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Valor financeiro arriscado em cada trade
          </div>
        </div>
      </div>

      {/* Botão Executar */}
      <div className="mb-6">
        <button
          onClick={runBacktest}
          disabled={loading || loadingDates}
          className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
        >
          {loadingDates ? 'Carregando...' : loading ? 'Processando...' : 'Executar Backtest'}
        </button>
      </div>

      {/* Resultados */}
      {results && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">Total de Trades</div>
              <div className="text-2xl font-bold text-white">{results.metrics.total_trades}</div>
              <div className="text-xs text-slate-400 mt-1">
                <span className="text-emerald-400">{results.metrics.winning_trades} vitórias</span> / 
                <span className="text-rose-400"> {results.metrics.losing_trades} perdas</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">Win Rate</div>
              <div className={`text-2xl font-bold ${results.metrics.win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {results.metrics.win_rate.toFixed(1)}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                {results.metrics.win_rate >= 50 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                )}
                <span className="text-xs text-slate-400">taxa de acerto</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">P&L Total</div>
              <div className={`text-2xl font-bold ${results.metrics.pnl_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {results.metrics.pnl_total >= 0 ? '+' : ''}R$ {results.metrics.pnl_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                R$ {results.metrics.avg_pnl_per_trade.toFixed(2)}/trade
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">Sharpe Ratio</div>
              <div className={`text-2xl font-bold ${results.metrics.sharpe_ratio >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {results.metrics.sharpe_ratio.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Max DD: R$ {results.metrics.max_drawdown.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Gráfico de Equity Curve */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              Curva de P&L Acumulado
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={results.equity_curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: 'P&L (R$)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line 
                  type="monotone" 
                  dataKey="cumulative_pnl" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="P&L Acumulado (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Configuração Usada */}
          {results.config && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-white mb-3">Configuração do Backtest</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Tipo de Operação:</span>
                  <span className="ml-2 text-white font-medium">
                    {results.config.trade_type === 'BOTH' ? 'Ambos' : 
                     results.config.trade_type === 'LONG' ? 'Compra' : 'Venda'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Risco por Trade:</span>
                  <span className="ml-2 text-white font-medium">
                    R$ {results.config.risk_per_trade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Trades */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Trades</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Par</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Entrada</th>
                    <th className="px-4 py-3">Saída</th>
                    <th className="px-4 py-3 text-right">P&L (R$)</th>
                    <th className="px-4 py-3 text-right">Spread (bps)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {results.trades.map((trade, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{trade.pair}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          trade.type === 'BUY' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(trade.entry_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(trade.exit_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${
                        trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}R$ {trade.pnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {trade.pnl_bps !== undefined && trade.pnl_bps !== null 
                          ? `${trade.pnl_bps >= 0 ? '+' : ''}${trade.pnl_bps.toFixed(2)}` 
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Estado Vazio */}
      {!results && !loading && (
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecione um período e clique em "Executar Backtest" para começar</p>
        </div>
      )}
    </div>
  );
};

export default BacktestPanel;
