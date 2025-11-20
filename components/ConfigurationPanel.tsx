import React from 'react';
import { RiskParams } from '../types';
import { Settings } from 'lucide-react';

interface ConfigurationPanelProps {
  riskParams: RiskParams;
  setRiskParams: (params: RiskParams) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  riskParams,
  setRiskParams
}) => {
  
  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRiskParams({
      ...riskParams,
      [name]: parseFloat(value) || 0
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4 text-slate-400" />
        Gestão de Risco & Parâmetros
      </h3>
      
      <div className="flex flex-col gap-6 flex-1 justify-center">
        {/* Max Risk Slider */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
          <div className="flex justify-between mb-3">
              <label className="text-xs text-slate-400 font-medium uppercase">Risco Máximo (R$)</label>
              <span className="text-sm text-emerald-400 font-mono font-bold">R$ {riskParams.maxRiskBrl.toLocaleString()}</span>
          </div>
          <input 
            type="range" 
            name="maxRiskBrl"
            min="1000" 
            max="50000" 
            step="1000"
            value={riskParams.maxRiskBrl}
            onChange={handleRiskChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mb-2"
          />
          <p className="text-[10px] text-slate-500">Tolerância máxima de perda para esta posição.</p>
        </div>
        
        {/* Inputs */}
        <div className="space-y-4">
          <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium uppercase">Stop Loss (bps)</label>
              <div className="relative group">
                <input 
                  type="number" 
                  name="stopLossBps"
                  value={riskParams.stopLossBps}
                  onChange={handleRiskChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-200 group-hover:border-slate-600"
                />
                <span className="absolute left-3 top-3 text-xs text-slate-500 font-mono">bps</span>
              </div>
          </div>
           <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium uppercase">Fator de Stress</label>
              <div className="relative group">
                <input 
                  type="number" 
                  name="stressFactor"
                  step="0.1"
                  value={riskParams.stressFactor}
                  onChange={handleRiskChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-200 group-hover:border-slate-600"
                />
                 <span className="absolute left-3 top-3 text-xs text-slate-500 font-mono">x</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;