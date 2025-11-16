export class UpdateLearningStateDto {
  userId: string;
  submissionId?: string;

  // Concepts detected from the code
  detectedConcepts?: string[];

  // Strengths and weaknesses
  strongConcepts?: string[];
  weakConcepts?: string[];

  // Concept mastery updates (concept -> mastery level 0-100)
  conceptMastery?: { [key: string]: number };

  // Overall performance metrics
  submissionSuccess?: boolean;
  executionSuccess?: boolean;

  // Time spent on this mission (in seconds)
  timeSpent?: number;

  // Difficulty level of the mission
  difficulty?: number;
}
