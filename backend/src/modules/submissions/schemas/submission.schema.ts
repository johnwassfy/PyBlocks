import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Mission', required: true })
  missionId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop()
  output?: string;

  @Prop()
  feedback?: string;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 1 })
  attempts: number;

  @Prop({ default: 0 })
  timeSpent: number;

  @Prop({ default: false })
  isSuccessful: boolean;

  @Prop({ type: [String], default: [] })
  detectedConcepts: string[];

  @Prop({ type: Object })
  aiAnalysis?: {
    weaknesses: string[];
    strengths: string[];
    suggestions: string[];
  };
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
