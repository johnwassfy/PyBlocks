import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GamificationDocument = Gamification & Document;

@Schema({ timestamps: true })
export class Gamification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 1 })
  level: number;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ type: [Object], default: [] })
  achievements: {
    name: string;
    description: string;
    unlockedAt: Date;
  }[];

  @Prop({ default: 0 })
  streak: number;

  @Prop({ type: Date })
  lastActiveDate?: Date;
}

export const GamificationSchema = SchemaFactory.createForClass(Gamification);
