/**
 * Exercise Rotation System
 * Automatically rotates exercise variations every 2 days to prevent plateaus
 * and keep workouts fresh and engaging
 */

// Define exercise variations by ID
export const exerciseVariations: Record<string, { name: string; variations: string[] }> = {
  'push-ups': {
    name: 'Push-ups',
    variations: ['Standard Push-up', 'Diamond Push-up', 'Wide Grip Push-up', 'Decline Push-up', 'Incline Push-up']
  },
  'squat': {
    name: 'Squat',
    variations: ['Bodyweight Squat', 'Sumo Squat', 'Jump Squat', 'Bulgarian Split Squat', 'Pistol Squat']
  },
  'pull-ups': {
    name: 'Pull-ups',
    variations: ['Standard Pull-up', 'Wide Grip Pull-up', 'Chin-up (Undergrip)', 'Neutral Grip Pull-up', 'L-Sit Pull-up']
  },
  'plank': {
    name: 'Plank',
    variations: ['Standard Plank', 'Side Plank', 'Weighted Plank', 'Plank with Hip Dips', 'Dynamic Plank']
  },
  'bench-press': {
    name: 'Bench Press',
    variations: ['Barbell Bench Press', 'Dumbbell Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Close Grip Bench Press']
  },
  'deadlift': {
    name: 'Deadlift',
    variations: ['Conventional Deadlift', 'Sumo Deadlift', 'Romanian Deadlift', 'Trap Bar Deadlift', 'Deficit Deadlift']
  },
  'lunges': {
    name: 'Lunges',
    variations: ['Forward Lunges', 'Reverse Lunges', 'Walking Lunges', 'Bulgarian Split Squats', 'Jumping Lunges']
  },
  'dumbell-curl': {
    name: 'Dumbbell Curl',
    variations: ['Standard Dumbbell Curl', 'Hammer Curl', 'Incline Dumbbell Curl', 'Concentration Curl', 'Rotating Dumbbell Curl']
  }
};

/**
 * Get the current variation of an exercise based on the day
 * Rotates every 2 days through all variations
 * @param exerciseId - The exercise ID from EXERCISES
 * @param day - Day number (typically from Date.getDate() or a session counter)
 * @returns The current exercise name/variation
 */
export function getExerciseVariation(exerciseId: string, day: number): string {
  const exercise = exerciseVariations[exerciseId];
  
  if (!exercise) {
    return exerciseId; // Return original ID if not found
  }

  // Rotation every 2 days
  const rotationCycle = 2;
  const variationIndex = Math.floor(day / rotationCycle) % exercise.variations.length;
  
  return exercise.variations[variationIndex];
}

/**
 * Get all variations for an exercise
 * @param exerciseId - The exercise ID
 * @returns Array of all variations for the exercise
 */
export function getExerciseVariations(exerciseId: string): string[] {
  const exercise = exerciseVariations[exerciseId];
  return exercise ? exercise.variations : [];
}

/**
 * Get the base exercise name
 * @param exerciseId - The exercise ID
 * @returns The base exercise name
 */
export function getBaseExerciseName(exerciseId: string): string {
  const exercise = exerciseVariations[exerciseId];
  return exercise ? exercise.name : exerciseId;
}

/**
 * Get rotation info for UI display
 * @param exerciseId - The exercise ID
 * @param day - Day number
 * @returns Object with variation name, index, and total variations
 */
export function getRotationInfo(exerciseId: string, day: number) {
  const exercise = exerciseVariations[exerciseId];
  
  if (!exercise) {
    return {
      current: exerciseId,
      index: 0,
      total: 0,
      rotatesIn: 0
    };
  }

  const rotationCycle = 2;
  const variationIndex = Math.floor(day / rotationCycle) % exercise.variations.length;
  const daysInCurrentVariation = (day % rotationCycle);
  const rotatesIn = rotationCycle - daysInCurrentVariation;

  return {
    current: exercise.variations[variationIndex],
    index: variationIndex,
    total: exercise.variations.length,
    rotatesIn: rotatesIn === 0 ? rotationCycle : rotatesIn
  };
}

/**
 * Gym-specific exercises with alternatives for home workouts
 * @param exerciseId - The exercise ID
 * @returns Alternative exercise ID for home mode, or original ID if no alternative
 */
export function getHomeExerciseAlternative(exerciseId: string): string {
  const alternatives: Record<string, string> = {
    'bench-press': 'push-ups',
    'squat': 'lunges',
    'deadlift': 'push-ups', // Simplified alternative
    'dumbell-curl': 'pull-ups' // Using pull-ups as bicep alternative
  };

  return alternatives[exerciseId] || exerciseId;
}

/**
 * Get exercise by mode (gym or home)
 * @param exerciseId - The exercise ID
 * @param mode - 'gym' or 'home'
 * @param day - Day number for rotation
 * @returns Final exercise variation with mode consideration
 */
export function getExerciseForMode(exerciseId: string, mode: 'gym' | 'home', day: number): string {
  // If home mode, check if we need to use alternative
  const finalExerciseId = mode === 'home' ? getHomeExerciseAlternative(exerciseId) : exerciseId;
  return getExerciseVariation(finalExerciseId, day);
}
