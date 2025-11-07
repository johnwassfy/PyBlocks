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

  // 🧠 Step-based learning (NEW)
  @Prop({
    type: [
      {
        title: { type: String, required: true },
        instructions: { type: String, required: true },
        starterCode: { type: String },
        expectedOutput: { type: String },
        testCases: [
          {
            input: { type: String },
            expectedOutput: { type: String },
          },
        ],
        concepts: [String], // what concepts this step reinforces
        hints: [String],
        aiCheckpoints: { type: Boolean, default: true }, // whether AI should analyze after this step
        xpReward: { type: Number, default: 5 },
      },
    ],
    default: [],
  })
  steps: {
    title: string;
    instructions: string;
    starterCode?: string;
    expectedOutput?: string;
    testCases?: { input: string; expectedOutput: string }[];
    concepts?: string[];
    hints?: string[];
    aiCheckpoints?: boolean;
    xpReward?: number;
  }[];

  @Prop({ type: Object })
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];

  // ⚙️ Config for adaptive / AI behavior
  @Prop({ type: Object })
  config?: {
    maxAttempts?: number;
    timeLimit?: number;
    aiWeighting?: number;
    adaptiveHints?: boolean;
    prerequisiteMissions?: string[];
    conceptWeights?: Record<string, number>;
    difficultyScaling?: {
      enabled: boolean;
      minScore?: number;
      maxScore?: number;
    };
    allowSkipSteps?: boolean; // whether kid can jump ahead
  };

  // 🧠 Concept tracking
  @Prop({ type: [String], default: [] })
  concepts: string[];

  // 📈 Analytics
  @Prop({ type: Object })
  analytics?: {
    totalAttempts?: number;
    successRate?: number;
    averageScore?: number;
    averageTimeSpent?: number;
    lastUpdated?: Date;
    averageStepsCompleted?: number; // how many steps kids typically finish
  };

  // 🧾 Integrity / anti-cheat
  @Prop({ type: Object })
  validationRules?: {
    disallowHardcodedOutput?: boolean; // prevents print("expectedOutput")
    requiredConcepts?: string[]; // must use these code elements
    forbiddenPatterns?: string[]; // banned solutions
  };
}

export const MissionSchema = SchemaFactory.createForClass(Mission);
