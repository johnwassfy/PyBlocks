import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MissionDocument = Mission & Document;

// ⚙️ Toolbox filtering configuration
export enum ToolboxCategoryName {
  VARIABLES = 'VARIABLES',
  DECISIONS = 'DECISIONS',
  ITERATION = 'ITERATION',
  FUNCTIONS = 'FUNCTIONS',
  CALCULATIONS = 'CALCULATIONS',
  OUTPUT_WITH_PLOTTING = 'OUTPUT_WITH_PLOTTING',
  INPUT = 'INPUT',
  TURTLES = 'TURTLES',
  VALUES = 'VALUES',
  CONVERSIONS = 'CONVERSIONS',
  LISTS = 'LISTS',
  DICTIONARIES = 'DICTIONARIES',
}

export interface ToolboxCategoryFilter {
  name: ToolboxCategoryName;
  allowedBlocks?: string[]; // specific block code strings to allow; if empty/undefined, all blocks in category are allowed
}

export interface ToolboxConfig {
  mode: 'full' | 'restrict' | 'hide'; // 'full': all blocks, 'restrict': only specified categories, 'hide': empty toolbox
  categories?: ToolboxCategoryFilter[]; // only used if mode is 'restrict'
}

@Schema({ timestamps: true })
export class Mission {
  /** 🎯 General mission info */
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  starterCode?: string;

  @Prop()
  expectedOutput?: string;

  @Prop({ default: 'easy', enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @Prop({ default: 1 })
  difficultyLevel: number; // for numeric scaling (1–10)

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  objectives: string[];

  @Prop({ default: 10 })
  xpReward: number;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  estimatedTime?: number; // in minutes

  /** 🧠 Step-based learning (NEW STRUCTURE) */
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
        concepts: [String], // e.g. ['loops', 'variables']
        hints: [String],
        aiCheckpoint: { type: Boolean, default: true }, // trigger AI after this step
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
    aiCheckpoint?: boolean;
    xpReward?: number;
  }[];

  /** 🧪 Final validation (end-of-mission tests) */
  @Prop({ type: Object })
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];

  /** ⚙️ Adaptive AI behavior config */
  @Prop({ type: Object })
  config?: {
    maxAttempts?: number;
    timeLimit?: number; // minutes
    aiWeighting?: number; // how much AI feedback affects score
    adaptiveHints?: boolean;
    prerequisiteMissions?: string[];
    conceptWeights?: Record<string, number>;
    difficultyScaling?: {
      enabled: boolean;
      minScore?: number;
      maxScore?: number;
    };
    allowSkipSteps?: boolean; // let kids jump to next steps manually
    allowRetryHints?: boolean; // whether hint use reduces XP
  };

  /** 📚 Concepts (for learning tracking) */
  @Prop({ type: [String], default: [] })
  concepts: string[];

  /** 📈 Analytics and learning insights */
  @Prop({ type: Object })
  analytics?: {
    totalAttempts?: number;
    successRate?: number;
    averageScore?: number;
    averageTimeSpent?: number;
    averageStepsCompleted?: number;
    lastUpdated?: Date;
  };

  /** 🔒 Validation and integrity rules */
  @Prop({ type: Object })
  validationRules?: {
    disallowHardcodedOutput?: boolean;
    requiredConcepts?: string[];
    forbiddenPatterns?: string[];
    requireExactOutput?: boolean;
  };

  /** 🧰 Toolbox visibility and block filtering per mission */
  @Prop({
    type: {
      mode: {
        type: String,
        enum: ['full', 'restrict', 'hide'],
        default: 'full',
      },
      categories: [
        {
          name: {
            type: String,
            enum: Object.values(ToolboxCategoryName),
          },
          allowedBlocks: [String], // block code strings to allow (optional; if empty, all blocks in category are allowed)
        },
      ],
    },
    default: { mode: 'full' },
  })
  toolboxConfig?: ToolboxConfig;
}

export const MissionSchema = SchemaFactory.createForClass(Mission);
