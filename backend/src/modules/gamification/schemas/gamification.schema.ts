import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Achievement, AchievementSchema } from './achievement.schema';

export type GamificationDocument = Gamification & Document;

@Schema({ timestamps: true })
export class Gamification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // 💎 XP & Level (SINGLE SOURCE OF TRUTH)
  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 1 })
  level: number;

  // 🏆 Achievements (Rich structure with unlock dates)
  @Prop({ type: [AchievementSchema], default: [] })
  achievements: Achievement[];

  // 🔥 Daily Streak Tracking
  @Prop({ default: 0 })
  streak: number;

  @Prop({ type: Date })
  lastActiveDate?: Date;

  // ✅ Mission Completion Tracking (prevents duplicate XP)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Mission' }], default: [] })
  completedMissions: Types.ObjectId[];

  // 📊 Additional Stats
  @Prop({ default: 0 })
  totalMissionsCompleted: number;

  @Prop({ default: 0 })
  perfectScoreCount: number; // Count of missions with 100% score

  @Prop({ default: 0 })
  firstTrySuccessCount: number; // Missions completed on first attempt

  @Prop({ default: 0 })
  hintsUsedTotal: number; // Track total hints used

  @Prop({ default: 0 })
  totalTimeSpentMinutes: number; // Total learning time
}

export const GamificationSchema = SchemaFactory.createForClass(Gamification);
