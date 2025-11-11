import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionLogDocument = SubmissionLog & Document;

/**
 * Comprehensive Analytics Schema for Thesis Research
 * Tracks all AI interactions and student performance metrics
 * Data is anonymized for research publication
 */
@Schema({ timestamps: true })
export class SubmissionLog {
  // ========== Student Identification (Anonymized) ==========
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true }) // Anonymized student ID (e.g., "STUDENT_001")
  anonymizedUserId: string;

  // ========== Mission Tracking ==========
  @Prop({ type: Types.ObjectId, ref: 'Mission', required: true, index: true })
  missionId: Types.ObjectId;

  @Prop({ required: true })
  missionTitle: string;

  @Prop({ required: true })
  missionDifficulty: string; // beginner, intermediate, advanced

  @Prop({ type: [String], default: [] })
  missionConcepts: string[]; // e.g., ['loops', 'variables']

  // ========== AI Model Tracking ==========
  @Prop({ required: true, index: true })
  aiModel: string; // e.g., "glm-4.5-air", "minimax-m2", "polaris-alpha"

  @Prop({ required: true })
  aiProvider: string; // e.g., "z-ai", "minimax", "tng"

  @Prop({ default: '' })
  modelVersion: string; // For tracking model updates

  // ========== Submission Performance ==========
  @Prop({ required: true })
  success: boolean;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 1 })
  attempts: number;

  @Prop({ default: 0 })
  timeSpent: number; // seconds

  @Prop({ default: 0 })
  codeLength: number; // characters

  @Prop({ default: 0 })
  codeLines: number;

  // ========== AI Interaction Metrics ==========
  @Prop({ default: 0 })
  aiHintsRequested: number; // Student explicitly requested hints

  @Prop({ default: 0 })
  aiHintsProvided: number; // Total hints given

  @Prop({ default: 0 })
  aiProactiveHelp: number; // AI initiated help (idle detection, error patterns)

  @Prop({ default: 0 })
  chatbotInteractions: number; // Number of chatbot messages

  @Prop({ default: 0 })
  aiResponseTime: number; // milliseconds - AI service latency

  // ========== Learning Analytics ==========
  @Prop({ type: [String], default: [] })
  detectedConcepts: string[]; // Concepts identified in code

  @Prop({ type: [String], default: [] })
  weakConcepts: string[]; // Areas needing improvement

  @Prop({ type: [String], default: [] })
  strongConcepts: string[]; // Mastered concepts

  @Prop({ type: [String], default: [] })
  errorsEncountered: string[]; // Syntax/runtime errors

  // ========== AI Feedback Quality ==========
  @Prop({ default: '' })
  feedbackProvided: string; // Main AI feedback message

  @Prop({ default: 0 })
  feedbackLength: number; // characters

  @Prop({ type: [String], default: [] })
  hintsProvided: string[]; // Actual hint messages

  @Prop({ type: [String], default: [] })
  suggestionsProvided: string[]; // AI suggestions

  // ========== Student Behavior Patterns ==========
  @Prop({ default: 0 })
  idleTimeBeforeSubmission: number; // seconds of inactivity

  @Prop({ default: false })
  usedStarterCode: boolean;

  @Prop({ default: false })
  receivedProactiveIntervention: boolean;

  @Prop({ default: '' })
  interventionReason: string; // e.g., "idle_timeout", "repeated_errors"

  // ========== Test Case Results ==========
  @Prop({ default: 0 })
  totalTestCases: number;

  @Prop({ default: 0 })
  passedTestCases: number;

  @Prop({ default: 0 })
  failedTestCases: number;

  @Prop({ type: Object, default: {} })
  testCaseDetails: Record<string, any>; // Detailed test results

  // ========== Learning State Tracking ==========
  @Prop({ default: '' })
  learningState: string; // e.g., "struggling", "progressing", "excelling"

  @Prop({ default: 0 })
  confidenceLevel: number; // 0-100

  @Prop({ default: 0 })
  frustrationLevel: number; // 0-100

  // ========== Session Information ==========
  @Prop({ default: '' })
  sessionId: string; // To group related submissions

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: 0 })
  sessionDuration: number; // Total time in this learning session

  // ========== Research Metadata ==========
  @Prop({ default: '' })
  experimentGroup: string; // For A/B testing different AI models

  @Prop({ type: Object, default: {} })
  additionalMetrics: Record<string, any>; // Extensible for future metrics
}

export const SubmissionLogSchema =
  SchemaFactory.createForClass(SubmissionLog);

// Indexes for efficient querying
SubmissionLogSchema.index({ aiModel: 1, success: 1 });
SubmissionLogSchema.index({ timestamp: -1 });
SubmissionLogSchema.index({ anonymizedUserId: 1, timestamp: -1 });
SubmissionLogSchema.index({ missionId: 1, aiModel: 1 });
