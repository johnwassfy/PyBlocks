import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProgressDocument = Progress & Document;

@Schema({
  timestamps: true,
  optimisticConcurrency: true, // Enable version control for concurrent updates
})
export class Progress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Map, of: Number, default: {} })
  conceptMastery: Map<string, number>;

  @Prop({ type: [String], default: [] })
  weakConcepts: string[];

  @Prop({ type: [String], default: [] })
  strongConcepts: string[];

  @Prop({ type: [String], default: [] })
  completedConcepts: string[];

  @Prop({ default: 0 })
  totalMissionsCompleted: number;

  @Prop({ default: 0 })
  totalTimeSpent: number;

  @Prop({ default: 0 })
  averageScore: number;

  @Prop({ type: Date })
  lastUpdated: Date;
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);
