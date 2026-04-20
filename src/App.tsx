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
  Zap,
  Moon,
  Sun
} from 'lucide-react';
import { UserProfile, WorkoutSession, WorkoutExercise, Exercise } from './types';
import { Onboarding } from './components/Onboarding';
import { BodyMap } from './components/BodyMap';
import { Auth } from './components/Auth';
import { MuscleRankings } from './components/MuscleRankings';
import { Legal } from './components/Legal';
import { MissionComplete } from './components/MissionComplete';
import { ProgressGraph } from './components/ProgressGraph';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { cn, formatXP, getLevelInfo } from './lib/utils';
import { toSnakeCase, toCamelCase } from './lib/caseConverter';
import { EXERCISES } from './constants';
import { getExerciseVariation } from './utils/exerciseRotation';
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
    { id: 'settings', icon: Settings, label: 'Settings' },
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

// --- Main App Component ---

function AppContent() {
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
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
  
  // New features states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'coach'; text: string }>>([
    { role: 'coach', text: "Hey! 💪 I'm your AI Coach. Need help? Ask me anything - energy levels, pain concerns, or workout adjustments!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showSmartAdjustment, setShowSmartAdjustment] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [hasPain, setHasPain] = useState(false);
  const [painLocation, setPainLocation] = useState('');
  const [repCount, setRepCount] = useState(0);
  const [isRepCounterActive, setIsRepCounterActive] = useState(false);
  const [showSmartAdjustmentAtStart, setShowSmartAdjustmentAtStart] = useState(true);
  const [aiCoachingMessages] = useState([
    "You're crushing it! 💪",
    "Great form! Keep it up!",
    "Your posture is improving! 🔥",
    "Feel the muscle working! 💥",
    "One more set - you got this! ⚡",
    "Consistency builds champions! 🏆",
    "Your dedication shows! 🎯",
    "Almost there! Push hard! 🚀"
  ]);
  const [currentAIMessage, setCurrentAIMessage] = useState("You're crushing it! 💪");
  const [listening, setListening] = useState(false);
  const [repCounters, setRepCounters] = useState<Record<string, number>>({}); // Per-set counters
  const [currentRestingSet, setCurrentRestingSet] = useState<string | null>(null);
  const [injuryType, setInjuryType] = useState<'none' | 'hand' | 'leg' | 'back' | 'shoulder'>('none');

  // Global error suppression for benign environment-related issues
  useEffect(() => {
    if (!listening) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("🎤 Voice Recognition not supported in your browser. Try Chrome or Edge!");
      setListening(false);
      return;
    }

    // 🔢 Word-to-number mapping
    const wordToNumber: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      twenty: 20,
      thirty: 30,
    };

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log("🎤 Heard:", transcript);

      // 🏥 INJURY DETECTION FROM VOICE
      const injuryKeywords = {
        hand: ['hand', 'arm', 'wrist', 'elbow', 'hand injury'],
        leg: ['leg', 'knee', 'ankle', 'hip', 'leg injury'],
        back: ['back', 'spine', 'lumbar', 'back pain'],
        shoulder: ['shoulder', 'shoulder pain'],
      };

      for (const [injuryType, keywords] of Object.entries(injuryKeywords)) {
        if (keywords.some(keyword => transcript.includes(keyword))) {
          setInjuryType(injuryType as any);
          toast.addToast('info', '🏥 Injury Detected', `I heard about your ${injuryType} injury. Your workout has been adjusted!`);
          console.log(`✅ Voice detected ${injuryType} injury - updating workout`);
          break;
        }
      }

      // Get current set being worked on
      if (activeWorkout) {
        const currentExIdx = activeWorkout.exercises.findIndex(e => e.sets.some(s => !s.completed));
        if (currentExIdx !== -1) {
          const currentSetIdx = activeWorkout.exercises[currentExIdx].sets.findIndex(s => !s.completed);
          if (currentSetIdx !== -1) {
            const setKey = `${currentExIdx}-${currentSetIdx}`;
            const currentCount = repCounters[setKey] || 0;
            const targetReps = activeWorkout.exercises[currentExIdx].sets[currentSetIdx].reps;

            let numberDetected = false;
            const words = transcript.split(" ");

            // 🔢 SMART NUMBER COUNTING - Check for digits in speech
            const numbers = transcript.match(/\d+/g);
            if (numbers) {
              const totalIncrease = numbers.reduce((sum: number, num: string) => sum + parseInt(num), 0);
              const newCount = currentCount + totalIncrease;
              setRepCounters(prev => ({ ...prev, [setKey]: newCount }));
              numberDetected = true;

              // Show feedback
              console.log(`✅ Rep counted! +${totalIncrease} → ${newCount}/${targetReps}`);

              // Auto-complete when target reached
              if (newCount >= targetReps) {
                toast.addToast('success', 'Set Complete!', `🔥 Amazing! ${targetReps} reps done!`);
                setCurrentRestingSet(setKey);
                setCurrentAIMessage("Great work! Time to recover! 💪");
              }
            }

            // 🔢 Check for number words if no digits detected
            if (!numberDetected) {
              words.forEach((word: string) => {
                if (wordToNumber[word]) {
                  const incrementBy = wordToNumber[word];
                  const newCount = currentCount + incrementBy;
                  setRepCounters(prev => ({ ...prev, [setKey]: newCount }));
                  numberDetected = true;

                  // Show feedback
                  console.log(`✅ Rep counted! +${incrementBy} → ${newCount}/${targetReps}`);

                  // Auto-complete when target reached
                  if (newCount >= targetReps) {
                    toast.addToast('success', 'Set Complete!', `🔥 Amazing! ${targetReps} reps done!`);
                    setCurrentRestingSet(setKey);
                    setCurrentAIMessage("Great work! Time to recover! 💪");
                  }
                }
              });
            }

            // If no numbers detected, check for trigger words
            if (!numberDetected) {
              if (
                transcript.includes("up") ||
                transcript.includes("yes") ||
                transcript.includes("go") ||
                transcript.includes("rep") ||
                transcript.includes("done")
              ) {
                const newCount = currentCount + 1;
                setRepCounters(prev => ({ ...prev, [setKey]: newCount }));

                // Show feedback
                console.log(`✅ Rep counted! ${newCount}/${targetReps}`);

                // Auto-complete when target reached
                if (newCount >= targetReps) {
                  toast.addToast('success', 'Set Complete!', `🔥 Amazing! ${targetReps} reps done!`);
                  setCurrentRestingSet(setKey);
                  setCurrentAIMessage("Great work! Time to recover! 💪");
                }
              }
            }

            // Stop command
            if (transcript.includes("stop")) {
              setListening(false);
              recognition.stop();
              console.log("🛑 Voice recognition stopped");
            }
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("🎤 Speech recognition error:", event.error);
    };

    recognition.start();

    return () => recognition.stop();
  }, [listening, activeWorkout, repCounters]);

  // 🎤 AUTO-START VOICE when workout begins
  useEffect(() => {
    if (activeWorkout) {
      // Workout started - auto-start listening
      setListening(true);
      console.log("🎤 Voice recognition auto-started");
    } else {
      // Workout ended - stop listening
      setListening(false);
      console.log("🛑 Voice recognition auto-stopped");
    }
  }, [activeWorkout]);

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
          .maybeSingle();
        
        if (cloudProfile && !pError) {
          const convertedProfile = toCamelCase(cloudProfile);
          setProfile(convertedProfile);
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

  // Save data - only when profile or history changes significantly
  useEffect(() => {
    const saveData = async () => {
      if (!user || !supabase) return;

      // Save to localStorage
      if (profile) {
        localStorage.setItem(`evolvefit_profile_${user.id}`, JSON.stringify(profile));
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

      // Sync to Supabase (use UPSERT - safer than insert/update)
      if (profile) {
        setIsSyncing(true);
        try {
          const profileToSave = {
            id: user.id,
            email: user.email || '',
            gender: profile.gender || '',
            total_x_p: profile.totalXP || 0,
            level: profile.level || 1,
            streak: profile.streak || 0,
            onboarded: profile.onboarded || false
          };

          // UPSERT: Insert if new, update if exists (no 409 errors)
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([profileToSave]);

          if (profileError) {
            console.error('Profile sync error:', profileError);
          } else {
            console.log('Profile synced successfully');
          }
          
          // Save workout history
          if (history.length > 0) {
            const historyWithUserId = history.map(h => ({
              id: h.id,
              user_id: user.id,
              exercise_name: h.name,
              exercises: h.exercises,
              sets: h.exercises?.[0]?.sets?.[0] ? 3 : null,
              reps: h.exercises?.[0]?.sets?.[0]?.reps || 10,
              weight: h.exercises?.[0]?.sets?.[0]?.weight || 0,
              duration: h.duration,
              date: h.date,
              name: h.name,
              total_volume: h.totalVolume,
              xp_earned: h.xpEarned,
              muscle_groups: h.muscleGroups
            }));
            const { error: historyError } = await supabase
              .from('workout_history')
              .upsert(historyWithUserId);
            
            if (historyError) {
              console.error('Workout history sync error:', historyError);
            }
          }
        } catch (err: any) {
          console.error('Supabase sync error:', err);
        } finally {
          setIsSyncing(false);
        }
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
  const [elapsedTime, setElapsedTime] = useState(0);

  // Elapsed Time Logic - tracks actual workout duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, startTime]);

  // Rest Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => (prev !== null && prev > 0) ? prev - 1 : null);
      }, 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
      setCurrentRestingSet(null); // Auto-reset resting set when timer expires
      toast.addToast('info', 'Rest Complete!', '💪 Ready for the next set? Let\'s go!');
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

    if (!todayPlan) return;

    if (todayPlan.activityType === 'cardio') {
      setSelectedActivity(todayPlan.name);
      setIsCardioActive(true);
      return;
    }

    // Use exercises from the API plan (5+ per day guaranteed from backend)
    let baseExercises: any[] = [];
    
    if (todayPlan.exercises && todayPlan.exercises.length >= 3) {
      // Use all exercises from the API plan
      baseExercises = todayPlan.exercises.map((exName: string, idx: number) => {
        const baseName = exName.split(' - ')[0]; // Get base name without reps
        const id = `exercise-${idx}`;
        return {
          id,
          name: baseName,
          primaryMuscles: todayPlan.muscleGroups || ['full_body'],
          secondaryMuscles: [],
          equipment: [],
          mode: [profile.mode],
          instructions: [],
          category: todayPlan.name
        };
      });
    } else {
      // Fallback to hardcoded exercises if API plan is empty
      baseExercises = EXERCISES.filter(ex => ex.mode.includes(profile.mode)).slice(0, 5);
    }

    const getTargetReps = () => {
      switch(profile.fitnessLevel) {
        case 'beginner': return 12;
        case 'intermediate': return 10;
        case 'advanced': return 8;
        default: return 10;
      }
    };

    const workoutExercises: WorkoutExercise[] = baseExercises.map(ex => ({
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
    // 🔥 Show smart adjustment modal at workout start
    setShowSmartAdjustment(true);
    setShowSmartAdjustmentAtStart(true);
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
    
    if (e.target.files.length === 0) {
      toast.addToast('warning', 'No Photos Selected', 'Please select at least one photo to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const files = Array.from(e.target.files as FileList);
      
      if (files.length === 0) {
        toast.addToast('error', 'No Files', 'Please select at least one photo.');
        setIsAnalyzing(false);
        return;
      }

      console.log('📤 Files selected:', files.length, files.map(f => `${f.name} (${f.size} bytes)`));
      
      // Validate file sizes
      const maxSize = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = files.filter((f: File) => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        toast.addToast('error', 'File Too Large', 'Please use photos smaller than 5MB each.');
        setIsAnalyzing(false);
        return;
      }
      
      console.log('🔄 Converting files to base64...');
      const imageData = await Promise.all((files as File[]).map((file: File, idx: number) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const result = reader.result as string;
              console.log(`✅ Image ${idx + 1} converted, size: ${result.length}`);
              resolve(result);
            } catch (err) {
              console.error(`❌ Error converting image ${idx + 1}:`, err);
              reject(err);
            }
          };
          reader.onerror = () => {
            console.error(`❌ FileReader error for image ${idx + 1}:`, reader.error);
            reject(reader.error);
          };
          reader.readAsDataURL(file);
        });
      }));

      console.log('✨ All images converted, count:', imageData.length);

      // Send first image to backend
      const imageBase64 = imageData[0];
      if (!imageBase64) {
        console.error('❌ imageBase64 is undefined/null');
        throw new Error("No image data");
      }

      console.log("📤 Sending image to API, size:", imageBase64.length);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ API error response:', errorData);
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      const analysis = await res.json();
      const updatedProfile = {
        ...profile,
        bodyAnalysis: analysis,
        weeklyPlan: undefined // Clear old plan to force re-selection
      };
      setProfile(updatedProfile);
      
      // Save analysis to Supabase
      if (user?.id) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ body_analysis: analysis })
            .eq('id', user.id);
          if (error) console.error('❌ Failed to save analysis to Supabase:', error);
          else console.log('✅ Analysis saved to Supabase');
        } catch (err) {
          console.error('❌ Supabase save error:', err);
        }
      }
      
      setShowExternalSelection(false);
      setTempMode(null);
      setSelectedExternalActivities([]);
      setActiveTab('today');
      toast.addToast('success', 'Analysis Complete', 'Your AI body analysis is ready! Select your training mode.');
    } catch (error: any) {
      console.error("Analysis failed:", error);
      const errorMessage = error?.message || 'An error occurred during analysis';
      toast.addToast('error', 'Analysis Failed', errorMessage);
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
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: updatedProfile,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const plan = await res.json();
      const updatedProfileWithPlan = {
        ...updatedProfile,
        weeklyPlan: plan
      };
      setProfile(updatedProfileWithPlan);
      
      // Save plan to Supabase
      if (user?.id) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              weekly_plan: plan,
              mode: tempMode
            })
            .eq('id', user.id);
          if (error) console.error('❌ Failed to save plan to Supabase:', error);
          else console.log('✅ Plan saved to Supabase');
        } catch (err) {
          console.error('❌ Supabase save error:', err);
        }
      }
      
      setShowExternalSelection(false);
      setTempMode(null);
      toast.addToast('success', 'Plan Generated', 'Your personalized AI training plan is ready!');
    } catch (error: any) {
      console.error("Plan generation failed:", error);
      const errorMessage = error?.message || 'Failed to generate workout plan';
      toast.addToast('error', 'Plan Generation Failed', errorMessage);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleChatSubmit = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message
    const newMessages = [...chatMessages, { role: 'user' as const, text: message }];
    setChatMessages(newMessages);
    setChatInput('');
    
    try {
      // � Call Intent-based Coach (no API needed, fast & reliable)
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to get coach response');
      }

      const { response: coachResponse, detectedInjury, intent } = await response.json();

      // ✅ AUTOMATICALLY UPDATE WORKOUT IF INJURY DETECTED
      if (detectedInjury && detectedInjury !== 'none') {
        setInjuryType(detectedInjury);
        toast.addToast('info', '🏥 Workout Adjusted', `Your workout has been modified for your ${detectedInjury} injury.`);
        console.log(`✅ Intent: ${intent} - Injury: ${detectedInjury} - Workout updated`);
      }

      setChatMessages(prev => [...prev, { role: 'coach', text: coachResponse }]);
    } catch (error) {
      console.error('❌ Coach error:', error);
      const fallbackResponse = "Tell me your goal, injury, or how you're feeling! I can help with injuries, energy levels, time limits, or fitness goals. 💪";
      setChatMessages(prev => [...prev, { role: 'coach', text: fallbackResponse }]);
    }
  };

  // 🔥 STEP 3: Filter exercises based on injury type
  const getModifiedExercises = (exercises: WorkoutExercise[]): WorkoutExercise[] => {
    if (injuryType === 'none' || !exercises) return exercises;

    const excludedExercises = {
      hand: ['push-ups', 'pushup', 'plank', 'pull-up', 'pullup', 'dumbbell press', 'bench press', 'rows', 'rowing'],
      leg: ['squats', 'squat', 'lunges', 'lunge', 'running', 'leg press', 'calf', 'jumping', 'leg curl'],
      back: ['deadlifts', 'deadlift', 'barbell row', 'rows', 'rowing', 'back extension', 'hyperextension'],
      shoulder: ['shoulder press', 'overhead press', 'pull-ups', 'pullup', 'lateral raise', 'upright row', 'military press']
    };

    const filtered = exercises.filter(ex => {
      const exName = ex.name.toLowerCase();
      return !excludedExercises[injuryType as 'hand' | 'leg' | 'back' | 'shoulder'].some(excluded => exName.includes(excluded));
    });

    // If too many exercises filtered out, keep some
    return filtered.length > 0 ? filtered : exercises;
  };

  const handleSmartAdjustment = () => {
    if (!activeWorkout) return;
    
    let adjustmentFactor = 1;
    let message = '';
    
    // Calculate adjustment based on energy
    if (energyLevel === 'low') {
      adjustmentFactor = 0.6; // 60% of original
      message = '😓 **Low Energy Mode**: Reducing reps by 40%, increasing rest time.\n';
    } else if (energyLevel === 'medium') {
      adjustmentFactor = 1.0; // Keep same
      message = '😐 **Normal Mode**: Keeping target reps as planned.\n';
    } else if (energyLevel === 'high') {
      adjustmentFactor = 1.2; // 120% of original
      message = '⚡ **High Energy Mode**: Increasing reps by 20%, challenging sets.\n';
    }
    
    // Apply adjustments to workout
    const adjustedExercises = activeWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        ...set,
        reps: Math.max(1, Math.floor(set.reps * adjustmentFactor)),
        completed: false // Reset progress
      }))
    }));
    
    setActiveWorkout({ ...activeWorkout, exercises: adjustedExercises });
    
    // Show feedback
    toast.addToast('success', 'Workout Customized', message + '✅ Ready to crush it!');
    setShowSmartAdjustment(false);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout? Your progress is saved to the cloud.')) {
      try {
        await supabase?.auth.signOut();
        toast.addToast('success', 'Logged Out', 'You have been successfully logged out.');
      } catch (error) {
        console.error('Logout failed:', error);
        toast.addToast('error', 'Logout Failed', 'Could not logout. Please try again.');
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
            title="Legal"
          >
            <Shield size={20} className="text-zinc-400" />
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

                      {/* Today's Exercises Preview */}
                      {profile.weeklyPlan && (() => {
                        const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
                        const todayPlan = profile.weeklyPlan.days.find((d: any) => d.day === todayName);
                        return todayPlan?.exercises ? (
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-2 border border-white/20">
                            <div className="text-xs font-bold uppercase tracking-widest text-white/70">Today's Exercises</div>
                            <div className="space-y-1">
                              {todayPlan.exercises.slice(0, 3).map((ex: string, idx: number) => (
                                <div key={idx} className="text-sm text-white/90 flex items-start gap-2">
                                  <span className="font-bold text-xp">{idx + 1}.</span>
                                  <span>{ex}</span>
                                </div>
                              ))}
                              {todayPlan.exercises.length > 3 && (
                                <div className="text-xs text-white/70 italic">+{todayPlan.exercises.length - 3} more exercises...</div>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })()}

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
                  <label htmlFor="photo-upload" className="bg-brand-500 text-white font-bold px-8 py-4 rounded-2xl active:scale-95 transition-transform cursor-pointer hover:bg-brand-600">
                    Upload Photos
                    <input 
                      id="photo-upload"
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                      disabled={isAnalyzing}
                    />
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
                history={history}
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

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-32"
            >
              {/* User Information */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Settings</h2>
                <div className="bg-gradient-to-br from-brand-500/20 to-brand-600/10 rounded-3xl p-6 border border-brand-500/30 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">{profile?.name || 'Fitness Enthusiast'}</h3>
                      <p className="text-sm text-zinc-400">{user?.email}</p>
                      <div className="flex gap-4 mt-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold">Level</span>
                          <div className="text-2xl font-black text-brand-400">{getLevelInfo(profile?.totalXP || 0).level}</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold">XP</span>
                          <div className="text-2xl font-black text-brand-400">{formatXP(profile?.totalXP || 0)}</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold">Streak</span>
                          <div className="text-2xl font-black text-orange-400">🔥 {profile?.streak || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-widest text-zinc-400">Account</h3>
                <div className="space-y-3">
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold">Mode</p>
                      <p className="text-xs text-zinc-400">{profile?.mode === 'gym' ? '🏋️ Gym Workouts' : '🏠 Home Workouts'}</p>
                    </div>
                    <div className="text-2xl">{profile?.mode === 'gym' ? '🏋️' : '🏠'}</div>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold">Fitness Level</p>
                      <p className="text-xs text-zinc-400 capitalize">{profile?.fitnessLevel || 'beginner'}</p>
                    </div>
                    <div className="text-2xl">{profile?.fitnessLevel === 'advanced' ? '💪' : profile?.fitnessLevel === 'intermediate' ? '💯' : '🌱'}</div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-widest text-zinc-400">Preferences</h3>
                <div className="space-y-3">
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="w-full bg-zinc-900/50 hover:bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-brand-500/50 transition-all flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? (
                        <Sun size={20} className="text-zinc-400 group-hover:text-brand-400 transition-colors" />
                      ) : (
                        <Moon size={20} className="text-zinc-400 group-hover:text-brand-400 transition-colors" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-bold">Theme</p>
                        <p className="text-xs text-zinc-400 capitalize">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold uppercase text-zinc-300">
                      {theme === 'dark' ? '🌙' : '☀️'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 border-t border-zinc-800 pt-8">
                <h3 className="text-lg font-bold uppercase tracking-widest text-red-400">Danger Zone</h3>
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group"
                >
                  <div className="transition-transform group-hover:scale-110">🚪</div>
                  <span>Logout</span>
                </button>
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
                  <p className="text-xs text-zinc-500">{formatTime(elapsedTime)}</p>
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

              {/* Gym/Home Mode Selector */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Training Mode</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setProfile({ ...profile, mode: 'gym' });
                      // Regenerate exercises for gym mode
                      if (activeWorkout) {
                        const gymExercises = EXERCISES.filter(ex => ex.mode.includes('gym')).slice(0, 5);
                        const getTargetReps = () => {
                          switch(profile.fitnessLevel) {
                            case 'beginner': return 12;
                            case 'intermediate': return 10;
                            case 'advanced': return 8;
                            default: return 10;
                          }
                        };
                        const updatedExercises = gymExercises.map(ex => ({
                          ...ex,
                          sets: [
                            { weight: 20, reps: getTargetReps(), completed: false },
                            { weight: 20, reps: getTargetReps(), completed: false },
                            { weight: 20, reps: getTargetReps(), completed: false }
                          ]
                        }));
                        setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
                      }
                    }}
                    className={cn(
                      "p-3 rounded-2xl border font-bold text-sm transition-all flex items-center justify-center gap-2",
                      profile.mode === 'gym' 
                        ? "bg-brand-500/20 border-brand-500 text-brand-400" 
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    )}
                  >
                    <Dumbbell size={16} />
                    Gym
                  </button>
                  <button
                    onClick={() => {
                      setProfile({ ...profile, mode: 'home' });
                      // Regenerate exercises for home mode
                      if (activeWorkout) {
                        const homeExercises = EXERCISES.filter(ex => ex.mode.includes('home')).slice(0, 5);
                        const getTargetReps = () => {
                          switch(profile.fitnessLevel) {
                            case 'beginner': return 12;
                            case 'intermediate': return 10;
                            case 'advanced': return 8;
                            default: return 10;
                          }
                        };
                        const updatedExercises = homeExercises.map(ex => ({
                          ...ex,
                          sets: [
                            { weight: 0, reps: getTargetReps(), completed: false },
                            { weight: 0, reps: getTargetReps(), completed: false },
                            { weight: 0, reps: getTargetReps(), completed: false }
                          ]
                        }));
                        setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
                      }
                    }}
                    className={cn(
                      "p-3 rounded-2xl border font-bold text-sm transition-all flex items-center justify-center gap-2",
                      profile.mode === 'home' 
                        ? "bg-brand-500/20 border-brand-500 text-brand-400" 
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    )}
                  >
                    <Home size={16} />
                    Home
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {activeWorkout && (() => {
                const totalSets = activeWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                const completedSets = activeWorkout.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
                const progress = Math.round((completedSets / totalSets) * 100);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Progress</span>
                      <span className="text-sm font-black text-brand-500">{progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Smart Rest - Recovering Muscles Message */}
              {currentRestingSet && restTimer !== null && restTimer > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-green-500/30 to-emerald-600/20 border border-green-500/50 p-6 rounded-2xl text-center space-y-3 shadow-lg shadow-green-500/20"
                >
                  <div className="text-4xl font-black animate-pulse">💪</div>
                  <h3 className="text-2xl font-black text-green-300">Recovering Muscles</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-green-200 font-semibold">Smart Rest Timer</p>
                    <div className="text-5xl font-black text-green-400 font-mono">{restTimer}s</div>
                    <div className="w-full bg-green-900/50 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: `${(restTimer / (initialRestTime || 60)) * 100}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-green-300 italic">Your muscles are recovering. Breathe deep! 🫁</p>
                </motion.div>
              )}

              {/* Enhanced AI Insight Bubble with Dynamic Message */}
              <motion.div 
                key={currentAIMessage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/30 p-5 rounded-2xl flex gap-3 items-start shadow-lg shadow-brand-500/10"
              >
                <div className="p-2.5 bg-brand-500/30 rounded-lg text-brand-300 shrink-0">
                  <Zap size={20} fill="currentColor" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-brand-300">AI Coach says</h4>
                  <p className="text-sm text-zinc-300 font-semibold leading-relaxed">
                    {currentAIMessage}
                  </p>
                </div>
              </motion.div>

              {/* Exercises */}
              {getModifiedExercises(activeWorkout.exercises).map((ex, exIdx) => {
                const dayNumber = new Date().getDate();
                const exerciseVariation = getExerciseVariation(ex.id, dayNumber);
                
                // Find if this is the current exercise (first with incomplete sets)
                const isCurrentExercise = exIdx === getModifiedExercises(activeWorkout.exercises).findIndex(e => e.sets.some(s => !s.completed));
                const allSetsCompleted = ex.sets.every(s => s.completed);
                
                return (
                <motion.div 
                  key={ex.id} 
                  className={cn(
                    "space-y-4 p-5 rounded-2xl transition-all",
                    isCurrentExercise 
                      ? "bg-gradient-to-br from-brand-500/30 to-brand-600/10 border-2 border-brand-500 shadow-lg shadow-brand-500/30" 
                      : allSetsCompleted
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-zinc-900/50 border border-zinc-800"
                  )}
                  animate={isCurrentExercise ? { scale: 1.02 } : { scale: 1 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCurrentExercise && (
                          <motion.span 
                            animate={{ scale: [1, 1.2, 1] }} 
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-lg"
                          >
                            🔥
                          </motion.span>
                        )}
                        {allSetsCompleted && (
                          <span className="text-lg">✅</span>
                        )}
                        {isCurrentExercise && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-brand-500 text-white px-2 py-1 rounded-full">
                            DO NOW
                          </span>
                        )}
                      </div>
                      <h4 className="text-xl font-bold">{exerciseVariation}</h4>
                      <div className="flex gap-2 mt-1">
                        {ex.primaryMuscles.map(m => (
                          <span key={m} className="text-[10px] uppercase font-bold text-brand-400">{m}</span>
                        ))}
                      </div>
                    </div>
                    <BodyMap activeMuscles={ex.primaryMuscles} size={60} />
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-zinc-500 uppercase px-2">
                      <span>Set</span>
                      <span className="text-center">Target</span>
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <motion.div 
                        key={setIdx} 
                        className={cn(
                          "grid grid-cols-4 gap-2 items-center p-4 rounded-2xl border transition-all",
                          set.completed 
                            ? "bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20" 
                            : "bg-zinc-900 border-zinc-800"
                        )}
                        animate={set.completed ? { scale: 0.98 } : { scale: 1 }}
                      >
                        <span className="text-sm font-bold text-zinc-500">SET {setIdx + 1}</span>
                        
                        <div className="text-center">
                          <div className="text-lg font-black text-white">{set.reps}</div>
                          <div className="text-[8px] text-zinc-500 uppercase font-bold">Reps</div>
                        </div>

                        <div className="text-center">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const setKey = `${exIdx}-${setIdx}`;
                              const newCount = (repCounters[setKey] || 0) + 1;
                              setRepCounters(prev => ({ ...prev, [setKey]: newCount }));
                              
                              // Auto-complete when target reached
                              if (newCount >= set.reps) {
                                toast.addToast('success', 'Set Complete!', `🔥 Amazing! ${set.reps} reps done!`);
                                setCurrentRestingSet(setKey);
                                setCurrentAIMessage("Great work! Time to recover! 💪");
                              }
                            }}
                            className="w-full bg-blue-500/30 hover:bg-blue-500/50 border-2 border-blue-500/70 rounded-lg py-3 transition-all"
                          >
                            <div className="text-lg font-black text-blue-300">{repCounters[`${exIdx}-${setIdx}`] || 0} / {set.reps}</div>
                            <div className="text-[10px] text-blue-200 uppercase font-bold">Tap or speak</div>
                          </motion.button>
                        </div>

                        <div className="text-center">
                          <div className="text-sm font-black text-xp">+10</div>
                          <div className="text-[8px] text-zinc-500 uppercase font-bold">XP</div>
                        </div>

                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newExercises = [...activeWorkout.exercises];
                            const isCompleting = !newExercises[exIdx].sets[setIdx].completed;
                            newExercises[exIdx].sets[setIdx].completed = isCompleting;
                            setActiveWorkout({ ...activeWorkout, exercises: newExercises });
                            const setKey = `${exIdx}-${setIdx}`;

                            // Smart Rest Timer Logic
                            if (isCompleting) {
                              // Reset counter for this set
                              setRepCounters(prev => ({ ...prev, [setKey]: 0 }));
                              setCurrentRestingSet(setKey);
                              const randomMessage = aiCoachingMessages[Math.floor(Math.random() * aiCoachingMessages.length)];
                              setCurrentAIMessage(randomMessage); // Update AI message
                              
                              // Base rest is 60s
                              let restTime = 60;
                              const reps = newExercises[exIdx].sets[setIdx].reps;
                              
                              if (reps >= 12) restTime = 45;
                              else if (reps <= 8) restTime = 90;

                              if (setIdx === 2) restTime += 15;

                              setInitialRestTime(restTime);
                              setRestTimer(restTime);
                            } else {
                              setCurrentRestingSet(null);
                              setRestTimer(null);
                            }
                          }}
                          className={cn(
                            "px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1",
                            set.completed 
                              ? "bg-green-500/30 text-green-300 border border-green-500/50" 
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                          )}
                        >
                          {set.completed ? (
                            <>
                              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>✓</motion.span>
                              DONE
                            </>
                          ) : (
                            'COMPLETE'
                          )}
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
              })}
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

      {/* AI Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex flex-col"
            onClick={() => setShowChat(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 flex flex-col max-h-[80vh] z-50"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-500">
                    <Zap size={16} />
                  </div>
                  <h3 className="font-bold">AI Coach</h3>
                </div>
                <button onClick={() => setShowChat(false)} className="text-zinc-500 hover:text-zinc-300">
                  ✕
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-xs px-4 py-2 rounded-2xl text-sm',
                        msg.role === 'user'
                          ? 'bg-brand-500 text-white'
                          : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      )}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="border-t border-zinc-800 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(chatInput)}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => handleChatSubmit(chatInput)}
                    className="bg-brand-500 text-white px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Adjustment Modal - Only at Start */}
      <AnimatePresence>
        {showSmartAdjustment && showSmartAdjustmentAtStart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
            onClick={() => setShowSmartAdjustment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm space-y-6 safe-margin"
            >
              <div>
                <h2 className="text-3xl font-black mb-1">How are you feeling? 🏋️</h2>
                <p className="text-xs text-zinc-400">This helps me adjust your workout</p>
              </div>

              {/* Energy Level */}
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-widest text-brand-400">Energy Level</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setEnergyLevel('low')}
                    className={cn(
                      'py-4 rounded-xl font-bold text-lg transition-all border-2',
                      energyLevel === 'low'
                        ? 'bg-red-500/20 text-red-300 border-red-500'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    )}
                  >
                    😓
                    <div className="text-[10px] mt-1">Low</div>
                  </button>
                  <button
                    onClick={() => setEnergyLevel('medium')}
                    className={cn(
                      'py-4 rounded-xl font-bold text-lg transition-all border-2',
                      energyLevel === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    )}
                  >
                    🙂
                    <div className="text-[10px] mt-1">Medium</div>
                  </button>
                  <button
                    onClick={() => setEnergyLevel('high')}
                    className={cn(
                      'py-4 rounded-xl font-bold text-lg transition-all border-2',
                      energyLevel === 'high'
                        ? 'bg-green-500/20 text-green-300 border-green-500'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    )}
                  >
                    ⚡
                    <div className="text-[10px] mt-1">High</div>
                  </button>
                </div>
              </div>

              {/* Pain Check */}
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-widest text-red-400">Any Pain?</label>
                <button
                  onClick={() => setHasPain(!hasPain)}
                  className={cn(
                    'w-full py-3 rounded-xl font-bold transition-all',
                    hasPain
                      ? 'bg-red-500/20 border-red-500 text-red-300 border-2'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  )}
                >
                  {hasPain ? '🤕 Yes, I have pain' : '✅ No pain'}
                </button>
                {hasPain && (
                  <input
                    type="text"
                    value={painLocation}
                    onChange={(e) => setPainLocation(e.target.value)}
                    placeholder="Where? (e.g., left knee, shoulder)"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSmartAdjustment(false);
                    setShowSmartAdjustmentAtStart(false);
                  }}
                  className="flex-1 bg-zinc-800 text-white px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    handleSmartAdjustment();
                    setShowSmartAdjustmentAtStart(false);
                  }}
                  className="flex-1 bg-brand-500 text-white px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                >
                  Apply Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons (during workout) */}
      {isWorkoutActive && (
        <motion.div
          className="fixed bottom-32 right-6 flex flex-col gap-3 z-[60] pointer-events-auto"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Chat Button with Tooltip */}
          <motion.div className="relative group">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowChat(!showChat)}
              className="w-14 h-14 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 font-bold text-lg active:scale-95 transition-all"
              title="Ask AI Coach for help"
            >
              💬
            </motion.button>
            <div className="absolute right-16 bottom-0 bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-700 z-50">
              Ask AI Coach
            </div>
          </motion.div>
        </motion.div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
