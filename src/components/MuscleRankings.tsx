import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { BodyMap } from './BodyMap';
import { cn } from '../lib/utils';

interface MuscleRankingsProps {
  muscleXP: Record<string, number>;
  totalXP: number;
  level: number;
  history?: any[];
}

export const MuscleRankings: React.FC<MuscleRankingsProps> = ({ muscleXP, totalXP, level, history = [] }) => {
  const [view, setView] = useState<'front' | 'back'>('front');

  const getIntensity = (xp: number) => {
    if (xp > 5000) return '#ef4444'; // Red
    if (xp > 2000) return '#f97316'; // Orange
    if (xp > 1000) return '#eab308'; // Yellow
    if (xp > 500) return '#22c55e'; // Green
    return '#3f3f46'; // Zinc
  };

  const muscleStats = Object.keys(muscleXP).reduce((acc, muscle) => {
    acc[muscle] = { rank: '', color: getIntensity(muscleXP[muscle]) };
    return acc;
  }, {} as Record<string, { rank: string, color: string }>);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <button 
            onClick={() => setView(v => v === 'front' ? 'back' : 'front')}
            className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            {view === 'front' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <h2 className="text-xl font-black uppercase italic tracking-tighter text-center mb-8">Physique Evolution</h2>

        <div className="flex justify-center mb-8">
          <BodyMap muscleStats={muscleStats} view={view} size={280} />
        </div>

        {/* Overall Level */}
        <div className="flex flex-col items-center pt-6 border-t border-zinc-800/50">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-brand-500/20">
            <span className="text-2xl font-black text-white italic">L{level}</span>
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Level {level}</h3>
          <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest">{totalXP.toLocaleString()} Total XP</p>
        </div>
      </div>

      {/* Muscle List */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Muscle Mastery</h3>
        {(Object.entries(muscleXP) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([muscle, xp]) => {
          return (
            <div key={muscle} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: getIntensity(xp) }} />
                <div>
                  <h4 className="text-sm font-bold capitalize">{muscle}</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Evolution Progress</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-white">{xp.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-500 font-bold block">XP</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Exercise XP Breakdown */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Exercise XP Tracker</h3>
        {history.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-sm">No workouts completed yet</p>
            <p className="text-[10px] uppercase font-bold mt-1">Start a workout to earn XP</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.flatMap((session: any) => 
              session.exercises.map((ex: any, idx: number) => {
                const exerciseXP = session.xpEarned / session.exercises.length;
                return (
                  <div key={`${session.id}-${idx}`} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-3 flex items-center justify-between hover:border-brand-500/30 transition-colors">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-1 h-6 rounded-full bg-brand-500" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{ex.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <span className="text-xs font-black text-green-400">+{Math.round(exerciseXP)}</span>
                      <span className="text-[10px] text-zinc-500 font-bold block">XP</span>
                    </div>
                  </div>
                );
              })
            ).reverse()}
          </div>
        )}
      </div>
    </div>
  );
};
