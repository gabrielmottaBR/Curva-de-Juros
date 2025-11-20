import React from 'react';
import { X } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialContent: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-300">
      <section>
        <h3 className="text-emerald-400 font-bold text-lg mb-2">1. Preço Unitário (PU)</h3>
        <p className="text-sm mb-2">O valor presente do contrato DI1 (valor de face R$ 100.000).</p>
        <code className="block bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs">
          PU = 100000 / (1 + Taxa)^(DU/252)
        </code>
      </section>

      <section>
        <h3 className="text-emerald-400 font-bold text-lg mb-2">2. DV01 (Risco)</h3>
        <p className="text-sm mb-2">Valor financeiro de 01 basis point. Mede quanto dinheiro você perde/ganha se a taxa mover 0.01%.</p>
        <code className="block bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs">
          DV01 = | PU(taxa) - PU(taxa + 0.0001) |
        </code>
      </section>

      <section>
        <h3 className="text-emerald-400 font-bold text-lg mb-2">3. Arbitragem Estatística (Z-Score)</h3>
        <p className="text-sm mb-2">Buscamos reversão à média no spread entre duas curvas. Quando o spread desvia significativamente (Z-Score &gt; 2 ou &lt; -2), apostamos que retornará à média.</p>
        <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-slate-400">
          <li><strong className="text-rose-400">Z &gt; 2 (Caro):</strong> Vender Spread (Vender Longa / Comprar Curta).</li>
          <li><strong className="text-emerald-400">Z &lt; -2 (Barato):</strong> Comprar Spread (Comprar Longa / Vender Curta).</li>
        </ul>
      </section>

      <section>
        <h3 className="text-emerald-400 font-bold text-lg mb-2">4. Neutralização de Risco</h3>
        <p className="text-sm mb-2">Para isolar o spread, devemos estar neutros à direção geral do mercado. Usamos o Hedge Ratio (HR) para equilibrar a sensibilidade (DV01) das duas pontas.</p>
        <code className="block bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs mb-2">
          HR = DV01(Longa) / DV01(Curta)
        </code>
        <p className="text-sm">Se comprarmos 100 contratos na ponta Longa, devemos vender (100 * HR) contratos na ponta Curta.</p>
      </section>
    </div>
  );
};

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">Metodologia de Arbitragem</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6">
          <TutorialContent />
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center sticky bottom-0">
           <button onClick={onClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
             Entendi
           </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;