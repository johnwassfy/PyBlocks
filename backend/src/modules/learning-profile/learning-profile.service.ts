import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LearningProfile,
  LearningProfileDocument,
} from './schemas/learning-profile.schema';
import { UpdateLearningProfileDto } from './dto/update-learning-profile.dto';

@Injectable()
export class LearningProfileService {
  constructor(
    @InjectModel(LearningProfile.name)
    private learningProfileModel: Model<LearningProfileDocument>,
  ) {}

  /**
   * Create a new learning profile for a user
   * Called automatically when a new user registers
   */
  async create(userId: Types.ObjectId): Promise<LearningProfileDocument> {
    const profile = new this.learningProfileModel({
      userId,
      lastActive: new Date(),
    });
    return profile.save();
  }

  /**
   * Find learning profile by user ID
   */
  async findByUserId(
    userId: Types.ObjectId,
  ): Promise<LearningProfileDocument | null> {
    return this.learningProfileModel.findOne({ userId }).exec();
  }

  /**
   * Get learning profile by user ID (throws if not found)
   */
  async getByUserId(userId: Types.ObjectId): Promise<LearningProfileDocument> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        `Learning profile not found for user ${userId}`,
      );
    }
    return profile;
  }

  /**
   * Update learning profile
   */
  async update(
    userId: Types.ObjectId,
    updateDto: UpdateLearningProfileDto,
  ): Promise<LearningProfileDocument> {
    const profile = await this.learningProfileModel
      .findOneAndUpdate(
        { userId },
        { ...updateDto, lastActive: new Date() },
        { new: true },
      )
      .exec();

    if (!profile) {
      throw new NotFoundException(
        `Learning profile not found for user ${userId}`,
      );
    }

    return profile;
  }

  /**
   * Add XP and update level
   */
  async addXP(
    userId: Types.ObjectId,
    xpToAdd: number,
  ): Promise<LearningProfileDocument> {
    const profile = await this.getByUserId(userId);
    profile.xp += xpToAdd;

    // Level up logic (every 100 XP = 1 level)
    const newLevel = Math.floor(profile.xp / 100) + 1;
    if (newLevel > profile.level) {
      profile.level = newLevel;
    }

    profile.lastActive = new Date();
    return profile.save();
  }

  /**
   * Add a completed mission
   */
  async addCompletedMission(
    userId: Types.ObjectId,
    missionId: string,
  ): Promise<LearningProfileDocument> {
    const profile = await this.getByUserId(userId);

    if (!profile.completedMissions.includes(missionId)) {
      profile.completedMissions.push(missionId);
    }

    profile.lastActive = new Date();
    return profile.save();
  }

  /**
   * Update skill scores (used by AI service)
   */
  async updateSkillScores(
    userId: Types.ObjectId,
    skillScores: Record<string, number>,
  ): Promise<LearningProfileDocument> {
    const profile = await this.getByUserId(userId);

    // Merge new scores with existing ones
    profile.skillScores = {
      ...profile.skillScores,
      ...skillScores,
    };

    profile.lastActive = new Date();
    return profile.save();
  }

  /**
   * Add a badge
   */
  async addBadge(
    userId: Types.ObjectId,
    badge: string,
  ): Promise<LearningProfileDocument> {
    const profile = await this.getByUserId(userId);

    if (!profile.badges.includes(badge)) {
      profile.badges.push(badge);
    }

    profile.lastActive = new Date();
    return profile.save();
  }

  /**
   * Update submission stats
   */
  async updateSubmissionStats(
    userId: Types.ObjectId,
    isSuccessful: boolean,
    accuracy: number,
  ): Promise<LearningProfileDocument> {
    const profile = await this.getByUserId(userId);

    profile.totalSubmissions += 1;
    if (isSuccessful) {
      profile.successfulSubmissions += 1;
    }

    // Update average accuracy
    const totalAccuracy =
      profile.avgAccuracy * (profile.totalSubmissions - 1) + accuracy;
    profile.avgAccuracy = totalAccuracy / profile.totalSubmissions;

    profile.lastActive = new Date();
    return profile.save();
  }

  /**
   * Delete learning profile (for cleanup)
   */
  async delete(userId: Types.ObjectId): Promise<void> {
    await this.learningProfileModel.deleteOne({ userId }).exec();
  }
}
