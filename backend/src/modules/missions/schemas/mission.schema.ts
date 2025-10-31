import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MissionDocument = Mission & Document;

@Schema({ timestamps: true })
export class Mission {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  starterCode?: string;

  @Prop()
  expectedOutput?: string;

  @Prop({ default: 'easy' })
  difficulty: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  objectives: string[];

  @Prop({ type: [String], default: [] })
  hints: string[];

  @Prop({ default: 10 })
  xpReward: number;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  estimatedTime?: number;

  @Prop({ type: Object })
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];

  // Flexible configuration for adaptive features
  @Prop({ type: Object })
  config?: {
    maxAttempts?: number; // Maximum submission attempts allowed
    timeLimit?: number; // Time limit in minutes
    aiWeighting?: number; // How much AI feedback affects scoring (0-1)
    adaptiveHints?: boolean; // Enable adaptive hint system
    prerequisiteMissions?: string[]; // Required missions before this one
    conceptWeights?: Record<string, number>; // Weight of each concept
    difficultyScaling?: {
      // Adaptive difficulty adjustment
      enabled: boolean;
      minScore?: number;
      maxScore?: number;
    };
  };

  // Concept tracking for adaptive learning
  @Prop({ type: [String], default: [] })
  concepts: string[]; // Programming concepts covered (loops, functions, etc.)

  // Analytics metadata
  @Prop({ type: Object })
  analytics?: {
    totalAttempts?: number;
    successRate?: number;
    averageScore?: number;
    averageTimeSpent?: number;
    lastUpdated?: Date;
  };
}

export const MissionSchema = SchemaFactory.createForClass(Mission);
