import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Progress, ProgressDocument } from './schemas/progress.schema';
import { LearningProfileService } from '../learning-profile/learning-profile.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    private learningProfileService: LearningProfileService,
  ) {}

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
}
