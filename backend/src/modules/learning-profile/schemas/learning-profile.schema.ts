import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LearningProfileDocument = LearningProfile &
  Document & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class LearningProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // One profile per user

  // --- 🧩 Learning Behavior ---
  @Prop({ default: null })
  codingExperience: 'none' | 'beginner' | 'intermediate';

  @Prop({ default: null })
  pythonFamiliarity: 'none' | 'some' | 'comfortable';

  @Prop({ type: [String], default: [] })
  knownConcepts: string[]; // ['loops', 'variables', etc.]

  @Prop({ type: [String], default: [] })
  weakSkills: string[];

  @Prop({ type: [String], default: [] })
  strongSkills: string[];

  // --- 🎯 Progress Tracking ---
  // Note: completedMissions now tracked in Gamification collection
  @Prop({ default: 0 })
  totalSubmissions: number;

  @Prop({ default: 0 })
  successfulSubmissions: number;

  @Prop({ default: 0 })
  avgAccuracy: number; // overall score performance (0–100)

  // Note: xp, level, and badges are now tracked in Gamification collection
  // Use populate('gamification') to access these fields

  // --- 🧠 AI Adaptivity Data ---
  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  skillScores: Record<string, number>; // { loops: 0.7, conditionals: 0.4 }

  // --- 🧩 Meta Info ---
  @Prop()
  lastActive?: Date;
}

export const LearningProfileSchema =
  SchemaFactory.createForClass(LearningProfile);
