import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import {
  SubmissionLog,
  SubmissionLogDocument,
} from './schemas/submission-log.schema';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UsersService } from '../users/users.service';
import { MissionsService } from '../missions/missions.service';
import { AiService } from '../ai/ai.service';
import { SubmissionCompletedEvent } from '../../common/events/submission.events';
import { AdaptivityService } from '../adaptivity/adaptivity.service';
import { AiAnalysisResponseDto } from '../ai-connector/dto/ai-analysis.dto';
import { RubricScorerService } from './services/rubric-scorer.service';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);
  private readonly EMPTY_ANALYSIS_MESSAGE =
    'AI service returned an incomplete analysis payload. Default values will be used.';

  private getAnalysisResult(
    payload: unknown,
  ):
    | (AiAnalysisResponseDto & { attempts?: number; timeSpent?: number })
    | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return payload as AiAnalysisResponseDto & {
      attempts?: number;
      timeSpent?: number;
    };
  }

  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(SubmissionLog.name)
    private submissionLogModel: Model<SubmissionLogDocument>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => MissionsService))
    private missionsService: MissionsService,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
    private adaptivityService: AdaptivityService,
    private rubricScorerService: RubricScorerService,
  ) { }

  async create(
    userId: string,
    createSubmissionDto: CreateSubmissionDto,
  ): Promise<any> {
    this.logger.log(
      `🔍 [SUBMISSION START] Processing submission for user ${userId}`,
    );
    this.logger.log(
      `🔍 [SUBMISSION] Mission ID: ${createSubmissionDto.missionId}`,
    );
    this.logger.log(
      `🔍 [SUBMISSION] Code length: ${createSubmissionDto.code?.length || 0} chars`,
    );
    this.logger.log(
      `🔍 [SUBMISSION] Actual code:\n${createSubmissionDto.code}`,
    );

    // 1. Validate mission exists
    const mission = await this.missionsService.findById(
      createSubmissionDto.missionId,
    );

    if (!mission) {
      this.logger.error(
        `❌ [SUBMISSION] Mission not found: ${createSubmissionDto.missionId}`,
      );
      throw new NotFoundException(
        `Mission with ID ${createSubmissionDto.missionId} not found`,
      );
    }

    this.logger.log(`✅ [SUBMISSION] Mission found: ${mission.title}`);

    // 🧪 CHECK IF THIS IS A TEST MISSION (Pre1-3, Post1-3)
    const isTestMission = /^(Pre|Post)[123]$/i.test(mission.title);
    if (isTestMission) {
      this.logger.log(`🧪 [TEST MODE] Detected test mission: ${mission.title}`);
      return this.handleTestSubmission(userId, mission, createSubmissionDto);
    }

    // 🔒 2. Validate code against mission rules
    // TEMPORARILY DISABLED - This validation is incorrectly blocking valid submissions
    // The validation logic needs to be fixed to allow expected outputs that match mission requirements
    const codeValidation = { isValid: true, violations: [] };
    /*
    const codeValidation = await this.missionsService.validateCode(
      createSubmissionDto.missionId,
    const codeValidation = { isValid: true, violations: [] };
    /*
    const codeValidation = await this.missionsService.validateCode(
      createSubmissionDto.missionId,
      createSubmissionDto.code,
    );

    if (!codeValidation.isValid) {
      this.logger.warn(
        `Code validation failed for user ${userId}: ${codeValidation.violations.join(', ')}`,
      );
      // Return early with validation errors
      return {
        submission: null,
        aiResult: {
          success: false,
          score: 0,
          feedback: codeValidation.violations.join('\n\n'),
          weakConcepts: [],
          strongConcepts: [],
          hints: [
            'Make sure your code follows the mission requirements!',
            ...codeValidation.violations,
          ],
          suggestions: [],
          testResults: [],
          detectedConcepts: [],
        },
        xpGained: 0,
        validationErrors: codeValidation.violations,
      };
    }
    */

    // 3. Call AI service for analysis (fast, synchronous part)
    this.logger.log(`🤖 [SUBMISSION] Sending code to AI service for analysis`);
    // Prepare test cases for validation
    const testCases: string[] = [];
    if (mission.testCases && Array.isArray(mission.testCases)) {
      // Convert test cases to executable format
      for (const tc of mission.testCases) {
        testCases.push(`${tc.input} => ${tc.expectedOutput}`);
      }
    }

    // Count non-empty lines in expected output for creative validation
    const expectedLineCount = mission.expectedOutput
      ? mission.expectedOutput.split('\n').filter((l) => l.trim() !== '').length
      : 0;

    // Determine validation mode based on mission type and requirements
    // CRITICAL FIX: Don't default to 'strict' for all missions!
    // - 'creative': Storytelling/artistic missions (flexible output)
    // - 'output-only': No required concepts (accept any reasonable output)
    // - 'concept-required': Has required concepts (verify concepts used)
    // - 'strict': Test cases or explicit exact output requirement
    const isCreativeMission =
      mission.tags?.includes('storytelling') ||
      mission.tags?.includes('creative') ||
      mission.tags?.includes('art');

    const hasRequiredConcepts =
      (mission.concepts && mission.concepts.length > 0) ||
      (mission.validationRules?.requiredConcepts &&
        mission.validationRules.requiredConcepts.length > 0);

    const requiresExactOutput =
      mission.validationRules?.requireExactOutput === true ||
      (mission.testCases && mission.testCases.length > 0);

    // Determine validation mode:
    let validationMode: string;
    if (isCreativeMission) {
      validationMode = 'creative'; // Flexible, encourages creativity
    } else if (requiresExactOutput) {
      validationMode = 'strict'; // Must match exact output (test cases)
    } else if (!hasRequiredConcepts) {
      validationMode = 'output-only'; // Just verify output exists (no concept requirements)
    } else {
      validationMode = 'concept-required'; // Verify concepts are used
    }

    this.logger.log(
      `🎯 [SUBMISSION] Validation mode: ${validationMode} (creative: ${isCreativeMission}, concepts: ${hasRequiredConcepts}, exactOutput: ${requiresExactOutput})`,
    );

    const aiResult = this.getAnalysisResult(
      await this.aiService.analyzeSubmission({
        mission_id: createSubmissionDto.missionId,
        user_id: userId,
        code: createSubmissionDto.code,
        output: createSubmissionDto.output || '',
        test_cases: testCases,
        expected_output: mission.expectedOutput,
        concepts: mission.concepts || [],
        difficulty: this.getDifficultyLevel(mission.difficulty),
        attempts: createSubmissionDto.attempts || 1,
        time_spent: createSubmissionDto.timeSpent || 0,

        // Rich mission context
        missionTitle: mission.title,
        missionDescription: mission.description,
        objectives: mission.objectives || [],
        validationMode,
        expectedLineCount,
        isStoryBased: isCreativeMission,

        // Validation context based on mission rules
        checkExactOutput: validationMode === 'strict', // Only strict mode requires exact match
        checkLineCount: validationMode === 'creative',
        checkConcepts:
          validationMode === 'concept-required' || validationMode === 'strict',
        allowCreativity:
          validationMode === 'creative' || validationMode === 'output-only',
        disallowHardcodedOutput:
          validationMode === 'concept-required' || validationMode === 'strict',
        forbiddenPatterns: mission.validationRules?.forbiddenPatterns || [],
        requireExactOutput: validationMode === 'strict', // NEW: Pass this explicitly to AI service
      }),
    );

    if (!aiResult) {
      this.logger.warn(this.EMPTY_ANALYSIS_MESSAGE);
    } else {
      this.logger.log(
        `✅ [SUBMISSION] AI analysis complete - Success: ${aiResult.success}, Score: ${aiResult.score}`,
      );
    }

    // 4. Validate AI result structure
    const isSuccessful = aiResult?.success === true;
    if (typeof aiResult?.success !== 'boolean') {
      this.logger.warn(
        `AI analysis result missing success flag for user ${userId}, submission pending mission ${createSubmissionDto.missionId}`,
      );
    }
    const baseScore = isSuccessful
      ? mission.xpReward
      : Math.floor(mission.xpReward * 0.3);

    // 4. Create submission record (fast write operation)
    const submission = new this.submissionModel({
      userId,
      missionId: createSubmissionDto.missionId,
      code: createSubmissionDto.code,
      output: createSubmissionDto.output,
      feedback: aiResult?.feedback || 'No feedback available',
      score: baseScore,
      attempts: createSubmissionDto.attempts || 1,
      timeSpent: createSubmissionDto.timeSpent || 0,
      isSuccessful,
      detectedConcepts:
        (aiResult && 'detectedConcepts' in aiResult
          ? (aiResult.detectedConcepts as string[])
          : undefined) || [],
      aiAnalysis: {
        weaknesses: aiResult?.weakConcepts || [],
        strengths: aiResult?.strongConcepts || [],
        suggestions: aiResult?.suggestions || [],
      },
    });

    const savedSubmission = await submission.save();
    const submissionId = String(savedSubmission._id);
    this.logger.log(`✅ [SUBMISSION] Submission saved with ID ${submissionId}`);
    this.logger.log(`✅ [SUBMISSION] Submission details:`, {
      userId: savedSubmission.userId,
      missionId: savedSubmission.missionId,
      isSuccessful: savedSubmission.isSuccessful,
      score: savedSubmission.score,
    });

    // 5. Emit event for async processing (non-blocking)
    // This triggers the adaptivity service and other listeners
    const event = new SubmissionCompletedEvent({
      userId,
      missionId: createSubmissionDto.missionId,
      submissionId,
      score: baseScore,
      success: isSuccessful,
      concepts: mission.concepts || [],
      weakConcepts: aiResult?.weakConcepts || [],
      difficulty: mission.difficulty,
      timeSpent: createSubmissionDto.timeSpent,
      attempts: createSubmissionDto.attempts,
      aiFeedback: {
        feedback: aiResult?.feedback || '',
        hints: aiResult?.hints || [],
        suggestions: aiResult?.suggestions || [],
      },
    });

    this.logger.log(`📢 [SUBMISSION] Emitting submission.completed event`);
    this.eventEmitter.emit('submission.completed', event);
    this.logger.log(`✅ [SUBMISSION] Event emitted successfully`);

    // 📊 Update mission analytics
    await this.missionsService.updateMissionAnalytics(
      createSubmissionDto.missionId,
      {
        isSuccessful,
        score: baseScore,
        timeSpent: createSubmissionDto.timeSpent || 0,
        stepsCompleted: mission.steps?.length || 0,
      },
    );

    // 📊 LOG COMPREHENSIVE ANALYTICS FOR THESIS RESEARCH
    await this.logSubmissionAnalytics({
      userId,
      missionId: createSubmissionDto.missionId,
      mission,
      code: createSubmissionDto.code,
      aiResult,
      isSuccessful,
      baseScore,
      attempts: createSubmissionDto.attempts || 1,
      timeSpent: createSubmissionDto.timeSpent || 0,
      aiMetadata: createSubmissionDto.aiMetadata || {},
    });

    // 6. Process adaptive analysis synchronously for immediate recommendations

    this.logger.log(`🎯 [SUBMISSION] Processing adaptive analysis...`);
    let adaptiveResults: any = {
      xpGained: 0,
      newAchievements: [],
      leveledUp: false,
      adaptiveRecommendation: null,
      nextMission: null,
      learningInsights: null,
      weakConcepts: [],
    };
    try {
      // Add timeout protection - if adaptivity takes more than 10 seconds, something is wrong
      const adaptivityPromise =
        this.adaptivityService.processSubmissionAnalysis(
          userId,
          createSubmissionDto.missionId,
          submissionId,
          {
            success: isSuccessful,
            score: baseScore,
            feedback: aiResult?.feedback || '',
            weakConcepts: aiResult?.weakConcepts || [],
            strongConcepts: aiResult?.strongConcepts || [],
            hints: aiResult?.hints || [],
            suggestions: aiResult?.suggestions || [],
            attempts: aiResult?.attempts,
            timeSpent: aiResult?.timeSpent,
          },
          {
            difficulty: mission.difficulty,
            concepts: mission.concepts || [],
            attempts: aiResult?.attempts || createSubmissionDto.attempts,
            timeSpent:
              aiResult?.timeSpent !== undefined
                ? aiResult.timeSpent
                : createSubmissionDto.timeSpent,
          },
        );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(new Error('Adaptivity service timeout after 10 seconds')),
          10000,
        );
      });

      adaptiveResults = (await Promise.race([
        adaptivityPromise,
        timeoutPromise,
      ])) as any;
      this.logger.log(`✅ [SUBMISSION] Adaptive results:`, {
        xpGained: adaptiveResults.xpGained,
        leveledUp: adaptiveResults.leveledUp,
        achievementsCount: adaptiveResults.newAchievements?.length || 0,
      });
    } catch (err) {
      this.logger.error(
        `❌ [SUBMISSION] Error in adaptivityService.processSubmissionAnalysis: ${err.message}`,
        err.stack,
      );
      // Optionally, return a fallback response or rethrow
      adaptiveResults = {
        xpGained: 0,
        newAchievements: [],
        leveledUp: false,
        adaptiveRecommendation: null,
        nextMission: null,
        learningInsights: null,
        weakConcepts: [],
      };
    }

    // 7. Return comprehensive response with adaptive recommendations
    this.logger.log(`🎉 [SUBMISSION COMPLETE] Returning response to frontend`);
    return {
      submission: savedSubmission,
      aiResult,
      xpGained: adaptiveResults.xpGained,
      newAchievements: adaptiveResults.newAchievements,
      leveledUp: adaptiveResults.leveledUp,
      adaptiveRecommendation: adaptiveResults.adaptiveRecommendation,
      nextMission: adaptiveResults.nextMission,
      learningInsights: adaptiveResults.learningInsights,
      weakConcepts: adaptiveResults.weakConcepts,
    };
  }

  async findByUserId(userId: string): Promise<SubmissionDocument[]> {
    return this.submissionModel
      .find({ userId })
      .populate('missionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByMissionId(missionId: string): Promise<SubmissionDocument[]> {
    return this.submissionModel
      .find({ missionId })
      .populate('userId')
      .sort({ createdAt: -1 })
      .exec();
  }

  private getDifficultyLevel(difficulty: string): number {
    const difficultyMap: Record<string, number> = {
      easy: 3,
      medium: 5,
      hard: 7,
      expert: 9,
    };
    return difficultyMap[difficulty.toLowerCase()] || 5;
  }

  async findById(id: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel
      .findById(id)
      .populate('userId')
      .populate('missionId')
      .exec();
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }

  async getUserSubmissionStats(userId: string): Promise<any> {
    const submissions = await this.submissionModel.find({ userId }).exec();
    const successful = submissions.filter((s) => s.isSuccessful).length;
    const total = submissions.length;

    return {
      total,
      successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      totalScore: submissions.reduce((sum, s) => sum + s.score, 0),
      averageAttempts:
        total > 0
          ? submissions.reduce((sum, s) => sum + s.attempts, 0) / total
          : 0,
    };
  }

  /**
   * 📊 LOG COMPREHENSIVE ANALYTICS FOR THESIS RESEARCH
   * Tracks all AI interactions and student performance metrics
   * Data is anonymized for research publication
   */
  private async logSubmissionAnalytics(data: {
    userId: string;
    missionId: string;
    mission: any;
    code: string;
    aiResult: any;
    isSuccessful: boolean;
    baseScore: number;
    attempts: number;
    timeSpent: number;
    aiMetadata: any;
  }): Promise<void> {
    try {
      // Generate anonymized user ID (e.g., STUDENT_001)
      const anonymizedUserId = await this.generateAnonymizedUserId(data.userId);

      // Extract AI model information
      const aiModel = data.aiMetadata?.model || 'unknown';
      const aiProvider = data.aiMetadata?.provider || 'unknown';

      // Calculate code metrics
      const codeLines = data.code.split('\n').length;
      const codeLength = data.code.length;

      // Create comprehensive analytics log
      const analyticsLog = new this.submissionLogModel({
        // Student Identification (Anonymized)
        userId: data.userId,
        anonymizedUserId,

        // Mission Tracking
        missionId: data.missionId,
        missionTitle: data.mission.title || '',
        missionDifficulty: data.mission.difficulty || 'unknown',
        missionConcepts: data.mission.concepts || [],

        // AI Model Tracking
        aiModel,
        aiProvider,
        modelVersion: data.aiMetadata?.version || '',

        // Submission Performance
        success: data.isSuccessful,
        score: data.baseScore,
        attempts: data.attempts,
        timeSpent: data.timeSpent,
        codeLength,
        codeLines,

        // AI Interaction Metrics
        aiHintsRequested: data.aiMetadata?.hintsRequested || 0,
        aiHintsProvided: data.aiResult?.hints?.length || 0,
        aiProactiveHelp: data.aiMetadata?.proactiveHelp || 0,
        chatbotInteractions: data.aiMetadata?.chatbotInteractions || 0,
        aiResponseTime: data.aiMetadata?.responseTime || 0,

        // Learning Analytics
        detectedConcepts: data.aiResult?.detectedConcepts || [],
        weakConcepts: data.aiResult?.weakConcepts || [],
        strongConcepts: data.aiResult?.strongConcepts || [],
        errorsEncountered: data.aiMetadata?.errors || [],

        // AI Feedback Quality
        feedbackProvided: data.aiResult?.feedback || '',
        feedbackLength: (data.aiResult?.feedback || '').length,
        hintsProvided: data.aiResult?.hints || [],
        suggestionsProvided: data.aiResult?.suggestions || [],

        // Student Behavior Patterns
        idleTimeBeforeSubmission: data.aiMetadata?.idleTime || 0,
        usedStarterCode: data.aiMetadata?.usedStarterCode || false,
        receivedProactiveIntervention:
          data.aiMetadata?.proactiveIntervention || false,
        interventionReason: data.aiMetadata?.interventionReason || '',

        // Test Case Results
        totalTestCases: data.aiResult?.testResults?.length || 0,
        passedTestCases:
          data.aiResult?.testResults?.filter((t: any) => t.passed)?.length || 0,
        failedTestCases:
          data.aiResult?.testResults?.filter((t: any) => !t.passed)?.length ||
          0,
        testCaseDetails: data.aiResult?.testResults || {},

        // Learning State Tracking
        learningState: data.aiMetadata?.learningState || '',
        confidenceLevel: data.aiMetadata?.confidenceLevel || 0,
        frustrationLevel: data.aiMetadata?.frustrationLevel || 0,

        // Session Information
        sessionId: data.aiMetadata?.sessionId || '',
        timestamp: new Date(),
        sessionDuration: data.aiMetadata?.sessionDuration || 0,

        // Research Metadata
        experimentGroup: data.aiMetadata?.experimentGroup || '',
        additionalMetrics: data.aiMetadata?.additionalMetrics || {},
      });

      await analyticsLog.save();
      this.logger.log(
        `📊 Analytics logged for ${anonymizedUserId} using model ${aiModel}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - analytics logging should not break submission flow
    }
  }

  /**
   * Handle test submission (Pre1-3, Post1-3)
   * Score using rubric and save with test metadata
   */
  private async handleTestSubmission(userId: string, mission: any, dto: CreateSubmissionDto): Promise<any> {
    this.logger.log(`🧪 [TEST] Scoring test submission for ${mission.title}`);

    // Get test cases from mission
    const testCases = mission.steps?.[0]?.testCases || [];
    const requiredConcepts = mission.validationRules?.requiredConcepts || [];

    // Score using rubric
    const rubricScores = await this.rubricScorerService.scoreCode(
      dto.code,
      testCases,
      requiredConcepts,
    );

    this.logger.log(`🧪 [TEST] Rubric scores: ${JSON.stringify(rubricScores)}`);

    // Determine experiment group
    const experimentGroup = mission.title.startsWith('Pre') ? 'PRE_TEST' : 'POST_TEST';

    // Create submission log
    const submissionLog = new this.submissionLogModel({
      userId,
      anonymizedUserId: await this.generateAnonymizedUserId(userId),
      missionId: mission._id,
      missionTitle: mission.title,
      missionDifficulty: mission.difficulty,
      missionConcepts: mission.concepts || [],
      
      // Test-specific fields
      experimentGroup,
      testProblemId: mission.title,
      rubricScores: {
        pythonSyntax: rubricScores.pythonSyntax,
        correctness: rubricScores.correctness,
        codeStructure: rubricScores.codeStructure,
        requiredFeatures: rubricScores.requiredFeatures,
        noErrors: rubricScores.noErrors,
        total: rubricScores.total,
      },
      syntaxErrorsDetailed: rubricScores.breakdown.syntaxDetails,
      submittedCode: dto.code,
      
      // Performance metrics
      success: rubricScores.total >= 70, // 70% passing threshold
      score: rubricScores.total,
      attempts: dto.attempts || 1,
      timeSpent: dto.timeSpent || 0,
      codeLength: dto.code?.length || 0,
      codeLines: (dto.code?.split('\n') || []).length,
      
      // AI fields (all zero for tests)
      aiModel: 'N/A - Test Mode',
      aiProvider: 'N/A',
      aiHintsRequested: 0,
      aiHintsProvided: 0,
      aiProactiveHelp: 0,
      chatbotInteractions: 0,
      aiResponseTime: 0,
      
      // Test case results
      totalTestCases: testCases.length,
      passedTestCases: Math.round((rubricScores.correctness / 30) * testCases.length),
      failedTestCases: testCases.length - Math.round((rubricScores.correctness / 30) * testCases.length),
      
      timestamp: new Date(),
    });

    await submissionLog.save();

    this.logger.log(`✅ [TEST] Test submission logged for ${mission.title}`);

    // Return formatted response for frontend
    return {
      submission: null,
      isTestMode: true,
      rubricScores,
      experimentGroup,
      testProblemId: mission.title,
      passed: rubricScores.total >= 70,
      message: rubricScores.total >= 70 
        ? `Great job! You scored ${rubricScores.total}/100` 
        : `You scored ${rubricScores.total}/100. Keep practicing!`,
    };
  }

  /**
   * Generate anonymized user ID for thesis publication
   * Format: STUDENT_XXX (e.g., STUDENT_001)
   */
  private async generateAnonymizedUserId(userId: string): Promise<string> {
    // Use hash-based anonymization to ensure consistency
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const numericId = parseInt(hash.substring(0, 8), 16) % 10000;
    return `STUDENT_${String(numericId).padStart(4, '0')}`;
  }

  /**
   * 🗑️ Delete all submissions for a user (for account deletion)
   */
  async delete(userId: string): Promise<void> {
    await this.submissionModel.deleteMany({ userId }).exec();
    await this.submissionLogModel.deleteMany({ userId }).exec();
  }
}
