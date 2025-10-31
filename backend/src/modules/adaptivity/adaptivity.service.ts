import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProgressService } from '../progress/progress.service';
import { GamificationService } from '../gamification/gamification.service';
import { MissionsService } from '../missions/missions.service';
import { SubmissionCompletedEvent } from '../../common/events/submission.events';
import { AiAnalysisResponseDto } from '../ai-connector/dto/ai-analysis.dto';

/**
 * AdaptivityService - The brain of the adaptive learning system
 *
 * This service acts as a coordinator between submissions, progress, and gamification.
 * It doesn't store data directly - it reads from multiple services, applies adaptive
 * logic, and orchestrates updates across the system.
 *
 * Key responsibilities:
 * - Analyze AI feedback and determine learning insights
 * - Update progress and gamification based on performance
 * - Recommend next missions based on weak concepts
 * - Detect learning patterns and adjust difficulty
 */
@Injectable()
export class AdaptivityService {
  private readonly logger = new Logger(AdaptivityService.name);

  constructor(
    private readonly progressService: ProgressService,
    private readonly gamificationService: GamificationService,
    private readonly missionsService: MissionsService,
  ) {}

  /**
   * Main processing method - called after a submission is analyzed
   * Orchestrates all adaptive logic in one place
   */
  async processSubmissionAnalysis(
    userId: string,
    missionId: string,
    submissionId: string,
    aiFeedback: AiAnalysisResponseDto,
    missionData: { difficulty: string; concepts: string[] },
  ) {
    this.logger.log(
      `Processing adaptive analysis for user ${userId}, mission ${missionId}`,
    );

    try {
      // 1. Update progress with concept mastery
      const progressUpdate = await this.updateProgressWithFeedback(
        userId,
        aiFeedback,
        missionData.concepts,
      );

      // 2. Calculate and award XP based on performance
      const xpReward = this.calculateAdaptiveXP(
        aiFeedback.score,
        missionData.difficulty,
        progressUpdate.improvementFactor,
      );
      await this.gamificationService.awardXp(userId, xpReward);

      // 3. Check for badge achievements
      await this.checkAndAwardBadges(userId, aiFeedback, progressUpdate);

      // 4. Detect weak concepts for future recommendations
      const weakConcepts = this.identifyWeakConcepts(
        aiFeedback,
        progressUpdate.conceptMastery,
      );

      // 5. Recommend next mission based on learning path
      const nextMission = await this.recommendNextMission(
        userId,
        weakConcepts,
        missionData.difficulty,
      );

      // 6. Analyze learning patterns
      const learningInsights = await this.analyzeLearningPatterns(
        userId,
        aiFeedback,
      );

      return {
        xpGained: xpReward,
        progressUpdate,
        weakConcepts,
        nextMission,
        learningInsights,
        adaptiveRecommendation: this.generateAdaptiveRecommendation(
          weakConcepts,
          learningInsights,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error processing adaptive analysis: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Event listener - automatically triggered when a submission is completed
   */
  @OnEvent('submission.completed')
  async handleSubmissionCompleted(event: SubmissionCompletedEvent) {
    this.logger.log(
      `Handling submission completed event for user ${event.userId}`,
    );

    try {
      await this.processSubmissionAnalysis(
        event.userId,
        event.missionId,
        event.submissionId,
        {
          success: event.success,
          score: event.score,
          feedback: event.aiFeedback.feedback,
          weakConcepts: event.weakConcepts,
          hints: event.aiFeedback.hints,
          suggestions: event.aiFeedback.suggestions,
        } as AiAnalysisResponseDto,
        {
          difficulty: event.difficulty,
          concepts: event.concepts,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error handling submission completed event: ${error.message}`,
      );
    }
  }

  /**
   * Update progress service with AI feedback
   */
  private async updateProgressWithFeedback(
    userId: string,
    aiFeedback: AiAnalysisResponseDto,
    missionConcepts: string[],
  ) {
    const conceptMastery = new Map<string, number>();

    // Calculate mastery change for each concept
    for (const concept of missionConcepts) {
      const isWeak = aiFeedback.weakConcepts?.includes(concept);
      const isStrong = aiFeedback.strongConcepts?.includes(concept);

      let masteryChange = 0;
      if (isStrong) {
        masteryChange = 0.15; // Strong performance increases mastery
      } else if (isWeak) {
        masteryChange = -0.05; // Weak performance slightly decreases
      } else {
        masteryChange = 0.05; // Neutral performance slight increase
      }

      conceptMastery.set(concept, masteryChange);
    }

    // Get current progress for improvement calculation
    const currentProgress = await this.progressService.getProgress(userId);
    const improvementFactor = this.calculateImprovementFactor(currentProgress);

    return {
      conceptMastery,
      improvementFactor,
      weakConcepts: aiFeedback.weakConcepts || [],
      strongConcepts: aiFeedback.strongConcepts || [],
    };
  }

  /**
   * Calculate XP with adaptive bonuses
   */
  private calculateAdaptiveXP(
    score: number,
    difficulty: string,
    improvementFactor: number,
  ): number {
    // Base XP based on difficulty
    const baseXP =
      {
        easy: 10,
        medium: 20,
        hard: 30,
      }[difficulty] || 15;

    // Score multiplier (0.5 to 1.5)
    const scoreMultiplier = 0.5 + score / 100;

    // Improvement bonus (0 to 0.5)
    const improvementBonus = improvementFactor * 0.5;

    return Math.round(baseXP * scoreMultiplier * (1 + improvementBonus));
  }

  /**
   * Calculate improvement factor based on recent progress
   */
  private calculateImprovementFactor(progress: any): number {
    if (!progress || !progress.totalMissionsCompleted) {
      return 0;
    }

    // Simple improvement detection based on total missions
    // This can be enhanced with more sophisticated ML later
    const completed = progress.totalMissionsCompleted;
    
    if (completed < 2) {
      return 0;
    }

    // Calculate improvement factor (0 to 1) based on progress
    return Math.min(completed / 50, 1); // Normalize to 0-1 range
  }

  /**
   * Identify weak concepts from feedback and progress
   */
  private identifyWeakConcepts(
    aiFeedback: AiAnalysisResponseDto,
    conceptMastery: Map<string, number>,
  ): string[] {
    const weakConcepts = new Set<string>(aiFeedback.weakConcepts || []);

    // Add concepts with low mastery scores
    conceptMastery.forEach((mastery, concept) => {
      if (mastery < 0.5) {
        weakConcepts.add(concept);
      }
    });

    return Array.from(weakConcepts);
  }

  /**
   * Recommend next mission based on adaptive logic
   */
  private async recommendNextMission(
    _userId: string,
    weakConcepts: string[],
    _currentDifficulty: string,
  ) {
    // For now, use empty completed missions array
    // TODO: Implement proper progress tracking with completed missions array
    const completedMissions: string[] = [];

    // If there are weak concepts, prioritize missions that address them
    if (weakConcepts.length > 0) {
      return await this.missionsService.getAdaptiveMissions(
        weakConcepts,
        completedMissions,
      );
    }

    // Otherwise, suggest next mission in progression
    return await this.missionsService.getNextMission(completedMissions);
  }

  /**
   * Check and award badges based on achievements
   */
  private async checkAndAwardBadges(
    userId: string,
    aiFeedback: AiAnalysisResponseDto,
    progressUpdate: any,
  ) {
    const badges: string[] = [];

    // Perfect score badge
    if (aiFeedback.score === 100) {
      badges.push('Perfect Score');
    }

    // Strong concept mastery badge
    if (progressUpdate.strongConcepts?.length >= 3) {
      badges.push('Concept Master');
    }

    // Improvement badge
    if (progressUpdate.improvementFactor > 0.8) {
      badges.push('Rising Star');
    }

    // Award badges if any
    for (const badge of badges) {
      await this.gamificationService.awardBadge(userId, badge);
    }
  }

  /**
   * Analyze learning patterns (can be extended with ML)
   */
  private async analyzeLearningPatterns(
    userId: string,
    aiFeedback: AiAnalysisResponseDto,
  ) {
    // Get user's progress history
    const progress = await this.progressService.getProgress(userId);

    return {
      learningVelocity: this.calculateLearningVelocity(progress),
      conceptStrengths: aiFeedback.strongConcepts || [],
      conceptWeaknesses: aiFeedback.weakConcepts || [],
      recommendedFocus: this.determineRecommendedFocus(aiFeedback),
    };
  }

  /**
   * Calculate how quickly the user is learning
   */
  private calculateLearningVelocity(progress: any): string {
    if (!progress || !progress.totalMissionsCompleted) {
      return 'beginner';
    }

    const missionsCompleted = progress.totalMissionsCompleted;

    if (missionsCompleted < 5) return 'beginner';
    if (missionsCompleted < 15) return 'developing';
    if (missionsCompleted < 30) return 'proficient';
    return 'advanced';
  }

  /**
   * Determine what the user should focus on next
   */
  private determineRecommendedFocus(
    aiFeedback: AiAnalysisResponseDto,
  ): string[] {
    const focus: string[] = [];

    if (aiFeedback.weakConcepts && aiFeedback.weakConcepts.length > 0) {
      focus.push(`Review ${aiFeedback.weakConcepts[0]}`);
    }

    if (aiFeedback.hints && aiFeedback.hints.length > 0) {
      focus.push('Apply the hints from your last submission');
    }

    if (aiFeedback.score < 70) {
      focus.push('Practice more missions at current difficulty');
    } else if (aiFeedback.score >= 90) {
      focus.push('Try more challenging missions');
    }

    return focus;
  }

  /**
   * Generate human-readable adaptive recommendation
   */
  private generateAdaptiveRecommendation(
    weakConcepts: string[],
    learningInsights: any,
  ): string {
    if (weakConcepts.length > 0) {
      return `Focus on improving your understanding of ${weakConcepts.join(', ')}. We've selected missions to help you master these concepts.`;
    }

    if (learningInsights.learningVelocity === 'advanced') {
      return `Great progress! You're learning quickly. Try more challenging missions to keep growing.`;
    }

    return `Keep up the good work! Continue practicing to strengthen your skills.`;
  }
}
