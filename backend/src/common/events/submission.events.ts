/**
 * Event payload for when a submission is completed
 */
export class SubmissionCompletedEvent {
  userId: string;
  missionId: string;
  submissionId: string;
  score: number;
  success: boolean;
  concepts: string[];
  weakConcepts: string[];
  difficulty: string;
  timeSpent?: number;
  attempts?: number;
  aiFeedback: {
    feedback: string;
    hints?: string[];
    suggestions?: string[];
  };

  constructor(partial: Partial<SubmissionCompletedEvent>) {
    Object.assign(this, partial);
  }
}

/**
 * Event payload for when progress is updated
 */
export class ProgressUpdatedEvent {
  userId: string;
  conceptsUpdated: string[];
  weakConcepts: string[];
  strongConcepts: string[];
  masteryLevels: Map<string, number>;

  constructor(partial: Partial<ProgressUpdatedEvent>) {
    Object.assign(this, partial);
  }
}

/**
 * Event payload for gamification updates
 */
export class GamificationUpdatedEvent {
  userId: string;
  xpGained: number;
  newLevel?: number;
  badgesEarned?: string[];
  streakUpdated?: boolean;

  constructor(partial: Partial<GamificationUpdatedEvent>) {
    Object.assign(this, partial);
  }
}
