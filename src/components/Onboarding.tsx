import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Gender, BodyGoal, TrainingMode, FitnessLevel } from '../types';
import { ChevronRight, ChevronLeft, Dumbbell, Home, Target, User, Ruler, Weight } from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    gender: 'male',
    age: 25,
    weight: 75,
    height: 175,
    goal: 'muscle_gain',
    mode: 'gym',
    fitnessLevel: 'beginner',
    totalXP: 0,
    level: 1,
    streak: 0,
    onboarded: true
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = () => {
    onComplete(profile as UserProfile);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Welcome to EvolveFit</h2>
              <p className="text-zinc-400 text-sm">Let's start with the basics</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(['male', 'female', 'other'] as Gender[]).map(g => (
                <button
                  key={g}
                  onClick={() => setProfile({ ...profile, gender: g })}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all capitalize",
                    profile.gender === g ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Your Stats</h2>
              <p className="text-zinc-400 text-sm">This helps us calculate your needs</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase flex items-center gap-2">
                  <User size={14} /> Age
                </label>
                <input
                  type="range" min="13" max="100"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                  className="w-full accent-brand-500"
                />
                <div className="text-center text-2xl font-bold">{profile.age} years</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase flex items-center gap-2">
                  <Weight size={14} /> Weight (kg)
                </label>
                <input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: parseInt(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center text-2xl font-bold focus:border-brand-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase flex items-center gap-2">
                  <Ruler size={14} /> Height (cm)
                </label>
                <input
                  type="number"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center text-2xl font-bold focus:border-brand-500 outline-none"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Your Goal</h2>
              <p className="text-zinc-400 text-sm">What do you want to achieve?</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'fat_loss', label: 'Fat Loss', desc: 'Burn fat and get lean' },
                { id: 'muscle_gain', label: 'Muscle Gain', desc: 'Build size and strength' },
                { id: 'maintenance', label: 'Maintenance', desc: 'Stay fit and healthy' },
                { id: 'strength', label: 'Strength', desc: 'Focus on heavy lifting' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setProfile({ ...profile, goal: g.id as BodyGoal })}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between",
                    profile.goal === g.id ? "border-brand-500 bg-brand-500/10" : "border-zinc-800 bg-zinc-900"
                  )}
                >
                  <div>
                    <div className={cn("font-bold", profile.goal === g.id ? "text-brand-400" : "text-zinc-100")}>{g.label}</div>
                    <div className="text-xs text-zinc-500">{g.desc}</div>
                  </div>
                  {profile.goal === g.id && <Target className="text-brand-500" size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Training Mode</h2>
              <p className="text-zinc-400 text-sm">Where will you be working out?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'gym', label: 'Gym', icon: Dumbbell, desc: 'Full equipment' },
                { id: 'home', label: 'Home', icon: Home, desc: 'Bodyweight/Minimal' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setProfile({ ...profile, mode: m.id as TrainingMode })}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4",
                    profile.mode === m.id ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  )}
                >
                  <m.icon size={32} />
                  <div className="text-center">
                    <div className="font-bold">{m.label}</div>
                    <div className="text-[10px] opacity-60">{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Fitness Level</h2>
              <p className="text-zinc-400 text-sm">Be honest, it helps with the plan</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'beginner', label: 'Beginner', desc: 'New to working out' },
                { id: 'intermediate', label: 'Intermediate', desc: '1-2 years experience' },
                { id: 'advanced', label: 'Advanced', desc: '3+ years experience' }
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => setProfile({ ...profile, fitnessLevel: l.id as FitnessLevel })}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left",
                    profile.fitnessLevel === l.id ? "border-brand-500 bg-brand-500/10" : "border-zinc-800 bg-zinc-900"
                  )}
                >
                  <div className={cn("font-bold", profile.fitnessLevel === l.id ? "text-brand-400" : "text-zinc-100")}>{l.label}</div>
                  <div className="text-xs text-zinc-500">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  <Target className="text-brand-500" size={40} />
                </motion.div>
              </div>
              <h2 className="text-3xl font-bold">Ready to Evolve?</h2>
              <p className="text-zinc-400">We've created a custom plan based on your profile. Let's start your journey.</p>
            </div>
            
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Goal</span>
                <span className="font-bold text-brand-400 capitalize">{profile.goal?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Mode</span>
                <span className="font-bold text-brand-400 capitalize">{profile.mode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Level</span>
                <span className="font-bold text-brand-400 capitalize">{profile.fitnessLevel}</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
      <div className="p-6 flex justify-between items-center">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all",
                i === step ? "w-8 bg-brand-500" : i < step ? "w-4 bg-brand-500/40" : "w-4 bg-zinc-800"
              )}
            />
          ))}
        </div>
        <button onClick={handleComplete} className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Skip</button>
      </div>

      <div className="flex-1 px-6 flex flex-col justify-center overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md mx-auto"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-6 safe-bottom flex gap-4">
        {step > 1 && (
          <button
            onClick={prevStep}
            className="flex-1 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} />
            Back
          </button>
        )}
        <button
          onClick={step === 6 ? handleComplete : nextStep}
          className="flex-[2] bg-brand-500 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-transform"
        >
          {step === 6 ? "Start Journey" : "Continue"}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};
