import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StatCard from './components/StatCard';
import ConfigurationPanel from './components/ConfigurationPanel';
import Charts from './components/Charts';
import ActionTable from './components/ActionTable';
import TutorialModal, { TutorialContent } from './components/TutorialModal';
import OpportunityList from './components/OpportunityList';
import { CalculationResult, Opportunity, RiskParams } from './types';
import { AVAILABLE_MATURITIES, RISK_DEFAULTS } from './constants';
import { scanOpportunities } from './services/marketData';
import { 
  calculatePU, 
  calculateDV01, 
  calculateMean, 
  calculateStdDev, 
  calculateZScore, 
  checkCointegration,
  calculateAllocation
} from './utils/math';

const App: React.FC = () => {
  // State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [riskParams, setRiskParams] = useState<RiskParams>(RISK_DEFAULTS);
  
  const [isLoadingScanner, setIsLoadingScanner] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Iniciando...");
  
  const [isEduOpen, setIsEduOpen] = useState(false);

  // 1. Run Scanner on Mount
  useEffect(() => {
    const initScanner = async () => {
      setIsLoadingScanner(true);
      
      const handleProgress = (percent: number, status: string) => {
        setLoadingProgress(percent);
        setLoadingStatus(status);
      };

      // Small delay to let UI mount before heavy lifting
      setTimeout(async () => {
         const results = await scanOpportunities(handleProgress);
         setOpportunities(results);
         setIsLoadingScanner(false);
      }, 500);
    };
    initScanner();
  }, []);

  // 2. Calculate Detailed Stats for Selected Opportunity
  const calculationResult: CalculationResult | null = useMemo(() => {
    if (!selectedOpportunity) return null;

    const { historicalData, shortId, longId } = selectedOpportunity;
    const latest = historicalData[historicalData.length - 1];
    const shortConfig = AVAILABLE_MATURITIES.find(m => m.id === shortId)!;
    const longConfig = AVAILABLE_MATURITIES.find(m => m.id === longId)!;

    // Financials
    const puShort = calculatePU(latest.shortRate, shortConfig.defaultDu);
    const puLong = calculatePU(latest.longRate, longConfig.defaultDu);
    const dv01Short = calculateDV01(latest.shortRate, shortConfig.defaultDu);
    const dv01Long = calculateDV01(latest.longRate, longConfig.defaultDu);

    // Statistics (Recalculated here for the dashboard view context, though available in opp summary)
    const spreads = historicalData.map(d => d.spread);
    const meanSpread = calculateMean(spreads);
    const stdDevSpread = calculateStdDev(spreads, meanSpread);
    const zScore = calculateZScore(latest.spread, meanSpread, stdDevSpread);
    
    // Cointegration Check
    const shorts = historicalData.map(d => d.shortRate);
    const longs = historicalData.map(d => d.longRate);
    const cointegrationPValue = checkCointegration(shorts, longs);

    // Recommendation
    let recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL' = 'NEUTRAL';
    if (zScore < -1.5) recommendation = 'BUY SPREAD';
    if (zScore > 1.5) recommendation = 'SELL SPREAD';

    return {
      puShort,
      puLong,
      dv01Short,
      dv01Long,
      currentSpread: latest.spread,
      meanSpread,
      stdDevSpread,
      zScore,
      cointegrationPValue,
      hedgeRatio: dv01Long / dv01Short,
      recommendation
    };
  }, [selectedOpportunity]);

  const allocation = useMemo(() => {
    if (!calculationResult) return null;
    return calculateAllocation(riskParams, calculationResult.dv01Long, calculationResult.dv01Short);
  }, [riskParams, calculationResult]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      <Header onOpenEdu={() => setIsEduOpen(true)} />
      <TutorialModal isOpen={isEduOpen} onClose={() => setIsEduOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Section 1: Scanner & Selection */}
        <div className="mb-8">
           <h2 className="text-xl font-bold text-white mb-4">Scanner de Mercado</h2>
           {isLoadingScanner ? (
             <div className="space-y-8">
               {/* Loading Animation */}
               <div className="w-full h-48 bg-slate-800/50 rounded-xl flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden">
                 <div className="relative z-10 flex flex-col items-center max-w-md w-full px-4">
                   <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   
                   <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                     <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                     ></div>
                   </div>
                   
                   <div className="flex justify-between w-full text-xs font-mono">
                      <span className="text-emerald-400 animate-pulse">{loadingStatus}</span>
                      <span className="text-slate-500">{loadingProgress}%</span>
                   </div>
                 </div>
                 
                 {/* Background subtle animation */}
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               </div>

               {/* Tutorial Content Inline while loading */}
               <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-in fade-in duration-700">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Enquanto aguarda, entenda a metodologia:</h3>
                  <TutorialContent />
               </div>
             </div>
           ) : (
             <OpportunityList 
               opportunities={opportunities} 
               selectedId={selectedOpportunity?.id || null} 
               onSelect={setSelectedOpportunity} 
             />
           )}
        </div>

        {/* Section 2: Detailed Dashboard (Only visible when selected) */}
        {selectedOpportunity && calculationResult && allocation ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">Análise:</span> 
                {selectedOpportunity.shortLabel} x {selectedOpportunity.longLabel}
              </h2>
              <button 
                onClick={() => setSelectedOpportunity(null)} 
                className="text-sm text-slate-500 hover:text-white transition-colors"
              >
                Fechar Análise
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard 
                label="Spread Atual" 
                value={`${calculationResult.currentSpread.toFixed(2)} bps`} 
                subValue={`Média: ${calculationResult.meanSpread.toFixed(2)}`}
                tooltip="Difference between Long and Short rates"
              />
              <StatCard 
                label="Z-Score" 
                value={calculationResult.zScore.toFixed(2)} 
                color={Math.abs(calculationResult.zScore) > 2 ? 'rose' : 'emerald'}
                subValue={Math.abs(calculationResult.zScore) > 2 ? 'High Conviction' : 'Neutro'}
                tooltip="Standard deviations from mean"
              />
              <StatCard 
                label="Hedge Ratio" 
                value={calculationResult.hedgeRatio.toFixed(3)} 
                subValue={`1 Long : ${calculationResult.hedgeRatio.toFixed(1)} Short`}
                color="amber"
                tooltip="Ratio to neutralize DV01"
              />
              <StatCard 
                label="DV01 Long Leg" 
                value={`R$ ${calculationResult.dv01Long.toFixed(2)}`} 
                subValue="Por Contrato"
                tooltip="Value change per 1bp move"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1 h-full">
                <ConfigurationPanel 
                  riskParams={riskParams}
                  setRiskParams={setRiskParams}
                />
              </div>
              <div className="lg:col-span-2 h-full">
                 <Charts 
                    data={selectedOpportunity.historicalData}
                  />
              </div>
            </div>

            <ActionTable 
              calc={calculationResult} 
              allocation={allocation}
              shortLabel={selectedOpportunity.shortLabel}
              longLabel={selectedOpportunity.longLabel}
              risk={riskParams}
            />
          </div>
        ) : (
          !isLoadingScanner && (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-500">Selecione um par da lista acima para visualizar a análise detalhada.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;