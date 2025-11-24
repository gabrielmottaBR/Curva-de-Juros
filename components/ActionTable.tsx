import React from 'react';
import { CalculationResult, Allocation, RiskParams } from '../types';
import { ArrowRight, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface ActionTableProps {
  calc: CalculationResult;
  allocation: Allocation;
  shortLabel: string;
  longLabel: string;
  risk: RiskParams;
}

const ActionTable: React.FC<ActionTableProps> = ({ calc, allocation, shortLabel, longLabel, risk }) => {
  const isBuy = calc.recommendation === 'BUY SPREAD';
  const isSell = calc.recommendation === 'SELL SPREAD';
  
  const actionColor = isBuy ? 'text-emerald-400' : (isSell ? 'text-rose-400' : 'text-slate-400');
  const boxColor = isBuy ? 'bg-emerald-500/10 border-emerald-500/30' : (isSell ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800 border-slate-700');

  const recommendationText = isBuy ? 'COMPRAR SPREAD' : (isSell ? 'VENDER SPREAD' : 'NEUTRO');

  return (
    <div className={`rounded-xl border ${boxColor} p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isBuy && <TrendingUp className="w-8 h-8 text-emerald-500" />}
          {isSell && <TrendingDown className="w-8 h-8 text-rose-500" />}
          <div>
             <h2 className="text-lg font-bold text-white">Recomendação do Modelo</h2>
             <div className={`text-2xl font-black tracking-wide ${actionColor}`}>
               {recommendationText}
             </div>
          </div>
        </div>
        <div className="text-right">
           <div className="text-xs text-slate-400 uppercase tracking-wider">Z-Score</div>
           <div className={`text-3xl font-mono font-bold ${
             calc.zScore > 1.5 ? 'text-rose-400' : (calc.zScore < -1.5 ? 'text-emerald-400' : 'text-slate-200')
           }`}>
             {calc.zScore.toFixed(2)}
           </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                <tr>
                    <th className="px-4 py-3 rounded-l-lg">Leg</th>
                    <th className="px-4 py-3">Operação</th>
                    <th className="px-4 py-3 text-right">Quantidade</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Exposição</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
                {/* Short Maturity Row */}
                <tr className="bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{shortLabel}</td>
                    <td className="px-4 py-3">
                       {isBuy ? <span className="text-emerald-400 font-bold">COMPRAR</span> : <span className="text-rose-400 font-bold">VENDER</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-base">{allocation.shortContracts}</td>
                     <td className="px-4 py-3 text-right font-mono text-slate-400">
                        R$ {(allocation.shortContracts * calc.puShort).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                </tr>
                 {/* Long Maturity Row */}
                <tr className="bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{longLabel}</td>
                    <td className="px-4 py-3">
                       {isBuy ? <span className="text-rose-400 font-bold">VENDER</span> : <span className="text-emerald-400 font-bold">COMPRAR</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-base">{allocation.longContracts}</td>
                     <td className="px-4 py-3 text-right font-mono text-slate-400">
                         R$ {(allocation.longContracts * calc.puLong).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                     </td>
                </tr>
            </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
                <div className="text-xs text-slate-400">Risco Financeiro</div>
                <div className="font-mono font-bold text-slate-200">R$ {allocation.estimatedRisk?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</div>
            </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-lg border border-cyan-700/50">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="flex-1">
                <div className="text-xs text-slate-400">Margem Estimada B3</div>
                <div className="font-mono font-bold text-cyan-200">R$ {allocation.estimatedMargin.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                <a 
                  href="https://simulador.b3.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline mt-0.5 inline-block"
                >
                  Verificar no simulador B3
                </a>
            </div>
        </div>
        
        <div className="flex flex-col bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <div className="text-xs text-slate-400">Hedge Ratio</div>
            <div className="font-mono font-bold text-slate-200">{calc.hedgeRatio.toFixed(3)}</div>
        </div>
        
        <div className="flex flex-col bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <div className="text-xs text-slate-400">Cointegração (Proxy p-val)</div>
            <div className={`font-mono font-bold ${calc.cointegrationPValue < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {calc.cointegrationPValue}
            </div>
        </div>
      </div>
      
      <div className="mt-4 bg-slate-800/30 border border-slate-700/50 p-3 rounded-lg">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">⚠️ Aviso:</span> A margem exibida é uma <strong>estimativa</strong> baseada em 5 simulações reais do sistema CORE da B3 (precisão 99.99% para spreads de 1-5 anos). 
          O valor real pode variar conforme volatilidade de mercado, correlação entre contratos e políticas da corretora. 
          <strong className="text-cyan-400"> Sempre consulte o simulador oficial da B3 antes de executar</strong>.
        </p>
      </div>
    </div>
  );
};

export default ActionTable;