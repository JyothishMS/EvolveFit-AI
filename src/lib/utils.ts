import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatXP(xp: number): string {
  try {
    const val = Number(xp);
    if (isNaN(val)) return '0';
    return new Intl.NumberFormat().format(val);
  } catch {
    return '0';
  }
}

export function getLevelInfo(xp: number) {
  const validXP = isNaN(Number(xp)) ? 0 : Number(xp);
  // level = floor(sqrt(xp / 100)) + 1
  const level = Math.floor(Math.sqrt(validXP / 100)) + 1;
  
  // currentLevelXP = (level - 1)^2 * 100
  const currentLevelXP = Math.pow(level - 1, 2) * 100;
  
  // nextLevelXP = (level)^2 * 100
  const nextLevelXP = Math.pow(level, 2) * 100;
  
  const progress = ((validXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return {
    level,
    currentLevelXP,
    nextThreshold: nextLevelXP,
    progress
  };
}
