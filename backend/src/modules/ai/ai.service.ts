import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { LearningStateUpdateDto } from './dto/learning-state-update.dto';
import { ChatbotInteractionDto } from './dto/chatbot-interaction.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Progress,
  ProgressDocument,
} from '../progress/schemas/progress.schema';
import {
  Submission,
  SubmissionDocument,
} from '../submissions/schemas/submission.schema';
import {
  ChatbotConversation,
  ChatbotConversationDocument,
} from '../chatbot/schemas/chatbot-conversation.schema';
import { LearningProfileService } from '../learning-profile/learning-profile.service';

@Injectable()
export class AiService {
  private aiServiceUrl: string;
  private aiServiceApiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private learningProfileService: LearningProfileService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(ChatbotConversation.name)
    private conversationModel: Model<ChatbotConversationDocument>,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('ai.serviceUrl') ||
      'http://localhost:8000';
    this.aiServiceApiKey =
      this.configService.get<string>('AI_SERVICE_API_KEY') || '';
  }

  private getHeaders() {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    // Only add API key if configured
    if (this.aiServiceApiKey) {
      headers['X-API-Key'] = this.aiServiceApiKey;
    }
    return headers;
  }

  async analyzeSubmission(submissionData: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/analyze`,
          {
            code: submissionData.code,
            concepts: submissionData.concepts || [],
            user_id: submissionData.userId || submissionData.user_id,
            mission_id: submissionData.missionId || submissionData.mission_id,
          },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      console.error(
        'AI Service Error:',
        error instanceof Error ? error.message : String(error),
      );
      // Return fallback response if AI service is unavailable
      return {
        feedback: 'Your submission has been received. Keep practicing!',
        status: 'pending',
        encouragement: 'Great effort!',
        hint: null,
        concepts_detected: [],
      };
    }
  }

  async getAdaptiveRecommendations(
    userId: string,
    weakSkills: string[],
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/recommend`,
          {
            user_id: userId,
            weak_skills: weakSkills,
          },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      console.error(
        'AI Recommendation Error:',
        error instanceof Error ? error.message : String(error),
      );
      return {
        recommendations: [],
        adaptive_hints: [],
      };
    }
  }

  async generateHint(missionId: string, currentCode: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/hint`,
          {
            mission_id: missionId,
            code: currentCode,
          },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      console.error(
        'AI Hint Error:',
        error instanceof Error ? error.message : String(error),
      );
      return {
        hint: 'Try breaking down the problem into smaller steps.',
      };
    }
  }

  async updateLearningState(dto: LearningStateUpdateDto): Promise<any> {
    try {
      const { userId, submissionId, analysis } = dto;

      // Validate user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate submission exists
      const submission = await this.submissionModel.findById(submissionId);
      if (!submission) {
        throw new NotFoundException(
          `Submission with ID ${submissionId} not found`,
        );
      }

      // Update submission with AI analysis
      await this.submissionModel.findByIdAndUpdate(submissionId, {
        aiAnalysis: {
          weaknesses: analysis.weaknesses,
          strengths: analysis.strengths,
          suggestions: analysis.suggestions,
        },
        detectedConcepts: analysis.detectedConcepts,
        score: analysis.score,
        isSuccessful: analysis.isSuccessful,
      });

      // Update or create progress document
      let progress = await this.progressModel.findOne({
        userId: new Types.ObjectId(userId),
      });

      if (!progress) {
        progress = await this.progressModel.create({
          userId: new Types.ObjectId(userId),
          conceptMastery: new Map(),
          weakConcepts: [],
          strongConcepts: [],
          completedConcepts: [],
          totalMissionsCompleted: 0,
          totalTimeSpent: 0,
          averageScore: 0,
          lastUpdated: new Date(),
        });
      }

      // Update concept mastery with weighted average
      const conceptMastery = progress.conceptMastery || new Map();
      const weightFactor = 0.3; // New score weight

      for (const [concept, newScore] of Object.entries(
        analysis.conceptScores,
      )) {
        const currentMastery = conceptMastery.get(concept) || 0;
        const updatedMastery = Math.round(
          currentMastery * (1 - weightFactor) + newScore * weightFactor,
        );
        conceptMastery.set(concept, updatedMastery);
      }

      // Classify concepts by mastery level
      const weakConcepts: string[] = [];
      const strongConcepts: string[] = [];
      const completedConcepts: string[] = [];

      conceptMastery.forEach((mastery, concept) => {
        if (mastery < 60) {
          weakConcepts.push(concept);
        } else if (mastery >= 95) {
          completedConcepts.push(concept);
        } else if (mastery >= 80) {
          strongConcepts.push(concept);
        }
      });

      // Update progress document
      await this.progressModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          conceptMastery,
          weakConcepts,
          strongConcepts,
          completedConcepts,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true },
      );

      // Update user's weak and strong skills in LearningProfile
      const weakSkills = Array.from(
        new Set([...weakConcepts, ...analysis.weaknesses]),
      ).slice(0, 10); // Keep top 10

      const strongSkills = Array.from(
        new Set([...strongConcepts, ...analysis.strengths]),
      ).slice(0, 10); // Keep top 10

      // Update LearningProfile with the new skills and submission stats
      await this.learningProfileService.update(new Types.ObjectId(userId), {
        weakSkills,
        strongSkills,
      });

      // Update submission stats in LearningProfile
      // Calculate accuracy as score / 100 (assuming score is 0-100)
      const accuracy = analysis.score || 0;
      await this.learningProfileService.updateSubmissionStats(
        new Types.ObjectId(userId),
        analysis.isSuccessful,
        accuracy,
      );

      return {
        success: true,
        message: 'Learning state updated successfully',
        updates: {
          conceptsUpdated: Object.keys(analysis.conceptScores).length,
          weaknessesIdentified: analysis.weaknesses.length,
          strengthsIdentified: analysis.strengths.length,
          weakConcepts,
          strongConcepts,
          completedConcepts,
        },
      };
    } catch (error: unknown) {
      console.error(
        'Learning State Update Error:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Store chatbot interaction for learning analytics
   * Tracks conversation history and difficulty patterns to improve personalized learning
   */
  async storeChatbotInteraction(dto: ChatbotInteractionDto): Promise<{
    success: boolean;
    message: string;
    analytics: {
      difficultConcepts: string[];
      easyConcepts: string[];
      helpFrequency: string;
      totalQuestions: number;
      conversationQuality: string;
    };
  }> {
    try {
      // 1. Validate user exists
      const user = await this.userModel.findById(dto.userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      // 2. Find or create conversation document
      let conversation = await this.conversationModel.findOne({
        userId: new Types.ObjectId(dto.userId),
        missionId: new Types.ObjectId(dto.missionId),
        ...(dto.submissionId && {
          submissionId: new Types.ObjectId(dto.submissionId),
        }),
      });

      if (!conversation) {
        conversation = new this.conversationModel({
          userId: new Types.ObjectId(dto.userId),
          missionId: new Types.ObjectId(dto.missionId),
          ...(dto.submissionId && {
            submissionId: new Types.ObjectId(dto.submissionId),
          }),
          conversations: [],
          totalQuestions: 0,
          difficultConcepts: [],
          easyConcepts: [],
          helpFrequency: 'low',
          questionPatterns: [],
          lastUpdated: new Date(),
        });
      }

      // 3. Add interaction to conversation history
      conversation.conversations.push({
        question: dto.question,
        response: dto.response,
        promptId: dto.promptId,
        hintType: dto.hintType,
        timestamp: new Date(),
        difficultyAnalysis: dto.difficultyAnalysis,
        code: dto.code,
        errorMessage: dto.errorMessage,
      });

      // 4. Update aggregated analytics
      conversation.totalQuestions = conversation.conversations.length;

      if (dto.difficultyAnalysis) {
        // Merge difficult concepts (remove duplicates)
        const allDifficultConcepts = [
          ...conversation.difficultConcepts,
          ...dto.difficultyAnalysis.difficultConcepts,
        ];
        conversation.difficultConcepts = Array.from(
          new Set(allDifficultConcepts),
        );

        // Merge easy concepts (remove duplicates)
        const allEasyConcepts = [
          ...conversation.easyConcepts,
          ...dto.difficultyAnalysis.easyConcepts,
        ];
        conversation.easyConcepts = Array.from(new Set(allEasyConcepts));

        // Update help frequency
        conversation.helpFrequency = dto.difficultyAnalysis.helpFrequency;

        // Merge question patterns
        const allPatterns = [
          ...conversation.questionPatterns,
          ...dto.difficultyAnalysis.questionPatterns,
        ];
        conversation.questionPatterns = Array.from(new Set(allPatterns));
      }

      conversation.lastUpdated = new Date();

      // 5. Save conversation
      await conversation.save();

      // 6. Determine conversation quality for analytics
      const conversationQuality =
        this.determineConversationQuality(conversation);

      return {
        success: true,
        message: 'Chatbot interaction stored successfully',
        analytics: {
          difficultConcepts: conversation.difficultConcepts,
          easyConcepts: conversation.easyConcepts,
          helpFrequency: conversation.helpFrequency,
          totalQuestions: conversation.totalQuestions,
          conversationQuality,
        },
      };
    } catch (error: unknown) {
      console.error(
        'Store Chatbot Interaction Error:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Determine conversation quality based on interaction patterns
   * Helps identify if student is making progress or needs intervention
   */
  private determineConversationQuality(
    conversation: ChatbotConversationDocument,
  ): string {
    const totalQuestions = conversation.totalQuestions;
    const difficultConcepts = conversation.difficultConcepts.length;
    const easyConcepts = conversation.easyConcepts.length;
    const helpFrequency = conversation.helpFrequency;

    // High quality: Few questions, concepts understood
    if (
      totalQuestions <= 3 &&
      easyConcepts > difficultConcepts &&
      helpFrequency === 'low'
    ) {
      return 'excellent';
    }

    // Good quality: Moderate questions, making progress
    if (
      totalQuestions <= 8 &&
      easyConcepts >= difficultConcepts &&
      helpFrequency !== 'high'
    ) {
      return 'good';
    }

    // Needs support: Many questions, struggling with concepts
    if (
      totalQuestions > 10 ||
      difficultConcepts > easyConcepts * 2 ||
      helpFrequency === 'high'
    ) {
      return 'needs_support';
    }

    // Default: Average quality
    return 'average';
  }
}
