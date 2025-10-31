import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Gamification,
  GamificationDocument,
} from './schemas/gamification.schema';
import { LearningProfileService } from '../learning-profile/learning-profile.service';

@Injectable()
export class GamificationService {
  constructor(
    @InjectModel(Gamification.name)
    private gamificationModel: Model<GamificationDocument>,
    private learningProfileService: LearningProfileService,
  ) {}

  async awardXp(
    userId: string,
    xpAmount: number,
  ): Promise<GamificationDocument> {
    let gamification = await this.gamificationModel.findOne({ userId }).exec();

    if (!gamification) {
      gamification = new this.gamificationModel({ userId });
    }

    gamification.xp += xpAmount;

    // Level up logic: every 100 XP = 1 level
    const oldLevel = gamification.level;
    gamification.level = Math.floor(gamification.xp / 100) + 1;

    await gamification.save();

    // Update learning profile's XP and level
    await this.learningProfileService.addXP(new Types.ObjectId(userId), xpAmount);

    // Check for level-up achievements
    if (gamification.level > oldLevel) {
      await this.checkLevelAchievements(userId, gamification.level);
    }

    return gamification;
  }

  async awardBadge(userId: string, badgeName: string): Promise<void> {
    let gamification = await this.gamificationModel.findOne({ userId }).exec();

    if (!gamification) {
      gamification = new this.gamificationModel({ userId });
    }

    if (!gamification.badges.includes(badgeName)) {
      gamification.badges.push(badgeName);
      await gamification.save();
      await this.learningProfileService.addBadge(new Types.ObjectId(userId), badgeName);
    }
  }

  async updateStreak(userId: string): Promise<void> {
    const gamification = await this.getOrCreateGamification(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (gamification.lastActiveDate) {
      const lastActive = new Date(gamification.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        gamification.streak += 1;
      } else if (diffDays > 1) {
        gamification.streak = 1;
      }
    } else {
      gamification.streak = 1;
    }

    gamification.lastActiveDate = today;
    await gamification.save();

    // Check for streak achievements
    if (gamification.streak === 7) {
      await this.awardBadge(userId, '7-Day Streak');
    } else if (gamification.streak === 30) {
      await this.awardBadge(userId, '30-Day Streak');
    }
  }

  async getOrCreateGamification(userId: string): Promise<GamificationDocument> {
    let gamification = await this.gamificationModel.findOne({ userId }).exec();
    if (!gamification) {
      gamification = new this.gamificationModel({ userId });
      await gamification.save();
    }
    return gamification;
  }

  async getGamification(userId: string): Promise<GamificationDocument | null> {
    return this.gamificationModel.findOne({ userId }).exec();
  }

  private async checkLevelAchievements(
    userId: string,
    level: number,
  ): Promise<void> {
    if (level === 5) {
      await this.awardBadge(userId, 'Rookie Coder');
    } else if (level === 10) {
      await this.awardBadge(userId, 'Junior Developer');
    } else if (level === 20) {
      await this.awardBadge(userId, 'Python Master');
    }
  }
}
