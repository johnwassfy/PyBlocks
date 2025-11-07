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
    completedMissions: string[];
    level: number;
    xp: number;
    badges: string[];
    avgAccuracy: number;
  } | null;
  gamification: {
    xp: number;
    level: number;
    streak: number;
    badges: string[];
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




