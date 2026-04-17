import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Zap, Flame, ChevronRight } from 'lucide-react';
import { formatXP, getLevelInfo } from '../lib/utils';

interface MissionCompleteProps {
  xpEarned: number;
  muscleXP: Record<string, number>;
  streak: number;
  isLevelUp: boolean;
  totalXP: number;
  onClose: () => void;
}

export const MissionComplete: React.FC<MissionCompleteProps> = ({ xpEarned, muscleXP, streak, isLevelUp, totalXP, onClose }) => {
  const levelInfo = getLevelInfo(totalXP);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 py-12"
      >
        {isLevelUp && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="bg-brand-500 text-white font-black italic text-4xl py-4 px-8 rounded-2xl shadow-2xl shadow-brand-500/50 uppercase tracking-tighter mb-4"
          >
            Level Up! 🔥
          </motion.div>
        )}

        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-32 h-32 bg-brand-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-brand-500/40"
          >
            <Trophy size={64} className="text-white" />
          </motion.div>
          
          {/* Decorative stars */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="absolute"
              style={{
                top: `${50 + 60 * Math.sin(i * 72 * Math.PI / 180)}%`,
                left: `${50 + 60 * Math.cos(i * 72 * Math.PI / 180)}%`,
              }}
            >
              <Star size={20} className="text-brand-400 fill-brand-400" />
            </motion.div>
          ))}
        </div>

        <div className="space-y-2">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black uppercase italic tracking-tighter"
          >
            Mission Completed
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Level {levelInfo.level} Evolution</span>
            <div className="w-48 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progress}%` }}
                transition={{ delay: 0.6, duration: 1 }}
                className="h-full bg-brand-500"
              />
            </div>
            <span className="text-[10px] font-bold text-zinc-400">{formatXP(totalXP)} / {formatXP(levelInfo.nextThreshold)} XP</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-1"
          >
            <div className="flex items-center justify-center gap-2 text-xp font-bold text-[10px] uppercase">
              <Zap size={14} fill="currentColor" /> Earned
            </div>
            <div className="text-2xl font-black text-white">+{formatXP(xpEarned)}</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-1"
          >
            <div className="flex items-center justify-center gap-2 text-orange-500 font-bold text-[10px] uppercase">
              <Flame size={14} fill="currentColor" /> Streak
            </div>
            <div className="text-2xl font-black text-white">{streak} Days</div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 space-y-4"
        >
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Muscle Growth</h3>
          <div className="space-y-3">
            {Object.entries(muscleXP).slice(0, 3).map(([muscle, xp], i) => (
              <div key={muscle} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-zinc-400">{muscle}</span>
                  <span className="text-brand-400">+{(xp as number).toFixed(0)} XP</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '70%' }}
                    transition={{ delay: 1 + (i * 0.1), duration: 1 }}
                    className="h-full bg-brand-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          onClick={onClose}
          className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform uppercase tracking-tighter italic"
        >
          Continue Evolution <ChevronRight size={20} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
