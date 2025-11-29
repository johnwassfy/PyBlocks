import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Gamification,
  GamificationDocument,
} from './schemas/gamification.schema';
import { Achievement } from '../achievements/schemas/achievement.schema';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @InjectModel(Gamification.name)
    private gamificationModel: Model<GamificationDocument>,
    @InjectModel(Achievement.name)
    private achievementModel: Model<any>,
  ) { }

  /**
   * 🎯 Award XP for completing a mission (only once per mission)
   * Returns { awarded: boolean, xpGained: number, newLevel: number }
   */
  async awardMissionXP(
    userId: string,
    missionId: string,
    xpAmount: number,
    isSuccessful: boolean,
    attempts: number = 1,
    timeSpentMinutes: number = 0,
  ): Promise<{
    awarded: boolean;
    xpGained: number;
    newLevel: number;
    leveledUp: boolean;
    newAchievements: Achievement[];
  }> {
    this.logger.log(
      `🏆 [GAMIFICATION] Award XP called - User: ${userId}, Mission: ${missionId}, XP: ${xpAmount}, Success: ${isSuccessful}`,
    );

    const gamification = await this.getOrCreateGamification(userId);
    const missionObjectId = new Types.ObjectId(missionId);

    // Check if mission already completed
    const alreadyCompleted = gamification.completedMissions.some(
      (id) => id.toString() === missionObjectId.toString(),
    );

    if (alreadyCompleted) {
      this.logger.warn(
        `⚠️ [GAMIFICATION] Mission already completed - skipping XP award`,
      );
      return {
        awarded: false,
        xpGained: 0,
        newLevel: gamification.level,
        leveledUp: false,
        newAchievements: [],
      };
    }

    // Award XP only if successful
    if (!isSuccessful) {
      this.logger.warn(
        `⚠️ [GAMIFICATION] Mission not successful - skipping XP award`,
      );
      return {
        awarded: false,
        xpGained: 0,
        newLevel: gamification.level,
        leveledUp: false,
        newAchievements: [],
      };
    }

    this.logger.log(
      `✅ [GAMIFICATION] Awarding XP and marking mission as completed`,
    );

    // Mark mission as completed
    gamification.completedMissions.push(missionObjectId);
    gamification.totalMissionsCompleted += 1;

    // Track first-try success
    if (attempts === 1) {
      gamification.firstTrySuccessCount += 1;
    }

    // Track time spent
    gamification.totalTimeSpentMinutes += timeSpentMinutes;

    // Award XP
    const oldLevel = gamification.level;
    gamification.xp += xpAmount;
    gamification.level = Math.floor(gamification.xp / 100) + 1;
    const leveledUp = gamification.level > oldLevel;

    this.logger.log(
      `💾 [GAMIFICATION] Saving gamification data - XP: ${gamification.xp}, Level: ${gamification.level}`,
    );
    await gamification.save();
    this.logger.log(`✅ [GAMIFICATION] Gamification data saved successfully`);

    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, gamification, {
      isFirstTry: attempts === 1,
      timeSpentMinutes,
    });

    this.logger.log(
      `🎉 [GAMIFICATION] XP awarded successfully - ${xpAmount} XP, Level: ${gamification.level}, Achievements: ${newAchievements.length}`,
    );

    return {
      awarded: true,
      xpGained: xpAmount,
      newLevel: gamification.level,
      leveledUp,
      newAchievements,
    };
  }

  /**
   * ✅ Check if mission is already completed
   */
  async isMissionCompleted(
    userId: string,
    missionId: string,
  ): Promise<boolean> {
    const gamification = await this.gamificationModel
      .findOne({ userId })
      .exec();
    if (!gamification) return false;

    return gamification.completedMissions.some(
      (id) => id.toString() === missionId,
    );
  }

  /**
   * 🔥 Update daily streak
   */
  async updateStreak(userId: string): Promise<{
    streak: number;
    newAchievements: Achievement[];
  }> {
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
      // If diffDays === 0, same day - don't change streak
    } else {
      gamification.streak = 1;
    }

    gamification.lastActiveDate = today;
    await gamification.save();

    // Check for streak achievements
    const newAchievements = await this.checkStreakAchievements(
      userId,
      gamification.streak,
    );

    return {
      streak: gamification.streak,
      newAchievements,
    };
  }

  /**
   * 🏆 Check and award all applicable achievements
   */
  async checkAchievements(
    userId: string,
    gamification: GamificationDocument,
    context?: {
      isFirstTry?: boolean;
      timeSpentMinutes?: number;
      isPerfectScore?: boolean;
      isHardDifficulty?: boolean;
      hintsUsed?: number;
    },
  ): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    // Mission-based thresholds. We expect canonical achievement documents
    // in the achievements collection to include a `category: 'mission'` and
    // a numeric `target` field (e.g., target: 5 for 5 missions).
    const missionThresholds = [1, 5, 10, 20, 50, 100];
    for (const threshold of missionThresholds) {
      if (gamification.totalMissionsCompleted >= threshold) {
        const def = await this.achievementModel.findOne({ category: 'mission', target: threshold }).exec();
        if (def) {
          const unlocked = await this.unlockAchievement(userId, String(def._id));
          if (unlocked) newAchievements.push(unlocked);
        }
      }
    }

    // XP-based thresholds
    const xpThresholds = [100, 500, 1000, 2500, 5000];
    for (const threshold of xpThresholds) {
      if (gamification.xp >= threshold) {
        const def = await this.achievementModel.findOne({ category: 'xp', target: threshold }).exec();
        if (def) {
          const unlocked = await this.unlockAchievement(userId, String(def._id));
          if (unlocked) newAchievements.push(unlocked);
        }
      }
    }

    // Context-based and special achievements: Look them up by category and specific criteria.
    // These achievements must exist in the DB with proper category tags.
    if (context?.isFirstTry) {
      const def = await this.achievementModel.findOne({ category: 'mastery', name: /One Shot Wonder/i }).exec();
      if (def) {
        const unlocked = await this.unlockAchievement(userId, String(def._id));
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    if (context?.isPerfectScore && gamification.perfectScoreCount >= 10) {
      const def = await this.achievementModel.findOne({ category: 'mastery', name: /Perfect Ten/i }).exec();
      if (def) {
        const unlocked = await this.unlockAchievement(userId, String(def._id));
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    if (context?.isHardDifficulty && context?.hintsUsed === 0) {
      const def = await this.achievementModel.findOne({ category: 'mastery', name: /Brain Power/i }).exec();
      if (def) {
        const unlocked = await this.unlockAchievement(userId, String(def._id));
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    if (context?.timeSpentMinutes && context.timeSpentMinutes < 2) {
      const def = await this.achievementModel.findOne({ category: 'speed', name: /Speed Demon/i }).exec();
      if (def) {
        const unlocked = await this.unlockAchievement(userId, String(def._id));
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    // Time-based achievements
    const currentHour = new Date().getHours();
    if (currentHour >= 21 || currentHour < 6) {
      const def = await this.achievementModel.findOne({ category: 'special', name: /Night Owl/i }).exec();
      if (def) {
        const unlocked = await this.unlockAchievement(userId, String(def._id));
        if (unlocked) newAchievements.push(unlocked);
      }
    } else if (currentHour < 7) {
      const def = await this.achievementModel.findOne({ category: 'special', name: /Early Bird/i }).exec();
      if (def) {
        const unlocked = await this.unlockAchievement(userId, String(def._id));
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    return newAchievements;
  }

  /**
   * 🔥 Check streak-based achievements
   */
  async checkStreakAchievements(
    userId: string,
    streak: number,
  ): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    const streakThresholds = [3, 7, 14, 30, 100];
    for (const threshold of streakThresholds) {
      if (streak >= threshold) {
        const def = await this.achievementModel.findOne({ category: 'streak', target: threshold }).exec();
        if (def) {
          const unlocked = await this.unlockAchievement(userId, String(def._id));
          if (unlocked) newAchievements.push(unlocked);
        }
      }
    }

    return newAchievements;
  }

  /**
   * 🏆 Unlock a specific achievement
   */
  async unlockAchievement(
    userId: string,
    achievementId: string,
  ): Promise<Achievement | null> {
    const gamification = await this.getOrCreateGamification(userId);

    // Locate the canonical achievement by MongoDB _id
    if (!Types.ObjectId.isValid(achievementId)) {
      this.logger.warn(`Invalid achievement ID: ${achievementId}`);
      return null;
    }

    const definition = await this.achievementModel.findById(achievementId).exec();
    if (!definition) {
      this.logger.warn(`Achievement not found: ${achievementId}`);
      return null;
    }

    // Check if already unlocked by achievementId reference
    const achievementObjectId = new Types.ObjectId(achievementId);
    const alreadyUnlocked = gamification.achievements.some(
      (a: any) => a.achievementId && a.achievementId.toString() === achievementObjectId.toString(),
    );
    if (alreadyUnlocked) return null;

    // Create UserAchievement subdocument with achievementId reference and unlockedAt
    const userAchievement = {
      achievementId: achievementObjectId,
      unlockedAt: new Date(),
    };

    gamification.achievements.push(userAchievement as any);
    await gamification.save();

    // Return the full canonical achievement data for response
    return definition;
  }

  /**
   * 📊 Get gamification stats
   */
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

  /**
   * 📈 Get user stats summary
   */
  async getUserStats(userId: string): Promise<any> {
    const gamification = await this.getOrCreateGamification(userId);

    return {
      xp: gamification.xp,
      level: gamification.level,
      streak: gamification.streak,
      totalMissionsCompleted: gamification.totalMissionsCompleted,
      achievements: gamification.achievements,
      achievementCount: gamification.achievements.length,
      completedMissions: gamification.completedMissions,
      stats: {
        perfectScoreCount: gamification.perfectScoreCount,
        firstTrySuccessCount: gamification.firstTrySuccessCount,
        totalTimeSpentMinutes: gamification.totalTimeSpentMinutes,
      },
    };
  }

  /**
   * 🗑️ Delete gamification data (for account deletion)
   */
  async delete(userId: string): Promise<void> {
    await this.gamificationModel.deleteOne({ userId }).exec();
  }
}
