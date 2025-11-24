import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoricalData } from '../types';

interface ChartsProps {
  data: HistoricalData[];
}

const Charts: React.FC<ChartsProps> = ({ data }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 h-full min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Histórico do Spread</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
            <span className="text-slate-400">Spread</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpread" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
                dataKey="date" 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                tickFormatter={(val) => val.substring(5)} // MM-DD
                stroke="#475569"
                tickMargin={10}
            />
            <YAxis 
                domain={['dataMin', 'dataMax']} 
                padding={{ top: 20, bottom: 20 }}
                tick={{fill: '#94a3b8', fontSize: 10}}
                stroke="#475569"
                tickFormatter={(value) => value.toFixed(1)}
                width={50}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '0.5rem' }}
                itemStyle={{ color: '#f1f5f9', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '12px' }}
                formatter={(value: number) => [value.toFixed(2), 'bps']}
            />
            
            {/* Spread Area */}
            <Area 
              type="monotone" 
              dataKey="spread" 
              name="Spread" 
              stroke="#06b6d4" 
              fillOpacity={1} 
              fill="url(#colorSpread)" 
              strokeWidth={2} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts;