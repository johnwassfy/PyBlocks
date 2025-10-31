import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatbotConversationDocument = ChatbotConversation & Document;

class ChatInteraction {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  response: string;

  @Prop()
  promptId?: string;

  @Prop()
  hintType: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Object })
  difficultyAnalysis?: {
    difficultConcepts: string[];
    easyConcepts: string[];
    questionPatterns: string[];
    helpFrequency: string;
  };

  @Prop()
  code?: string;

  @Prop()
  errorMessage?: string;
}

@Schema({ timestamps: true })
export class ChatbotConversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Mission', required: true })
  missionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Submission' })
  submissionId?: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  conversations: ChatInteraction[];

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ type: [String], default: [] })
  difficultConcepts: string[];

  @Prop({ type: [String], default: [] })
  easyConcepts: string[];

  @Prop({ default: 'low' })
  helpFrequency: string;

  @Prop()
  lastUpdated: Date;

  @Prop({ type: [String], default: [] })
  questionPatterns: string[];
}

export const ChatbotConversationSchema =
  SchemaFactory.createForClass(ChatbotConversation);
