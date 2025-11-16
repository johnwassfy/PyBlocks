import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Gamification,
  GamificationDocument,
} from './schemas/gamification.schema';
import {
  ACHIEVEMENT_DEFINITIONS,
  Achievement,
} from './schemas/achievement.schema';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);
  
  constructor(
    @InjectModel(Gamification.name)
    private gamificationModel: Model<GamificationDocument>,
  ) {}

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
    this.logger.log(`🏆 [GAMIFICATION] Award XP called - User: ${userId}, Mission: ${missionId}, XP: ${xpAmount}, Success: ${isSuccessful}`);
    
    const gamification = await this.getOrCreateGamification(userId);
    const missionObjectId = new Types.ObjectId(missionId);

    // Check if mission already completed
    const alreadyCompleted = gamification.completedMissions.some(
      (id) => id.toString() === missionObjectId.toString(),
    );

    if (alreadyCompleted) {
      this.logger.warn(`⚠️ [GAMIFICATION] Mission already completed - skipping XP award`);
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
      this.logger.warn(`⚠️ [GAMIFICATION] Mission not successful - skipping XP award`);
      return {
        awarded: false,
        xpGained: 0,
        newLevel: gamification.level,
        leveledUp: false,
        newAchievements: [],
      };
    }

    this.logger.log(`✅ [GAMIFICATION] Awarding XP and marking mission as completed`);
    
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

    this.logger.log(`💾 [GAMIFICATION] Saving gamification data - XP: ${gamification.xp}, Level: ${gamification.level}`);
    await gamification.save();
    this.logger.log(`✅ [GAMIFICATION] Gamification data saved successfully`);

    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, gamification, {
      isFirstTry: attempts === 1,
      timeSpentMinutes,
    });

    this.logger.log(`🎉 [GAMIFICATION] XP awarded successfully - ${xpAmount} XP, Level: ${gamification.level}, Achievements: ${newAchievements.length}`);

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

    // Mission-based achievements
    const missionAchievements = [
      { id: 'first_mission', threshold: 1 },
      { id: 'five_missions', threshold: 5 },
      { id: 'ten_missions', threshold: 10 },
      { id: 'twenty_missions', threshold: 20 },
      { id: 'fifty_missions', threshold: 50 },
      { id: 'hundred_missions', threshold: 100 },
    ];

    for (const achievement of missionAchievements) {
      if (gamification.totalMissionsCompleted >= achievement.threshold) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    // XP-based achievements
    const xpAchievements = [
      { id: 'xp_100', threshold: 100 },
      { id: 'xp_500', threshold: 500 },
      { id: 'xp_1000', threshold: 1000 },
      { id: 'xp_2500', threshold: 2500 },
      { id: 'xp_5000', threshold: 5000 },
    ];

    for (const achievement of xpAchievements) {
      if (gamification.xp >= achievement.threshold) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) newAchievements.push(unlocked);
      }
    }

    // Context-based achievements
    if (context?.isFirstTry) {
      const unlocked = await this.unlockAchievement(userId, 'first_try');
      if (unlocked) newAchievements.push(unlocked);
    }

    if (context?.isPerfectScore && gamification.perfectScoreCount >= 10) {
      const unlocked = await this.unlockAchievement(userId, 'perfect_ten');
      if (unlocked) newAchievements.push(unlocked);
    }

    if (context?.isHardDifficulty && context?.hintsUsed === 0) {
      const unlocked = await this.unlockAchievement(userId, 'no_hints');
      if (unlocked) newAchievements.push(unlocked);
    }

    if (context?.timeSpentMinutes && context.timeSpentMinutes < 2) {
      const unlocked = await this.unlockAchievement(userId, 'speed_demon');
      if (unlocked) newAchievements.push(unlocked);
    }

    // Time-based achievements
    const currentHour = new Date().getHours();
    if (currentHour >= 21 || currentHour < 6) {
      const unlocked = await this.unlockAchievement(userId, 'night_owl');
      if (unlocked) newAchievements.push(unlocked);
    } else if (currentHour < 7) {
      const unlocked = await this.unlockAchievement(userId, 'early_bird');
      if (unlocked) newAchievements.push(unlocked);
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
    const streakAchievements = [
      { id: 'streak_3', threshold: 3 },
      { id: 'streak_7', threshold: 7 },
      { id: 'streak_14', threshold: 14 },
      { id: 'streak_30', threshold: 30 },
      { id: 'streak_100', threshold: 100 },
    ];

    for (const achievement of streakAchievements) {
      if (streak >= achievement.threshold) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) newAchievements.push(unlocked);
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

    // Check if already unlocked
    const alreadyUnlocked = gamification.achievements.some(
      (a) => a.id === achievementId,
    );
    if (alreadyUnlocked) return null;

    // Find achievement definition
    const definition = ACHIEVEMENT_DEFINITIONS.find(
      (a) => a.id === achievementId,
    );
    if (!definition) return null;

    // Unlock achievement
    const achievement = {
      ...definition,
      unlockedAt: new Date(),
    };

    gamification.achievements.push(achievement);
    await gamification.save();

    return achievement;
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
}
