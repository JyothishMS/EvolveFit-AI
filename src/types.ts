export type Gender = 'male' | 'female' | 'other';
export type BodyGoal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'strength';
export type TrainingMode = 'gym' | 'home';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface BodyAnalysis {
  lastAnalysisDate: string;
  bodyFatPercentage: number;
  muscleMass: number;
  postureScore: number;
  recommendations: string[];
  weakPoints: string[];
  strongPoints: string[];
}

export interface DayWorkout {
  day: string;
  name: string;
  muscleGroups: string[];
  isRestDay: boolean;
  activityType?: 'strength' | 'cardio' | 'both';
}

export interface WeeklyPlan {
  startDate: string;
  days: DayWorkout[];
}

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  weight: number; // kg
  height: number; // cm
  goal: BodyGoal;
  mode: TrainingMode;
  fitnessLevel: FitnessLevel;
  onboarded: boolean;
  totalXP: number;
  level: number;
  streak: number;
  lastWorkoutDate?: string;
  bodyAnalysis?: BodyAnalysis;
  weeklyPlan?: WeeklyPlan;
  externalActivities?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  mode: TrainingMode[];
  instructions: string[];
  category: string;
  visualUrl?: string;
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExercise extends Exercise {
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
  duration: number; // minutes
  totalVolume: number; // kg
  xpEarned: number;
  muscleGroups: string[];
}
