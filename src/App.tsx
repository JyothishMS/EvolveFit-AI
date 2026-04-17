import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  History as HistoryIcon, 
  Camera, 
  Trophy, 
  Bell, 
  Play, 
  Plus, 
  CheckCircle2, 
  Timer, 
  Flame, 
  ChevronRight,
  ChevronLeft,
  Settings,
  Dumbbell,
  Target,
  Info,
  Home,
  Activity,
  Loader2,
  Shield,
  Star,
  Zap
} from 'lucide-react';
import { UserProfile, WorkoutSession, WorkoutExercise, Exercise } from './types';
import { Onboarding } from './components/Onboarding';
import { BodyMap } from './components/BodyMap';
import { Auth } from './components/Auth';
import { MuscleRankings } from './components/MuscleRankings';
import { Legal } from './components/Legal';
import { MissionComplete } from './components/MissionComplete';
import { ProgressGraph } from './components/ProgressGraph';
import { cn, formatXP, getLevelInfo } from './lib/utils';
import { EXERCISES } from './constants';
import { analyzeBodyPhotos, generateWeeklyPlan } from './services/geminiService';
import { supabase } from './lib/supabase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// --- Components ---

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'today', icon: Calendar, label: 'Today' },
    { id: 'history', icon: HistoryIcon, label: 'History' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'levels', icon: Trophy, label: 'Levels' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 px-6 safe-bottom z-40">
      <div className="flex justify-between items-center h-16">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === tab.id ? "text-brand-500 scale-110" : "text-zinc-500"
            )}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tempMode, setTempMode] = useState<'gym' | 'home' | null>(null);
  const [selectedExternalActivities, setSelectedExternalActivities] = useState<string[]>([]);
  const [showExternalSelection, setShowExternalSelection] = useState(false);

  // Global error suppression for benign environment-related issues
  useEffect(() => {
    const isBenignError = (message: string) => {
      return (
        message.includes('WebSocket') || 
        message.includes('failed to connect to websocket') ||
        message.includes('WebSocket closed without opened') ||
        message.includes('hmr') ||
        message.includes('vite')
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || reason?.toString() || '';
      if (isBenignError(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (isBenignError(event.message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      })
      .catch(err => {
        console.error('Supabase getSession error:', err);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user || !supabase) return;

      const savedProfile = localStorage.getItem(`evolvefit_profile_${user.id}`);
      const savedHistory = localStorage.getItem(`evolvefit_history_${user.id}`);
      const savedActiveWorkout = localStorage.getItem(`evolvefit_active_workout_${user.id}`);
      const savedStartTime = localStorage.getItem(`evolvefit_start_time_${user.id}`);

      let currentProfile: UserProfile | null = null;
      if (savedProfile) {
        currentProfile = JSON.parse(savedProfile);
        setProfile(currentProfile);
      }
      
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedActiveWorkout) {
        setActiveWorkout(JSON.parse(savedActiveWorkout));
        setIsWorkoutActive(true);
      }
      if (savedStartTime) setStartTime(parseInt(savedStartTime));

      // Sync from Supabase
      setIsSyncing(true);
      try {
        const { data: cloudProfile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (cloudProfile && !pError) {
          setProfile(cloudProfile);
        }

        const { data: cloudHistory, error: hError } = await supabase
          .from('workout_history')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
        
        if (cloudHistory && !hError) {
          setHistory(cloudHistory);
        }
      } catch (err: any) {
        console.error('Supabase load error:', err);
        if (err.message?.includes('Failed to fetch')) {
          console.error('Network Error: Supabase could not be reached. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
        }
      } finally {
        setIsSyncing(false);
      }
    };

    loadData();
  }, [user]);

  // Save data
  useEffect(() => {
    const saveData = async () => {
      if (!user || !supabase) return;

      if (profile) {
        localStorage.setItem(`evolvefit_profile_${user.id}`, JSON.stringify(profile));
        
        // Sync to Supabase
        setIsSyncing(true);
        try {
          await supabase.from('profiles').upsert({ ...profile, id: user.id });
          
          if (history.length > 0) {
            const historyWithUserId = history.map(h => ({ ...h, user_id: user.id }));
            await supabase.from('workout_history').upsert(historyWithUserId);
          }
        } catch (err: any) {
          console.error('Supabase sync error:', err);
          if (err.message?.includes('Failed to fetch')) {
            console.error('Network Error: Supabase could not be reached. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
          }
        } finally {
          setIsSyncing(false);
        }
      }
      
      localStorage.setItem(`evolvefit_history_${user.id}`, JSON.stringify(history));
      
      if (isWorkoutActive && activeWorkout) {
        localStorage.setItem(`evolvefit_active_workout_${user.id}`, JSON.stringify(activeWorkout));
      } else {
        localStorage.removeItem(`evolvefit_active_workout_${user.id}`);
      }

      if (startTime) {
        localStorage.setItem(`evolvefit_start_time_${user.id}`, startTime.toString());
      } else {
        localStorage.removeItem(`evolvefit_start_time_${user.id}`);
      }
    };

    saveData();
  }, [profile, history, isWorkoutActive, activeWorkout, startTime, user]);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    if (!user) return;
    const profileWithId = { ...newProfile, id: user.id };
    setProfile(profileWithId);
  };

  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showMissionComplete, setShowMissionComplete] = useState<{ xp: number, muscleXP: Record<string, number>, streak: number, isLevelUp: boolean } | null>(null);

  const calculateWeeklyXP = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return history
      .filter(session => new Date(session.date) >= oneWeekAgo)
      .reduce((acc, session) => acc + session.xpEarned, 0);
  };

  const calculateMuscleXP = () => {
    const muscleXP: Record<string, number> = {
      chest: 0, back: 0, quads: 0, hamstrings: 0, glutes: 0,
      shoulders: 0, triceps: 0, biceps: 0, core: 0, calves: 0, forearms: 0
    };

    history.forEach(session => {
      if (session.exercises.length > 0) {
        session.exercises.forEach(ex => {
          const exerciseXP = (session.xpEarned / session.exercises.length);
          
          // Primary muscles get 100% of exercise XP
          ex.primaryMuscles.forEach(m => {
            if (muscleXP[m] !== undefined) muscleXP[m] += exerciseXP;
          });

          // Secondary muscles get 30% of exercise XP
          ex.secondaryMuscles.forEach(m => {
            if (muscleXP[m] !== undefined) muscleXP[m] += exerciseXP * 0.3;
          });
        });
      } else if (session.muscleGroups && session.muscleGroups.length > 0) {
        // Handle cardio sessions
        const xpPerMuscle = session.xpEarned / session.muscleGroups.length;
        session.muscleGroups.forEach(m => {
          if (muscleXP[m] !== undefined) muscleXP[m] += xpPerMuscle;
        });
      }
    });

    return muscleXP;
  };

  const [isCardioActive, setIsCardioActive] = useState(false);
  const [cardioStats, setCardioStats] = useState({ distance: 0, pace: '0:00', speed: 0, calories: 0 });

  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [initialRestTime, setInitialRestTime] = useState(60);

  // Rest Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => (prev !== null && prev > 0) ? prev - 1 : null);
      }, 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  useEffect(() => {
    let interval: any;
    if (isCardioActive) {
      interval = setInterval(() => {
        setCardioStats(prev => ({
          distance: prev.distance + 0.01,
          pace: '5:15', // Simulated
          speed: 11.4, // Simulated
          calories: Math.round((prev.distance + 0.01) * 60)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCardioActive]);

  const startWorkout = () => {
    if (!profile || !profile.weeklyPlan) return;
    
    const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    const todayPlan = profile.weeklyPlan.days.find(d => d.day === todayName);

    if (todayPlan?.activityType === 'cardio') {
      setSelectedActivity(todayPlan.name);
      setIsCardioActive(true);
      return;
    }

    // Fully AI-driven exercise selection
    let filteredExercises = EXERCISES.filter(ex => ex.mode.includes(profile.mode));
    
    // If we have analysis, prioritize weak points
    if (profile.bodyAnalysis?.weakPoints?.length) {
      const weakPoints = profile.bodyAnalysis.weakPoints.map(p => p.toLowerCase());
      filteredExercises.sort((a, b) => {
        const aIsWeak = a.primaryMuscles.some(m => weakPoints.includes(m.toLowerCase()));
        const bIsWeak = b.primaryMuscles.some(m => weakPoints.includes(m.toLowerCase()));
        if (aIsWeak && !bIsWeak) return -1;
        if (!aIsWeak && bIsWeak) return 1;
        return 0;
      });
    }

    const getTargetReps = () => {
      switch(profile.level) {
        case 'beginner': return 12;
        case 'intermediate': return 10;
        case 'advanced': return 8;
        default: return 10;
      }
    };

    const workoutExercises: WorkoutExercise[] = filteredExercises.slice(0, 5).map(ex => ({
      ...ex,
      sets: [
        { weight: profile.mode === 'gym' ? 20 : 0, reps: getTargetReps(), completed: false },
        { weight: profile.mode === 'gym' ? 20 : 0, reps: getTargetReps(), completed: false },
        { weight: profile.mode === 'gym' ? 20 : 0, reps: getTargetReps(), completed: false }
      ]
    }));

    const targetMuscles = Array.from(new Set(workoutExercises.flatMap(ex => ex.primaryMuscles)));
    const sessionName = todayPlan?.name || `AI ${targetMuscles[0]} Focus`;

    const newSession: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name: sessionName,
      exercises: workoutExercises,
      duration: 0,
      totalVolume: 0,
      xpEarned: 0,
      muscleGroups: targetMuscles
    };

    setActiveWorkout(newSession);
    setIsWorkoutActive(true);
    setStartTime(Date.now());
    setShowConfig(false);
  };

  const finishCardio = () => {
    if (!profile) return;
    const xp = 50; // Fixed XP for cardio/light workout
    const durationCount = startTime ? Math.round((Date.now() - startTime) / 60000) : 30;
    
    // Streak logic
    const todayStr = new Date().toDateString();
    const lastWorkoutDay = profile.lastWorkoutDate ? new Date(profile.lastWorkoutDate).toDateString() : null;
    const newStreakCount = lastWorkoutDay === todayStr ? profile.streak : profile.streak + 1;
    const finalXPVal = xp + (newStreakCount > profile.streak ? 20 : 0); // Streak bonus

    const currentTotalXP = Number(profile.totalXP) || 0;
    const oldLvl = getLevelInfo(currentTotalXP).level;
    const newLvl = getLevelInfo(currentTotalXP + finalXPVal).level;

    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name: selectedActivity || 'Cardio',
      exercises: [],
      duration: durationCount,
      totalVolume: 0,
      xpEarned: finalXPVal, // Include streak bonus
      muscleGroups: ['legs', 'core']
    };

    setHistory([session, ...history]);
    setProfile({ 
      ...profile, 
      totalXP: currentTotalXP + finalXPVal, 
      level: newLvl,
      streak: newStreakCount,
      lastWorkoutDate: new Date().toISOString()
    });
    setIsCardioActive(false);
    setStartTime(null);
    setCardioStats({ distance: 0, pace: '0:00', speed: 0, calories: 0 });
    
    // Show Mission Complete
    setShowMissionComplete({
      xp: finalXPVal,
      muscleXP: { legs: finalXPVal * 0.7, core: finalXPVal * 0.3 },
      streak: newStreakCount,
      isLevelUp: newLvl > oldLvl
    });
  };

  const finishWorkout = () => {
    if (!activeWorkout || !profile) return;

    // Fixed XP for workout
    const xp = 100;
    const volume = activeWorkout.exercises.reduce((acc, ex) => {
      return acc + ex.sets.reduce((sAcc, set) => sAcc + (set.completed ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0);
    }, 0);

    const duration = startTime ? Math.round((Date.now() - startTime) / 60000) : 45;

    // Streak logic
    const today = new Date().toDateString();
    const lastWorkoutDay = profile.lastWorkoutDate ? new Date(profile.lastWorkoutDate).toDateString() : null;
    const newStreak = lastWorkoutDay === today ? profile.streak : profile.streak + 1;
    const finalXP = xp + (newStreak > profile.streak ? 20 : 0); // Streak bonus

    const currentXPToDate = Number(profile.totalXP) || 0;
    const lvlOld = getLevelInfo(currentXPToDate).level;
    const lvlNew = getLevelInfo(currentXPToDate + finalXP).level;

    const completedSession = {
      ...activeWorkout,
      duration: duration,
      totalVolume: volume,
      xpEarned: finalXP // Include streak bonus
    };

    setHistory([completedSession, ...history]);
    setProfile({
      ...profile,
      totalXP: currentXPToDate + finalXP,
      level: lvlNew,
      streak: newStreak,
      lastWorkoutDate: new Date().toISOString()
    });
    setIsWorkoutActive(false);
    setActiveWorkout(null);
    setStartTime(null);

    // Calculate muscle XP for the mission complete screen
    const muscleXP: Record<string, number> = {};
    completedSession.exercises.forEach(ex => {
      const exXP = finalXP / completedSession.exercises.length;
      ex.primaryMuscles.forEach(m => {
        muscleXP[m] = (muscleXP[m] || 0) + exXP;
      });
    });

    setShowMissionComplete({
      xp: finalXP,
      muscleXP: muscleXP,
      streak: newStreak,
      isLevelUp: lvlNew > lvlOld
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !profile) return;
    
    setIsAnalyzing(true);
    try {
      const files = Array.from(e.target.files);
      const imageData = await Promise.all(files.map((file: File) => {
        return new Promise<{ data: string, mimeType: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ data: base64, mimeType: file.type });
          };
          reader.readAsDataURL(file);
        });
      }));

      const analysis = await analyzeBodyPhotos(imageData);
      setProfile({
        ...profile,
        bodyAnalysis: analysis,
        weeklyPlan: undefined // Clear old plan to force re-selection
      });
      setShowExternalSelection(false);
      setTempMode(null);
      setSelectedExternalActivities([]);
      setActiveTab('today');
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleModeSelection = (mode: 'gym' | 'home') => {
    setTempMode(mode);
    setShowExternalSelection(true);
  };

  const handleExternalSelection = async () => {
    if (!profile || !tempMode) return;
    setIsGeneratingPlan(true);
    try {
      const updatedProfile = { 
        ...profile, 
        mode: tempMode,
        externalActivities: selectedExternalActivities 
      };
      const plan = await generateWeeklyPlan(updatedProfile);
      setProfile({
        ...updatedProfile,
        weeklyPlan: plan
      });
      setShowExternalSelection(false);
      setTempMode(null);
    } catch (error) {
      console.error("Plan generation failed:", error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="text-brand-500 animate-spin" size={40} />
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
          <Info size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Configuration Required</h1>
        <p className="text-zinc-400 max-w-xs mb-8">
          Please set your Supabase URL and API Key in the <span className="text-white font-mono">Settings &gt; Secrets</span> menu to continue.
        </p>
        <div className="space-y-4 w-full max-w-xs">
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-left">
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Required Variables:</p>
            <code className="text-xs text-brand-500 block">VITE_SUPABASE_URL</code>
            <code className="text-xs text-brand-500 block">VITE_SUPABASE_ANON_KEY</code>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthComplete={async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    }} />;
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (showLegal) {
    return <Legal onBack={() => setShowLegal(false)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      <AnimatePresence>
        {showMissionComplete && (
          <MissionComplete 
            xpEarned={showMissionComplete.xp}
            muscleXP={showMissionComplete.muscleXP}
            streak={showMissionComplete.streak}
            isLevelUp={showMissionComplete.isLevelUp}
            totalXP={profile.totalXP}
            onClose={() => {
              setShowMissionComplete(null);
              setActiveTab('history');
            }}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="p-6 flex justify-between items-center safe-top">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-brand-500/20">
            L{getLevelInfo(profile.totalXP).level}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">EvolveFit AI</h1>
            <div className="w-32 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${getLevelInfo(profile.totalXP).progress}%` }}
                className="h-full bg-brand-500"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 rounded-full border border-zinc-800"
            >
              <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Syncing</span>
            </motion.div>
          )}
          <button 
            onClick={() => setShowLegal(true)}
            className="p-2 bg-zinc-900 rounded-full border border-zinc-800"
          >
            <Shield size={20} className="text-zinc-400" />
          </button>
          <button 
            onClick={() => supabase?.auth.signOut()}
            className="p-2 bg-zinc-900 rounded-full border border-zinc-800"
          >
            <Settings size={20} className="text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!profile.bodyAnalysis ? (
                <div className="space-y-6">
                  <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 p-8 border border-zinc-800">
                    <div className="relative z-10 space-y-6 text-center">
                      <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto text-brand-500">
                        <Camera size={40} />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold leading-tight">
                          Unlock Your AI Plan
                        </h2>
                        <p className="text-sm text-zinc-500">Our AI needs to analyze your physique to tell you exactly what to build.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('camera')}
                        className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-transform"
                      >
                        Scan Body Now
                      </button>
                    </div>
                  </div>
                </div>
              ) : !profile.weeklyPlan ? (
                <div className="space-y-6">
                  <div className="bg-zinc-900 rounded-[2.5rem] p-8 border border-zinc-800 space-y-8">
                    {!showExternalSelection ? (
                      <>
                        <div className="text-center space-y-2">
                          <h2 className="text-3xl font-bold">Where will you train?</h2>
                          <p className="text-zinc-500 text-sm">We'll build your AI timetable based on your location.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => handleModeSelection('gym')}
                            className="p-8 rounded-3xl bg-zinc-800 border border-zinc-700 flex flex-col items-center gap-4 active:scale-95 transition-all"
                          >
                            <Dumbbell size={32} className="text-brand-400" />
                            <div className="font-bold">Gym</div>
                          </button>
                          <button
                            onClick={() => handleModeSelection('home')}
                            className="p-8 rounded-3xl bg-zinc-800 border border-zinc-700 flex flex-col items-center gap-4 active:scale-95 transition-all"
                          >
                            <Home size={32} className="text-brand-400" />
                            <div className="font-bold">Home</div>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center space-y-2">
                          <h2 className="text-3xl font-bold">External Activities</h2>
                          <p className="text-zinc-500 text-sm">Select the activities you do outside the gym.</p>
                        </div>
                        
                        {isGeneratingPlan ? (
                          <div className="py-12 flex flex-col items-center gap-6">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"
                            />
                            <p className="text-zinc-400 font-medium animate-pulse">Generating AI Timetable...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-2">
                              {['Running 🏃', 'Cycling 🚴', 'Walking 🚶', 'Swimming 🏊', 'Yoga 🧘', 'Sports ⚽'].map(act => (
                                <button
                                  key={act}
                                  onClick={() => {
                                    if (selectedExternalActivities.includes(act)) {
                                      setSelectedExternalActivities(prev => prev.filter(a => a !== act));
                                    } else {
                                      setSelectedExternalActivities(prev => [...prev, act]);
                                    }
                                  }}
                                  className={cn(
                                    "p-4 rounded-2xl border text-xs font-bold transition-all",
                                    selectedExternalActivities.includes(act) 
                                      ? "border-brand-500 bg-brand-500/10 text-brand-400" 
                                      : "border-zinc-800 bg-zinc-900/50 text-zinc-500"
                                  )}
                                >
                                  {act}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={handleExternalSelection}
                              disabled={selectedExternalActivities.length === 0}
                              className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 disabled:opacity-50"
                            >
                              Finalize Timetable
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-8">
                  {/* AI Mission Timetable */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Star size={18} className="text-brand-500" /> AI Missions
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
                      {profile.weeklyPlan.days.map((day, i) => {
                        const isToday = day.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
                        return (
                          <div
                            key={i}
                            className={cn(
                              "min-w-[160px] p-5 rounded-[2rem] border transition-all shrink-0",
                              isToday ? "bg-brand-500/10 border-brand-500 ring-4 ring-brand-500/10" : "bg-zinc-900 border-zinc-800"
                            )}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{day.day}</div>
                            <div className={cn("font-bold text-sm line-clamp-1", isToday ? "text-brand-400" : "text-zinc-100")}>
                              {day.isRestDay ? 'Rest Day' : `Mission: ${day.name.split(' ')[0]}`}
                            </div>
                            {!day.isRestDay && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-xp mt-2 uppercase tracking-tighter">
                                <Zap size={10} fill="currentColor" /> +120 XP Reward
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Today's Card */}
                  <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-brand-900 p-8 text-white shadow-2xl shadow-brand-500/20">
                    <div className="relative z-10 space-y-4">
                      <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Active Mission
                      </div>
                      
                      <h2 className="text-3xl font-black italic tracking-tighter leading-tight uppercase">
                        Build {profile.bodyAnalysis?.weakPoints?.[0] || 'Physique'} Power 💥
                      </h2>
                      <p className="text-sm opacity-90 leading-relaxed font-medium">
                        Focus: <span className="underline decoration-white/40">{profile.bodyAnalysis?.weakPoints?.[0] || 'Overall'} Weak Point</span>. 
                        Complete this mission to evolve your physique.
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-white/80 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          <Zap size={14} fill="currentColor" className="text-xp" />
                          +120 XP
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-white/80 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          <Flame size={14} fill="currentColor" className="text-orange-400" />
                          {profile.streak} Day Streak
                        </div>
                      </div>

                      <button
                        onClick={startWorkout}
                        className="w-full bg-white text-brand-600 font-black py-5 rounded-2xl flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform uppercase tracking-tighter italic"
                      >
                        Accept Mission <ChevronRight size={20} />
                      </button>
                    </div>
                    {/* Abstract background shape */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  </div>

                  {/* Progress Graph */}
                  <ProgressGraph />

                  {/* Muscle Focus */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Target size={18} className="text-brand-500" /> AI Target Map
                    </h3>
                    <div className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 flex items-center justify-between">
                      <div className="space-y-3">
                        {profile.bodyAnalysis?.weakPoints?.map(m => (
                          <div key={m} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-medium capitalize">{m}</span>
                          </div>
                        )) || (
                          <div className="text-xs text-zinc-500 italic">Scan your body to see target areas</div>
                        )}
                      </div>
                      <BodyMap activeMuscles={profile.bodyAnalysis?.weakPoints || []} size={100} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-900 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Weekly XP</span>
                  <div className="text-2xl font-bold text-xp">+{formatXP(calculateWeeklyXP())}</div>
                </div>
                <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-900 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Workouts</span>
                  <div className="text-2xl font-bold">{history.length}</div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Evolution History</h2>
                <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full text-xs font-bold">
                  <Flame size={14} fill="currentColor" /> {profile.streak} Day Streak
                </div>
              </div>

              <ProgressGraph />

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Missions</h3>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                    <p className="text-sm">Your journey hasn't started yet.</p>
                    <p className="text-[10px] uppercase font-bold mt-1">First session = First evolution</p>
                  </div>
                ) : (
                  history.map(session => (
                    <div key={session.id} className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm">{session.name}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                          {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xp font-black">+{formatXP(session.xpEarned)} XP</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{session.duration}m duration</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">AI Body Analysis</h2>
              
              {!profile.bodyAnalysis && !isAnalyzing ? (
                <div className="space-y-6">
                  {/* Pose Guide */}
                  <div className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-2 text-brand-500 mb-2">
                      <Info size={18} />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Pose Guide</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Front', view: 'front' as const, desc: 'Arms slightly out' },
                        { label: 'Side', view: 'side' as const, desc: 'Profile view' },
                        { label: 'Back', view: 'back' as const, desc: 'Back to camera' }
                      ].map(pose => (
                        <div key={pose.label} className="space-y-2">
                          <div className="aspect-[2/3] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center p-2">
                            <BodyMap view={pose.view} size={80} />
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-bold text-white uppercase">{pose.label}</div>
                            <div className="text-[8px] text-zinc-500 leading-tight">{pose.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="aspect-[3/4] bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500">
                    <Camera size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Scan Your Progress</h3>
                    <p className="text-sm text-zinc-500">Upload front, side, and back photos for AI body composition analysis.</p>
                  </div>
                  <label className="bg-brand-500 text-white font-bold px-8 py-4 rounded-2xl active:scale-95 transition-transform cursor-pointer">
                    Upload Photos
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>
            ) : isAnalyzing ? (
                <div className="aspect-[3/4] bg-zinc-900 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full"
                  />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Analyzing Body...</h3>
                    <p className="text-sm text-zinc-500 italic">"Our AI is scanning muscle definition and posture..."</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-lg">Analysis Result</h3>
                      <button 
                        onClick={() => setProfile({ ...profile, bodyAnalysis: undefined, weeklyPlan: undefined })}
                        className="text-xs text-zinc-500 uppercase font-bold"
                      >
                        Retake
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Body Fat</span>
                        <div className="text-xl font-bold text-brand-400">{profile.bodyAnalysis?.bodyFatPercentage}%</div>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Posture</span>
                        <div className="text-xl font-bold text-brand-400">{profile.bodyAnalysis?.postureScore}/100</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">AI Recommendations</h4>
                      <ul className="space-y-2">
                        {profile.bodyAnalysis?.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm flex gap-3 text-zinc-300">
                            <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Focus Areas</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.bodyAnalysis?.weakPoints.map(p => (
                            <span key={p} className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-lg uppercase">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Strong Points</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.bodyAnalysis?.strongPoints.map(p => (
                            <span key={p} className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-lg uppercase">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-900 space-y-4">
                <h4 className="font-bold flex items-center gap-2"><Info size={16} className="text-brand-500" /> Privacy Note</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Your photos are processed securely using Gemini AI. We prioritize your privacy and use these images only for your personal fitness analysis.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'levels' && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <MuscleRankings 
                muscleXP={calculateMuscleXP()} 
                totalXP={profile.totalXP} 
                level={getLevelInfo(profile.totalXP).level} 
              />
            </motion.div>
          )}

          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Notifications</h2>
              <div className="space-y-3">
                {[
                  { title: 'New Rank Unlocked!', desc: 'You reached Iron Rookie rank. Keep it up!', time: '2h ago', icon: Trophy, color: 'text-blue-400' },
                  { title: 'Streak Milestone', desc: '7-day streak achieved! +100 bonus XP', time: '5h ago', icon: Flame, color: 'text-orange-500' },
                  { title: 'Workout Reminder', desc: 'Time for your daily session. Ready to evolve?', time: '1d ago', icon: Calendar, color: 'text-brand-500' },
                ].map((alert, i) => (
                  <div key={i} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-900 flex gap-4 items-start">
                    <div className={cn("p-2 bg-zinc-800 rounded-xl", alert.color)}>
                      <alert.icon size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm">{alert.title}</h4>
                        <span className="text-[10px] text-zinc-500">{alert.time}</span>
                      </div>
                      <p className="text-xs text-zinc-400">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Workout Tracker Overlay */}
      <AnimatePresence>
        {isWorkoutActive && activeWorkout && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-zinc-950 z-50 flex flex-col"
          >
            <header className="p-6 flex justify-between items-center safe-top border-b border-zinc-900">
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this workout? Progress will not be saved.')) {
                    setIsWorkoutActive(false);
                    setActiveWorkout(null);
                    setStartTime(null);
                  }
                }}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3 flex-1 justify-center">
                <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500">
                  <Timer size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Active Session</h3>
                  <p className="text-xs text-zinc-500">00:45:12</p>
                </div>
              </div>
              <button 
                onClick={finishWorkout}
                className="bg-brand-500 text-white px-6 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform"
              >
                Finish
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Smart Rest Timer Overlay */}
              <AnimatePresence>
                {restTimer !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed bottom-24 left-6 right-6 bg-brand-500 rounded-3xl p-6 shadow-2xl shadow-brand-500/40 z-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="24" cy="24" r="20"
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="4"
                          />
                          <motion.circle
                            cx="24" cy="24" r="20"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeDasharray="126"
                            animate={{ strokeDashoffset: 126 - (126 * (restTimer / initialRestTime)) }}
                            transition={{ duration: 1, ease: "linear" }}
                          />
                        </svg>
                        <span className="absolute text-xs font-black text-white">{restTimer}s</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Smart Rest</h4>
                        <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest">Recovering Muscles</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setRestTimer(null)}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      SKIP
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Insight Bubble */}
              <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-2xl flex gap-3 items-start">
                <div className="p-2 bg-brand-500/20 rounded-lg text-brand-500">
                  <Info size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-brand-400">AI Insight</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    "I've selected these exercises specifically to build your <span className="text-zinc-100 font-bold">{profile.bodyAnalysis?.weakPoints?.[0] || 'strength'}</span> and improve your overall posture score of <span className="text-zinc-100 font-bold">{profile.bodyAnalysis?.postureScore || 85}</span>."
                  </p>
                </div>
              </div>

              {activeWorkout.exercises.map((ex, exIdx) => (
                <div key={ex.id} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h4 className="text-xl font-bold">{ex.name}</h4>
                      <div className="flex gap-2 mt-1">
                        {ex.primaryMuscles.map(m => (
                          <span key={m} className="text-[10px] uppercase font-bold text-brand-400">{m}</span>
                        ))}
                      </div>
                    </div>
                    <BodyMap activeMuscles={ex.primaryMuscles} secondaryMuscles={ex.secondaryMuscles} size={60} />
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-zinc-500 uppercase px-2">
                      <span>Set</span>
                      <span className="text-center">Target</span>
                      <span className="text-right">Action</span>
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className={cn(
                        "grid grid-cols-3 gap-2 items-center p-4 rounded-2xl border transition-all",
                        set.completed ? "bg-brand-500/10 border-brand-500/30" : "bg-zinc-900 border-zinc-800"
                      )}>
                        <span className="text-sm font-bold text-zinc-500">SET {setIdx + 1}</span>
                        
                        <div className="text-center">
                          <div className="text-lg font-black text-white">{set.reps}</div>
                          <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Reps</div>
                        </div>

                        <button 
                          onClick={() => {
                            const newExercises = [...activeWorkout.exercises];
                            const isCompleting = !newExercises[exIdx].sets[setIdx].completed;
                            newExercises[exIdx].sets[setIdx].completed = isCompleting;
                            setActiveWorkout({ ...activeWorkout, exercises: newExercises });

                            // Smart Rest Timer Logic
                            if (isCompleting) {
                              // Base rest is 60s
                              // If it's an advanced user, they might need more rest for heavy sets
                              // If reps are high (12+), it's endurance -> 45s rest
                              // If reps are low (8-), it's strength -> 90s rest
                              let restTime = 60;
                              const reps = newExercises[exIdx].sets[setIdx].reps;
                              
                              if (reps >= 12) restTime = 45;
                              else if (reps <= 8) restTime = 90;

                              // Adjust based on difficulty (simulated: if it's the 3rd set, add 15s)
                              if (setIdx === 2) restTime += 15;

                              setInitialRestTime(restTime);
                              setRestTimer(restTime);
                            } else {
                              setRestTimer(null);
                            }
                          }}
                          className={cn(
                            "ml-auto px-4 py-2 rounded-xl font-bold text-xs transition-all",
                            set.completed ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"
                          )}
                        >
                          {set.completed ? 'DONE' : 'COMPLETE'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cardio Tracker Overlay */}
      <AnimatePresence>
        {isCardioActive && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 bg-zinc-950 z-50 flex flex-col"
          >
            <header className="p-6 flex justify-between items-center safe-top border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-bold">{selectedActivity}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Live Session</p>
                </div>
              </div>
              <button 
                onClick={finishCardio}
                className="bg-red-500/10 text-red-500 px-6 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform"
              >
                Finish
              </button>
            </header>
            
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              {/* Visual Track */}
              <div className="aspect-square bg-zinc-900 rounded-[2.5rem] border border-zinc-800 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    <motion.path
                      d="M 10 50 Q 25 10 50 50 T 90 50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-brand-500"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 10, repeat: Infinity }}
                    />
                  </svg>
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <div className="text-7xl font-black tracking-tighter text-brand-500 leading-none">{cardioStats.distance.toFixed(2)}</div>
                  <div className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Kilometers</div>
                </div>
                {/* Animated dots for "track" effect */}
                <div className="absolute inset-0">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-brand-500 rounded-full blur-sm"
                      animate={{
                        x: [10, 90],
                        y: [50, 40, 60, 50],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 3,
                        delay: i * 0.6,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Pace</span>
                  <div className="text-2xl font-bold">{cardioStats.pace}</div>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Calories</span>
                  <div className="text-2xl font-bold">{cardioStats.calories}</div>
                </div>
              </div>

              <div className="bg-brand-500/10 border border-brand-500/20 p-6 rounded-3xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-brand-400 uppercase font-bold tracking-widest">XP Gained</div>
                  <div className="text-3xl font-black text-xp">+{Math.round(cardioStats.distance * 50)}</div>
                </div>
                <Trophy size={40} className="text-xp opacity-20" />
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 flex justify-center">
                <BodyMap activeMuscles={['legs', 'core']} size={150} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
