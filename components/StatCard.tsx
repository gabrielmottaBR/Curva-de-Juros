import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'emerald' | 'rose' | 'amber';
  tooltip?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, color = 'default', tooltip }) => {
  const colorClasses = {
    default: 'text-slate-100',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400'
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors group relative">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {tooltip && (
           <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 whitespace-nowrap pointer-events-none z-10">
             {tooltip}
           </div>
        )}
      </div>
      <div>
        <div className={`text-2xl font-mono font-semibold ${colorClasses[color]}`}>
          {value}
        </div>
        {subValue && (
          <div className="text-xs text-slate-500 font-mono mt-1">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;