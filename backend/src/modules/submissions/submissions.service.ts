import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UsersService } from '../users/users.service';
import { MissionsService } from '../missions/missions.service';
import { AiService } from '../ai/ai.service';
import { SubmissionCompletedEvent } from '../../common/events/submission.events';
import { AdaptivityService } from '../adaptivity/adaptivity.service';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    private usersService: UsersService,
    private missionsService: MissionsService,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
    private adaptivityService: AdaptivityService,
  ) {}

  async create(
    userId: string,
    createSubmissionDto: CreateSubmissionDto,
  ): Promise<any> {
    this.logger.log(`Processing submission for user ${userId}`);

    // 1. Validate mission exists
    const mission = await this.missionsService.findById(
      createSubmissionDto.missionId,
    );

    if (!mission) {
      throw new NotFoundException(
        `Mission with ID ${createSubmissionDto.missionId} not found`,
      );
    }

    // 2. Call AI service for analysis (fast, synchronous part)
    this.logger.log(`Sending code to AI service for analysis`);
    const aiResult = await this.aiService.analyzeSubmission({
      mission_id: createSubmissionDto.missionId,
      user_id: userId,
      code: createSubmissionDto.code,
      output: createSubmissionDto.output || '',
      attempts: createSubmissionDto.attempts || 1,
      time_spent: createSubmissionDto.timeSpent || 0,
    });

    // 3. Validate AI result structure
    const isSuccessful = aiResult?.status === 'success';
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
      detectedConcepts: aiResult?.concepts_detected || [],
      aiAnalysis: {
        weaknesses: aiResult?.weaknesses || [],
        strengths: aiResult?.strengths || [],
        suggestions: aiResult?.suggestions || [],
      },
    });

    const savedSubmission = await submission.save();
    const submissionId = String(savedSubmission._id);
    this.logger.log(`Submission saved with ID ${submissionId}`);

    // 5. Emit event for async processing (non-blocking)
    // This triggers the adaptivity service and other listeners
    const event = new SubmissionCompletedEvent({
      userId,
      missionId: createSubmissionDto.missionId,
      submissionId,
      score: baseScore,
      success: isSuccessful,
      concepts: mission.concepts || [],
      weakConcepts: aiResult?.weaknesses || [],
      difficulty: mission.difficulty,
      timeSpent: createSubmissionDto.timeSpent,
      attempts: createSubmissionDto.attempts,
      aiFeedback: {
        feedback: aiResult?.feedback || '',
        hints: aiResult?.hints || [],
        suggestions: aiResult?.suggestions || [],
      },
    });

    this.logger.log(`Emitting submission.completed event`);
    this.eventEmitter.emit('submission.completed', event);

    // 6. Process adaptive analysis synchronously for immediate recommendations
    const adaptiveResults =
      await this.adaptivityService.processSubmissionAnalysis(
        userId,
        createSubmissionDto.missionId,
        submissionId,
        {
          success: isSuccessful,
          score: baseScore,
          feedback: aiResult?.feedback || '',
          weakConcepts: aiResult?.weaknesses || [],
          strongConcepts: aiResult?.strengths || [],
          hints: aiResult?.hints || [],
          suggestions: aiResult?.suggestions || [],
        },
        {
          difficulty: mission.difficulty,
          concepts: mission.concepts || [],
        },
      );

    // 7. Return comprehensive response with adaptive recommendations
    return {
      submission: savedSubmission,
      aiResult,
      xpGained: adaptiveResults.xpGained,
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
}
