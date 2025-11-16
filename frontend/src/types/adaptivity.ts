/**
 * Achievement structure matching backend Achievement schema
 */
export interface Achievement {
  id: string; // e.g., "first_mission", "week_streak"
  name: string; // e.g., "First Steps 🐣"
  description: string;
  icon: string; // emoji
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'mission' | 'xp' | 'streak' | 'speed' | 'mastery' | 'special';
  unlockedAt?: Date;
}

export interface AdaptiveInsights {
  mastery: Record<string, number>;
  weakConcepts: string[];
  strongConcepts: string[];
  completedConcepts: string[];
  improvementFactor: number;
  totals: {
    missionsCompleted: number;
    totalTimeSpent: number;
    averageScore: number;
  };
  profile: {
    weakSkills: string[];
    strongSkills: string[];
    avgAccuracy: number;
  } | null;
  gamification: {
    xp: number;
    level: number;
    streak: number;
    completedMissions: string[];
    totalMissionsCompleted: number;
    achievements: Achievement[];
  };
  recommendations: Array<{
    id: string;
    title: string;
    description?: string;
    difficulty?: string;
    tags?: string[];
    order?: number;
  }>;
  fallbackMission: {
    id: string;
    title: string;
    difficulty?: string;
    description?: string;
  } | null;
}




