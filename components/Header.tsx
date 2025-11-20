import React from 'react';
import { TrendingUp, Activity } from 'lucide-react';

interface HeaderProps {
  onOpenEdu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenEdu }) => {
  return (
    <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Curva de Juros
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CONEXÃO B3: Dados de Fechamento de D-1
          </div>
          <button 
            onClick={onOpenEdu}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1"
          >
            <TrendingUp className="w-4 h-4" />
            Tutorial
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;