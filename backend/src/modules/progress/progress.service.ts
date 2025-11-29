import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Progress, ProgressDocument } from './schemas/progress.schema';
import { LearningProfileService } from '../learning-profile/learning-profile.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    private learningProfileService: LearningProfileService,
  ) { }

  async updateProgress(
    userId: string,
    missionId: string,
    concepts: string[],
  ): Promise<ProgressDocument> {
    let progress = await this.progressModel.findOne({ userId }).exec();

    if (!progress) {
      progress = new this.progressModel({ userId });
    }

    // Update concept mastery
    concepts.forEach((concept) => {
      const currentMastery = progress.conceptMastery.get(concept) || 0;
      progress.conceptMastery.set(concept, Math.min(currentMastery + 10, 100));
    });

    // Analyze weak and strong concepts
    const conceptArray = Array.from(progress.conceptMastery.entries());
    progress.weakConcepts = conceptArray
      .filter(([, mastery]) => mastery < 50)
      .map(([concept]) => concept);

    progress.strongConcepts = conceptArray
      .filter(([, mastery]) => mastery >= 80)
      .map(([concept]) => concept);

    progress.completedConcepts = conceptArray
      .filter(([, mastery]) => mastery >= 100)
      .map(([concept]) => concept);

    progress.totalMissionsCompleted += 1;
    progress.lastUpdated = new Date();

    await progress.save();

    // Update learning profile with weak and strong skills
    await this.learningProfileService.update(new Types.ObjectId(userId), {
      weakSkills: progress.weakConcepts,
      strongSkills: progress.strongConcepts,
    });

    return progress;
  }

  async getProgress(userId: string): Promise<ProgressDocument | null> {
    return this.progressModel.findOne({ userId }).exec();
  }

  async getOrCreateProgress(userId: string): Promise<ProgressDocument> {
    let progress = await this.progressModel.findOne({ userId }).exec();
    if (!progress) {
      progress = new this.progressModel({ userId });
      await progress.save();
    }
    return progress;
  }

  async updateTimeSpent(userId: string, timeSpent: number): Promise<void> {
    const progress = await this.getOrCreateProgress(userId);
    progress.totalTimeSpent += timeSpent;
    await progress.save();
  }

  async calculateAverageScore(userId: string, newScore: number): Promise<void> {
    const progress = await this.getOrCreateProgress(userId);
    const totalScore =
      progress.averageScore * progress.totalMissionsCompleted + newScore;
    progress.averageScore = totalScore / (progress.totalMissionsCompleted + 1);
    await progress.save();
  }

  async applyAdaptiveMasteryUpdate(
    userId: string,
    masteryAdjustments: Map<string, number>,
    options: {
      score: number;
      weakConcepts: string[];
      strongConcepts: string[];
      timeSpent?: number;
      missionId?: string;
      isSuccessful: boolean;
    },
  ): Promise<{
    progress: ProgressDocument;
    masterySnapshot: Map<string, number>;
  }> {
    let progress = await this.getOrCreateProgress(userId);

    masteryAdjustments.forEach((delta, concept) => {
      const currentMastery = progress.conceptMastery.get(concept) || 0;
      const updatedMastery = Math.max(
        0,
        Math.min(100, Math.round(currentMastery + delta * 100)),
      );
      progress.conceptMastery.set(concept, updatedMastery);
    });

    const masteryEntries = Array.from(progress.conceptMastery.entries());
    progress.weakConcepts = masteryEntries
      .filter(([, mastery]) => mastery < 50)
      .map(([concept]) => concept);
    progress.strongConcepts = masteryEntries
      .filter(([, mastery]) => mastery >= 80)
      .map(([concept]) => concept);
    progress.completedConcepts = masteryEntries
      .filter(([, mastery]) => mastery >= 95)
      .map(([concept]) => concept);

    const previousCompleted = progress.totalMissionsCompleted;
    if (options.isSuccessful) {
      progress.totalMissionsCompleted += 1;
    }
    if (typeof options.timeSpent === 'number') {
      progress.totalTimeSpent += options.timeSpent;
    }

    if (options.isSuccessful) {
      const totalScore =
        progress.averageScore * previousCompleted + options.score;
      progress.averageScore =
        progress.totalMissionsCompleted > 0
          ? totalScore / progress.totalMissionsCompleted
          : options.score;
    }

    progress.lastUpdated = new Date();

    // Retry logic to handle version conflicts from concurrent updates
    let retries = 3;
    let savedProgress: ProgressDocument | null = null;

    while (retries > 0) {
      try {
        savedProgress = await progress.save();
        break; // Success, exit loop
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error?.name === 'VersionError' && retries > 1) {
          // Version conflict - reload the document and retry
          retries--;
          this.logger.warn(
            `Version conflict updating progress for user ${userId}, retrying... (${retries} attempts left)`,
          );

          // Reload the progress document to get the latest version
          const reloadedProgress = await this.progressModel
            .findOne({ userId })
            .exec();

          if (!reloadedProgress) {
            // If document doesn't exist, create it
            this.logger.warn(
              `Progress document not found during retry for user ${userId}, creating new one`,
            );
            progress = await this.getOrCreateProgress(userId);
          } else {
            progress = reloadedProgress;
          }

          // Reapply all the updates to the fresh document
          masteryAdjustments.forEach((delta, concept) => {
            const currentMastery = progress.conceptMastery.get(concept) || 0;
            const updatedMastery = Math.max(
              0,
              Math.min(100, Math.round(currentMastery + delta * 100)),
            );
            progress.conceptMastery.set(concept, updatedMastery);
          });

          progress.weakConcepts = options.weakConcepts || [];
          progress.strongConcepts = options.strongConcepts || [];
          progress.completedConcepts = Array.from(
            progress.conceptMastery.entries(),
          )
            .filter(([, mastery]) => mastery >= 95)
            .map(([concept]) => concept);

          const prevCompleted = progress.totalMissionsCompleted;
          if (options.isSuccessful) {
            progress.totalMissionsCompleted += 1;
          }
          if (typeof options.timeSpent === 'number') {
            progress.totalTimeSpent += options.timeSpent;
          }

          if (options.isSuccessful) {
            const totalScore =
              progress.averageScore * prevCompleted + options.score;
            progress.averageScore =
              progress.totalMissionsCompleted > 0
                ? totalScore / progress.totalMissionsCompleted
                : options.score;
          }

          progress.lastUpdated = new Date();

          // Wait a bit before retrying to reduce contention
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (4 - retries)),
          );
        } else {
          // Not a version error or out of retries
          throw error;
        }
      }
    }

    if (!savedProgress) {
      throw new Error('Failed to save progress after multiple retries');
    }

    this.logger.log(
      `📝 [PROGRESS] Updating learning profile for user ${userId}...`,
    );
    try {
      await this.learningProfileService.update(new Types.ObjectId(userId), {
        weakSkills: savedProgress.weakConcepts,
        strongSkills: savedProgress.strongConcepts,
      });
      this.logger.log(`✅ [PROGRESS] Learning profile updated successfully`);
    } catch (error) {
      this.logger.error(
        `❌ [PROGRESS] Error updating learning profile: ${error.message}`,
        error.stack,
      );
      // Continue anyway - don't fail the whole submission because of profile update
    }

    // Note: completedMissions is now tracked in gamification service
    // via adaptivity service when XP is awarded

    return {
      progress: savedProgress,
      masterySnapshot: new Map(savedProgress.conceptMastery),
    };
  }

  /**
   * 🗑️ Delete progress data (for account deletion)
   */
  async delete(userId: string): Promise<void> {
    await this.progressModel.deleteOne({ userId }).exec();
  }
}
