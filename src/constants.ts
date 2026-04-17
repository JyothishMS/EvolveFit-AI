import { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'front_delts'],
    equipment: ['Barbell', 'Bench'],
    mode: ['gym'],
    instructions: ['Lie on bench', 'Lower bar to chest', 'Push back up'],
    category: 'Chest',
    visualUrl: 'https://picsum.photos/seed/benchpress/400/300'
  },
  {
    id: 'squat',
    name: 'Barbell Squat',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['Barbell'],
    mode: ['gym'],
    instructions: ['Bar on shoulders', 'Squat down', 'Stand back up'],
    category: 'Legs',
    visualUrl: 'https://picsum.photos/seed/squat/400/300'
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'front_delts', 'core'],
    equipment: [],
    mode: ['home', 'gym'],
    instructions: ['Plank position', 'Lower chest to floor', 'Push back up'],
    category: 'Chest',
    visualUrl: 'https://picsum.photos/seed/pushups/400/300'
  },
  {
    id: 'pull-ups',
    name: 'Pull-ups',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'rear_delts', 'forearms'],
    equipment: ['Pull-up Bar'],
    mode: ['gym', 'home'],
    instructions: ['Hang from bar', 'Pull chin over bar', 'Lower slowly'],
    category: 'Back',
    visualUrl: 'https://picsum.photos/seed/pullups/400/300'
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    primaryMuscles: ['back', 'hamstrings', 'glutes'],
    secondaryMuscles: ['forearms', 'core', 'traps'],
    equipment: ['Barbell'],
    mode: ['gym'],
    instructions: ['Bar on floor', 'Hinge at hips', 'Lift to standing'],
    category: 'Back',
    visualUrl: 'https://picsum.photos/seed/deadlift/400/300'
  },
  {
    id: 'plank',
    name: 'Plank',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders', 'glutes'],
    equipment: [],
    mode: ['home', 'gym'],
    instructions: ['Hold push-up position on elbows', 'Keep body straight'],
    category: 'Core',
    visualUrl: 'https://picsum.photos/seed/plank/400/300'
  },
  {
    id: 'lunges',
    name: 'Lunges',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    equipment: [],
    mode: ['home', 'gym'],
    instructions: ['Step forward', 'Lower back knee', 'Push back'],
    category: 'Legs',
    visualUrl: 'https://picsum.photos/seed/lunges/400/300'
  },
  {
    id: 'dumbell-curl',
    name: 'Dumbbell Curl',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    equipment: ['Dumbbells'],
    mode: ['gym'],
    instructions: ['Hold dumbbells', 'Curl up to shoulders', 'Lower slowly'],
    category: 'Arms',
    visualUrl: 'https://picsum.photos/seed/bicepcurl/400/300'
  }
];

export const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  quads: '#10b981',
  hamstrings: '#f59e0b',
  glutes: '#8b5cf6',
  shoulders: '#f43f5e',
  triceps: '#6366f1',
  biceps: '#ec4899',
  core: '#06b6d4',
  calves: '#14b8a6',
  forearms: '#84cc16',
  traps: '#a855f7'
};
