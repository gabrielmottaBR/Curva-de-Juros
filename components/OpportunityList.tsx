import React from 'react';
import { Opportunity } from '../types';

interface OpportunityListProps {
  opportunities: Opportunity[];
  selectedId: string | null;
  onSelect: (opp: Opportunity) => void;
}

const OpportunityList: React.FC<OpportunityListProps> = ({ opportunities, selectedId, onSelect }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden mb-8 shadow-lg">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Resultados Obtidos
        </h3>
        <span className="text-xs text-slate-500">{opportunities.length} combinations analyzed</span>
      </div>
      
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Pair (Short x Long)</th>
              <th className="px-4 py-3 font-medium text-right">Spread (bps)</th>
              <th className="px-4 py-3 font-medium text-right">Z-Score</th>
              <th className="px-4 py-3 font-medium text-center">Sinal</th>
              <th className="px-4 py-3 font-medium text-right">Processo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-sm">
            {opportunities.map((opp) => {
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