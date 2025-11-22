import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AchievementDocument = Achievement &
  Document & {
    _id: Types.ObjectId;
  };

@Schema()
export class Achievement {
  @Prop({ required: true })
  name: string; // e.g., "First Steps 🐣"

  @Prop({ required: true })
  description: string; // e.g., "Complete your very first mission!"

  @Prop({ required: true })
  icon: string; // emoji or icon identifier

  @Prop({ required: true, enum: ['common', 'rare', 'epic', 'legendary'] })
  rarity: string;

  @Prop({ required: true })
  category: string; // 'xp', 'streak', 'mission', 'speed', 'mastery', 'special'

  @Prop()
  target?: number; // Numeric target for progress-based achievements (e.g., 100 for xp_100, 5 for five_missions)
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);

/**
 * UserAchievement: Lightweight reference stored in user's gamification.achievements array.
 * Only stores the canonical achievement _id and unlock timestamp.
 */
@Schema({ _id: false })
export class UserAchievement {
  @Prop({ type: Types.ObjectId, ref: 'Achievement', required: true })
  achievementId: Types.ObjectId; // Reference to canonical Achievement document

  @Prop({ required: true })
  unlockedAt: Date;
}

export const UserAchievementSchema = SchemaFactory.createForClass(UserAchievement);
// NOTE: ACHIEVEMENT_DEFINITIONS removed — canonical achievement definitions
// should be stored in the database (achievements collection) and queried
// by services that need them. Keep the schema/class for typing and
// subdocument use.
