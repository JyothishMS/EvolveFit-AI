import React from 'react';
import { cn } from '../lib/utils';

interface BodyMapProps {
  muscleStats?: Record<string, { rank: string, color: string }>;
  activeMuscles?: string[];
  view?: 'front' | 'back' | 'side';
  className?: string;
  size?: number;
}

export const BodyMap: React.FC<BodyMapProps> = ({
  muscleStats = {},
  activeMuscles = [],
  view = 'front',
  className,
  size = 300
}) => {
  const getMuscleStyle = (muscle: string) => {
    const stat = muscleStats[muscle];
    const isActive = activeMuscles.includes(muscle);
    
    if (isActive) return { fill: '#f43f5e', filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.8))' };
    if (stat) return { fill: stat.color, filter: `drop-shadow(0 0 4px ${stat.color}80)` };
    return { fill: '#27272a', fillOpacity: 0.5 };
  };

  const renderView = () => {
    switch (view) {
      case 'front':
        return (
          <g id="front-view">
            {/* Head & Neck */}
            <path d="M100 10c-8 0-14 6-14 14s6 14 14 14 14-6 14-14-6-14-14-14z" fill="#09090b" />
            <path d="M92 38h16l2 8h-20l2-8z" fill="#09090b" />
            
            {/* Chest */}
            <path d="M100 55c-15 0-28 5-32 12l2 18c8-4 18-6 30-6s22 2 30 6l2-18c-4-7-17-12-32-12z" style={getMuscleStyle('chest')} className="transition-all duration-500" />
            
            {/* Shoulders */}
            <path d="M62 52c-8 2-14 8-16 16l4 12c4-8 10-12 12-12v-16z" style={getMuscleStyle('shoulders')} className="transition-all duration-500" />
            <path d="M138 52c8 2 14 8 16 16l-4 12c-4-8-10-12-12-12v-16z" style={getMuscleStyle('shoulders')} className="transition-all duration-500" />
            
            {/* Abs */}
            <path d="M85 95h30l2 40h-34l2-40z" style={getMuscleStyle('core')} className="transition-all duration-500" />
            
            {/* Biceps */}
            <path d="M48 85c-4 10-4 25 0 35l8-4c-2-8-2-20 0-28l-8-3z" style={getMuscleStyle('biceps')} className="transition-all duration-500" />
            <path d="M152 85c4 10 4 25 0 35l-8-4c2-8 2-20 0-28l8-3z" style={getMuscleStyle('biceps')} className="transition-all duration-500" />
            
            {/* Forearms */}
            <path d="M45 125l-5 40 8 5 6-40-9-5z" style={getMuscleStyle('forearms')} className="transition-all duration-500" />
            <path d="M155 125l5 40-8 5-6-40 9-5z" style={getMuscleStyle('forearms')} className="transition-all duration-500" />
            
            {/* Quads */}
            <path d="M75 145l-10 70 18 5 12-75-20 0z" style={getMuscleStyle('quads')} className="transition-all duration-500" />
            <path d="M125 145l10 70-18 5-12-75 20 0z" style={getMuscleStyle('quads')} className="transition-all duration-500" />
            
            {/* Calves */}
            <path d="M70 230l-5 60 12 5 8-65-15 0z" style={getMuscleStyle('calves')} className="transition-all duration-500" />
            <path d="M130 230l5 60-12 5-8-65 15 0z" style={getMuscleStyle('calves')} className="transition-all duration-500" />
          </g>
        );
      case 'back':
        return (
          <g id="back-view">
            {/* Head */}
            <path d="M100 10c-8 0-14 6-14 14s6 14 14 14 14-6 14-14-6-14-14-14z" fill="#09090b" />
            
            {/* Back (Lats & Traps) */}
            <path d="M100 45c-20 0-35 10-40 25l5 35c10-5 20-8 35-8s25 3 35 8l5-35c-5-15-20-25-40-25z" style={getMuscleStyle('back')} className="transition-all duration-500" />
            
            {/* Triceps */}
            <path d="M52 80c-5 12-5 28 0 40l6-5c-2-10-2-25 0-32l-6-3z" style={getMuscleStyle('triceps')} className="transition-all duration-500" />
            <path d="M148 80c5 12 5 28 0 40l-6-5c2-10 2-25 0-32l6-3z" style={getMuscleStyle('triceps')} className="transition-all duration-500" />
            
            {/* Glutes */}
            <path d="M70 140c0 15 10 25 30 25s30-10 30-25l-5-15h-50l-5 15z" style={getMuscleStyle('glutes')} className="transition-all duration-500" />
            
            {/* Hamstrings */}
            <path d="M72 175l-8 65 15 5 10-70-17 0z" style={getMuscleStyle('hamstrings')} className="transition-all duration-500" />
            <path d="M128 175l8 65-15 5-10-70 17 0z" style={getMuscleStyle('hamstrings')} className="transition-all duration-500" />
            
            {/* Calves (Back) */}
            <path d="M70 250l-5 50 12 5 8-55-15 0z" style={getMuscleStyle('calves')} className="transition-all duration-500" />
            <path d="M130 250l5 50-12 5-8-55 15 0z" style={getMuscleStyle('calves')} className="transition-all duration-500" />
          </g>
        );
      case 'side':
        return (
          <g id="side-view">
            {/* Head */}
            <path d="M100 10c-8 0-14 6-14 14s6 14 14 14 14-6 14-14-6-14-14-14z" fill="#09090b" />
            
            {/* Torso Side */}
            <path d="M90 45h20l5 90h-30l5-90z" style={getMuscleStyle('core')} className="transition-all duration-500" />
            
            {/* Arm Side */}
            <path d="M105 50l5 80-10 5-5-80 10-5z" style={getMuscleStyle('shoulders')} className="transition-all duration-500" />
            
            {/* Leg Side */}
            <path d="M95 140l5 150-15 5-5-150 15-5z" style={getMuscleStyle('quads')} className="transition-all duration-500" />
          </g>
        );
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size * 1.2 }}>
      <svg
        viewBox="0 0 200 320"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderView()}
      </svg>
    </div>
  );
};

