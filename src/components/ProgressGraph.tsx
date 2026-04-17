import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const data = [
  { name: 'Week 1', bodyFat: 18.5, muscleScore: 65 },
  { name: 'Week 2', bodyFat: 18.2, muscleScore: 66 },
  { name: 'Week 3', bodyFat: 17.8, muscleScore: 68 },
  { name: 'Week 4', bodyFat: 17.5, muscleScore: 70 },
  { name: 'Week 5', bodyFat: 17.2, muscleScore: 72 },
  { name: 'Week 6', bodyFat: 16.8, muscleScore: 75 },
];

export const ProgressGraph: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-900 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity size={18} className="text-brand-500" /> Evolution Curve
          </h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase">
              <div className="w-2 h-2 rounded-full bg-brand-500" /> Muscle
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Fat
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="name" 
                hide 
              />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="muscleScore" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMuscle)" 
              />
              <Area 
                type="monotone" 
                dataKey="bodyFat" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFat)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
            <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-500">
              <TrendingUp size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Muscle Score</div>
              <div className="text-sm font-black text-white">+12%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
              <TrendingDown size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Body Fat</div>
              <div className="text-sm font-black text-white">-2.4%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
