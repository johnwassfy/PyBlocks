import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AiService.name);

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
    // Contract note: matches ai_service/app/api/endpoints/analyze.py response structure.
    // Enhanced with rich context for adaptive, intelligent AI feedback.
    try {
      // Gather student context from user profile and progress
      await this.userModel.findById(submissionData.userId || submissionData.user_id);
      const progress = await this.progressModel.findOne({ userId: submissionData.userId || submissionData.user_id });
      
      // Get learning profile for extended student data
      let learningProfile: any = null;
      try {
        learningProfile = await this.learningProfileService.findByUserId(
          submissionData.userId || submissionData.user_id
        );
      } catch {
        this.logger.warn(`Learning profile not found for user ${submissionData.userId || submissionData.user_id}`);
      }
      
      // Get previous submissions for this mission to track attempts
      const previousSubmissions = await this.submissionModel
        .find({
          userId: submissionData.userId || submissionData.user_id,
          missionId: submissionData.missionId || submissionData.mission_id,
        })
        .sort({ createdAt: -1 })
        .limit(5);

      const attemptNumber = previousSubmissions.length + 1;
      const lastSubmission = previousSubmissions[0];

      // Build rich AI context package
      const aiContextRequest = {
        mission_id: submissionData.missionId || submissionData.mission_id,
        ai_model: submissionData.aiModel || 'z-ai/glm-4.5-air',
        
        // 1️⃣ Mission Context
        mission_context: {
          title: submissionData.missionTitle || 'Mission',
          description: submissionData.missionDescription || '',
          objectives: submissionData.objectives || [],
          concepts: submissionData.concepts || [],
          validation_mode: submissionData.validationMode || 'strict',
          expected_output: submissionData.expected_output || '',
          expected_line_count: submissionData.expectedLineCount,
          is_story_based: submissionData.isStoryBased || false,
          difficulty: submissionData.difficulty || 1,
        },

        // 2️⃣ Student Context
        student_context: {
          user_id: submissionData.userId || submissionData.user_id,
          level: learningProfile?.level || 1,
          xp: learningProfile?.xp || 0,
          weak_skills: learningProfile?.weakSkills || progress?.weakConcepts || [],
          strong_skills: learningProfile?.strongSkills || progress?.strongConcepts || [],
          learning_style: 'hands-on', // Default for now
          feedback_preference: 'short', // Default for now
          ai_tone: 'friendly', // Default for now
          attempt_number: attemptNumber,
          time_spent: submissionData.timeSpent || submissionData.time_spent || 0,
          previous_feedback: lastSubmission?.feedback || null,
        },

        // 3️⃣ Submission Context
        submission_context: {
          code: submissionData.code,
          output: submissionData.output || '',
          execution_result: submissionData.executionResult,
          test_cases: submissionData.test_cases || [],
          complexity_score: submissionData.complexityScore,
          syntax_score: submissionData.syntaxScore || 100,
          code_length: submissionData.code?.length || 0,
          concepts_detected: submissionData.conceptsDetected || [],
          line_count: submissionData.code?.split('\n').length || 0,
        },

        // 4️⃣ Behavior Metrics
        behavior_metrics: {
          idle_time: submissionData.idleTime || 0,
          corrections_made: previousSubmissions.length,
          errors_last_attempt: lastSubmission?.aiAnalysis?.weaknesses?.length || 0,
          ai_hints_used: submissionData.hintsUsed || 0,
          proactive_help_triggered: submissionData.proactiveHelpTriggered || false,
        },

        // 5️⃣ Validation Context
        validation_context: {
          check_exact_output: submissionData.checkExactOutput !== false,
          check_line_count: submissionData.checkLineCount || false,
          check_concepts: submissionData.checkConcepts !== false,
          disallow_hardcoded_output: submissionData.disallowHardcodedOutput !== false,
          allow_creativity: submissionData.allowCreativity || false,
          forbidden_patterns: submissionData.forbiddenPatterns || [],
        },

        // Legacy fields for backward compatibility (deprecated)
        code: submissionData.code,
        concepts: submissionData.concepts || [],
        test_cases: submissionData.test_cases || [],
        expected_output: submissionData.expected_output,
        difficulty: submissionData.difficulty,
        user_id: submissionData.userId || submissionData.user_id,
        submission_id: submissionData.submissionId || submissionData.submission_id,
        attempts: attemptNumber,
        time_spent: submissionData.timeSpent || submissionData.time_spent || 0,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/v1/analyze`,
          aiContextRequest,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `AI Service Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Return fallback response if AI service is unavailable
      return {
        success: false,
        score: 0,
        feedback: 'Your submission has been received. Keep practicing!',
        weakConcepts: [],
        strongConcepts: [],
        hints: ['Our AI helper is warming up. Try running your code again soon!'],
        suggestions: [],
        testResults: [],
        executionTime: 0,
        detectedConcepts: [],
        complexityScore: 0,
        errorType: 'ServiceUnavailable',
        errorMessage: 'AI analysis service is currently unavailable.',
        attempts: submissionData.attempts || 1,
        timeSpent: submissionData.timeSpent || 0,
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
          `${this.aiServiceUrl}/api/v1/recommend`,
          {
            user_id: userId,
            weak_skills: weakSkills,
          },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `AI Recommendation Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
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
          `${this.aiServiceUrl}/api/v1/hint`,
          {
            mission_id: missionId,
            code: currentCode,
          },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `AI Hint Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
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
      const submissionUpdate: Record<string, unknown> = {
        aiAnalysis: {
          weaknesses: analysis.weaknesses,
          strengths: analysis.strengths,
          suggestions: analysis.suggestions,
        },
        detectedConcepts: analysis.detectedConcepts,
        score: analysis.score,
        isSuccessful: analysis.isSuccessful,
      };

      if (typeof analysis.attempts === 'number') {
        submissionUpdate.attempts = analysis.attempts;
      }
      if (typeof analysis.timeSpent === 'number') {
        submissionUpdate.timeSpent = analysis.timeSpent;
      }

      await this.submissionModel.findByIdAndUpdate(submissionId, submissionUpdate);

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

      const conceptScores = analysis.conceptScores || {};
      if (!analysis.conceptScores) {
        this.logger.warn(
          `Learning state update for user ${userId} missing conceptScores. Defaulting to existing mastery values.`,
        );
      }

      for (const [concept, newScore] of Object.entries(conceptScores)) {
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
      this.logger.error(
        `Learning State Update Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
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
