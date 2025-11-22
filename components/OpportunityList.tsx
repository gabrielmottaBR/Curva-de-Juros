import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Opportunity } from '../types';

interface OpportunityListProps {
  opportunities: Opportunity[];
  selectedId: string | null;
  onSelect: (opp: Opportunity) => void;
}

type SortColumn = 'spread' | 'zscore' | 'signal' | null;
type SortDirection = 'asc' | 'desc';

const OpportunityList: React.FC<OpportunityListProps> = ({ opportunities, selectedId, onSelect }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Função de ordenação
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction se clicar na mesma coluna
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nova coluna: default desc
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Ordenar oportunidades
  const sortedOpportunities = useMemo(() => {
    if (!sortColumn) return opportunities;

    return [...opportunities].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'spread':
          comparison = a.currentSpread - b.currentSpread;
          break;
        case 'zscore':
          comparison = Math.abs(a.zScore) - Math.abs(b.zScore);
          break;
        case 'signal':
          // Ordenar por tipo de sinal: BUY > SELL > NEUTRAL
          const signalOrder = { 'BUY SPREAD': 2, 'SELL SPREAD': 1, 'NEUTRAL': 0 };
          comparison = signalOrder[a.recommendation] - signalOrder[b.recommendation];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [opportunities, sortColumn, sortDirection]);

  // Componente de ícone de ordenação
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-emerald-400" />
      : <ArrowDown className="w-3 h-3 text-emerald-400" />;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden mb-8 shadow-lg">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Resultados Obtidos
        </h3>
        <span className="text-xs text-slate-500">{opportunities.length} combinações analisadas</span>
      </div>
      
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Pair (Short x Long)</th>
              <th 
                className="px-4 py-3 font-medium text-right cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('spread')}
              >
                <div className="flex items-center justify-end gap-1">
                  Spread (bps)
                  <SortIcon column="spread" />
                </div>
              </th>
              <th 
                className="px-4 py-3 font-medium text-right cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('zscore')}
              >
                <div className="flex items-center justify-end gap-1">
                  Z-Score
                  <SortIcon column="zscore" />
                </div>
              </th>
              <th 
                className="px-4 py-3 font-medium text-center cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('signal')}
              >
                <div className="flex items-center justify-center gap-1">
                  Sinal
                  <SortIcon column="signal" />
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-right">Processo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-sm">
            {sortedOpportunities.map((opp) => {
              const isSelected = selectedId === opp.id;
              const isBuy = opp.recommendation === 'BUY SPREAD';
              const isSell = opp.recommendation === 'SELL SPREAD';
              const isNeutral = opp.recommendation === 'NEUTRAL';

              return (
                <tr 
                  key={opp.id} 
                  onClick={() => onSelect(opp)}
                  className={`cursor-pointer transition-colors hover:bg-slate-700/50 ${
                    isSelected ? 'bg-cyan-900/20 border-l-2 border-cyan-500' : 'border-l-2 border-transparent'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-200">{opp.shortLabel}</span>
                      <span className="text-slate-500 text-xs">vs</span>
                      <span className="font-mono font-medium text-slate-200">{opp.longLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {opp.currentSpread.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${
                    isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-500'
                  }`}>
                    {opp.zScore.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isBuy && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">COMPRAR SPREAD</span>}
                    {isSell && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">VENDER SPREAD</span>}
                    {isNeutral && <span className="text-slate-600 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                     <button className={`text-xs px-3 py-1.5 rounded transition-all ${
                        isSelected 
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                     }`}>
                        {isSelected ? 'Analisando' : 'Selecionar'}
                     </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OpportunityList;