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
   * Update weak and strong skills
   */
  async updateSkills(
    userId: Types.ObjectId,
    weakSkills: string[],
    strongSkills: string[],
  ): Promise<LearningProfileDocument> {
    const profile = await this.getByUserId(userId);

    // Merge arrays, avoiding duplicates
    profile.weakSkills = Array.from(
      new Set([...profile.weakSkills, ...weakSkills]),
    );
    profile.strongSkills = Array.from(
      new Set([...profile.strongSkills, ...strongSkills]),
    );

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
