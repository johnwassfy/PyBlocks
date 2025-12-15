import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Submission,
  SubmissionDocument,
} from '../submissions/schemas/submission.schema';
import {
  SubmissionLog,
  SubmissionLogDocument,
} from '../submissions/schemas/submission-log.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Mission, MissionDocument } from '../missions/schemas/mission.schema';
import {
  LearningProfile,
  LearningProfileDocument,
} from '../learning-profile/schemas/learning-profile.schema';
import {
  Gamification,
  GamificationDocument,
} from '../gamification/schemas/gamification.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(SubmissionLog.name)
    private submissionLogModel: Model<SubmissionLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
    @InjectModel(LearningProfile.name)
    private learningProfileModel: Model<LearningProfileDocument>,
    @InjectModel(Gamification.name)
    private gamificationModel: Model<GamificationDocument>,
  ) {}

  async getOverallStats(): Promise<any> {
    const totalUsers = await this.userModel.countDocuments().exec();
    const totalSubmissions = await this.submissionModel.countDocuments().exec();
    const successfulSubmissions = await this.submissionModel
      .countDocuments({ isSuccessful: true })
      .exec();
    const totalMissions = await this.missionModel.countDocuments().exec();

    return {
      totalUsers,
      totalSubmissions,
      successfulSubmissions,
      successRate:
        totalSubmissions > 0
          ? (successfulSubmissions / totalSubmissions) * 100
          : 0,
      totalMissions,
      activeMissions: await this.missionModel
        .countDocuments({ isActive: true })
        .exec(),
    };
  }

  async getUserAnalytics(userId: string): Promise<any> {
    const submissions = await this.submissionModel.find({ userId }).exec();
    const successful = submissions.filter((s) => s.isSuccessful).length;
    const total = submissions.length;

    const conceptFrequency: Record<string, number> = {};
    submissions.forEach((submission) => {
      submission.detectedConcepts.forEach((concept) => {
        conceptFrequency[concept] = (conceptFrequency[concept] || 0) + 1;
      });
    });

    return {
      totalSubmissions: total,
      successfulSubmissions: successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageAttempts:
        total > 0
          ? submissions.reduce((sum, s) => sum + s.attempts, 0) / total
          : 0,
      totalTimeSpent: submissions.reduce((sum, s) => sum + s.timeSpent, 0),
      conceptFrequency,
      mostPracticedConcepts: Object.entries(conceptFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([concept, count]) => ({ concept, count })),
    };
  }

  async getMissionAnalytics(missionId: string): Promise<any> {
    const submissions = await this.submissionModel.find({ missionId }).exec();
    const successful = submissions.filter((s) => s.isSuccessful).length;
    const total = submissions.length;

    return {
      missionId,
      totalAttempts: total,
      successfulAttempts: successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageAttempts:
        total > 0
          ? submissions.reduce((sum, s) => sum + s.attempts, 0) / total
          : 0,
      averageScore:
        total > 0
          ? submissions.reduce((sum, s) => sum + s.score, 0) / total
          : 0,
      uniqueUsers: new Set(submissions.map((s) => s.userId.toString())).size,
    };
  }

  async getDashboardData(): Promise<any> {
    const overallStats = await this.getOverallStats();

    // Get top gamification profiles by XP
    const topGamificationProfiles = await this.gamificationModel
      .find()
      .sort({ xp: -1 })
      .limit(10)
      .populate('userId', 'username')
      .exec();

    // Transform to include username from populated user
    const topUsers = topGamificationProfiles.map((gamification) => ({
      username: (gamification.userId as any)?.username || 'Unknown',
      xp: gamification.xp,
      level: gamification.level,
      achievementCount: gamification.achievements.length,
    }));

    const recentSubmissions = await this.submissionModel
      .find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'username')
      .populate('missionId', 'title')
      .exec();

    return {
      overview: overallStats,
      topUsers,
      recentActivity: recentSubmissions,
    };
  }

  async getConceptsMastery(): Promise<any> {
    const learningProfiles = await this.learningProfileModel.find().exec();
    const conceptStats: Record<string, { weak: number; strong: number }> = {};

    learningProfiles.forEach((profile) => {
      profile.weakSkills.forEach((skill) => {
        if (!conceptStats[skill]) {
          conceptStats[skill] = { weak: 0, strong: 0 };
        }
        conceptStats[skill].weak += 1;
      });

      profile.strongSkills.forEach((skill) => {
        if (!conceptStats[skill]) {
          conceptStats[skill] = { weak: 0, strong: 0 };
        }
        conceptStats[skill].strong += 1;
      });
    });

    return {
      totalUsers: learningProfiles.length,
      conceptStats,
      weakestConcepts: Object.entries(conceptStats)
        .sort((a, b) => b[1].weak - a[1].weak)
        .slice(0, 5)
        .map(([concept, stats]) => ({ concept, ...stats })),
      strongestConcepts: Object.entries(conceptStats)
        .sort((a, b) => b[1].strong - a[1].strong)
        .slice(0, 5)
        .map(([concept, stats]) => ({ concept, ...stats })),
    };
  }

  /**
   * 📊 AI MODEL COMPARISON ANALYTICS
   * Compare performance metrics across different AI models for thesis research
   */
  async getAiModelComparison(): Promise<any> {
    const logs = await this.submissionLogModel.find().exec();

    // Group by AI model
    const modelGroups = logs.reduce(
      (acc, log) => {
        const model = log.aiModel || 'unknown';
        if (!acc[model]) {
          acc[model] = [];
        }
        acc[model].push(log);
        return acc;
      },
      {} as Record<string, typeof logs>,
    );

    // Calculate metrics for each model
    const modelStats = Object.entries(modelGroups).map(([model, modelLogs]) => {
      const total = modelLogs.length;
      const successful = modelLogs.filter((l) => l.success).length;

      return {
        aiModel: model,
        aiProvider: modelLogs[0]?.aiProvider || 'unknown',
        totalSubmissions: total,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        averageScore:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.score, 0) / total
            : 0,
        averageTimeSpent:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.timeSpent, 0) / total
            : 0,
        averageAttempts:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.attempts, 0) / total
            : 0,
        averageHintsUsed:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.aiHintsProvided, 0) / total
            : 0,
        averageProactiveHelp:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.aiProactiveHelp, 0) / total
            : 0,
        averageChatbotInteractions:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.chatbotInteractions, 0) /
              total
            : 0,
        averageResponseTime:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.aiResponseTime, 0) / total
            : 0,
        averageFeedbackLength:
          total > 0
            ? modelLogs.reduce((sum, l) => sum + l.feedbackLength, 0) / total
            : 0,
        uniqueStudents: new Set(modelLogs.map((l) => l.anonymizedUserId)).size,
      };
    });

    return {
      totalModels: modelStats.length,
      modelComparison: modelStats.sort((a, b) => b.successRate - a.successRate),
      bestPerformingModel: modelStats.reduce((best, current) =>
        current.successRate > best.successRate ? current : best,
      ),
      fastestModel: modelStats.reduce((fastest, current) =>
        current.averageResponseTime < fastest.averageResponseTime
          ? current
          : fastest,
      ),
    };
  }

  /**
   * 📊 DETAILED SUBMISSION LOGS FOR DATA EXPORT
   * Get all submission logs with optional filtering for Python/CSV export
   */
  async getSubmissionLogs(filters?: {
    aiModel?: string;
    startDate?: Date;
    endDate?: Date;
    anonymizedUserId?: string;
    missionId?: string;
    success?: boolean;
  }): Promise<SubmissionLogDocument[]> {
    const query: any = {};

    if (filters) {
      if (filters.aiModel) query.aiModel = filters.aiModel;
      if (filters.anonymizedUserId)
        query.anonymizedUserId = filters.anonymizedUserId;
      if (filters.missionId) query.missionId = filters.missionId;
      if (typeof filters.success === 'boolean') query.success = filters.success;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }
    }

    return this.submissionLogModel.find(query).sort({ timestamp: -1 }).exec();
  }

  /**
   * 📊 STUDENT LEARNING JOURNEY
   * Track individual student progress across different AI models
   */
  async getStudentJourney(anonymizedUserId: string): Promise<any> {
    const logs = await this.submissionLogModel
      .find({ anonymizedUserId })
      .sort({ timestamp: 1 })
      .exec();

    const totalSubmissions = logs.length;
    const successfulSubmissions = logs.filter((l) => l.success).length;
    const totalTimeSpent = logs.reduce((sum, l) => sum + l.timeSpent, 0);

    // Group by mission to track progress
    const missionProgress = logs.reduce(
      (acc, log) => {
        const missionId = log.missionId.toString();
        if (!acc[missionId]) {
          acc[missionId] = {
            missionTitle: log.missionTitle,
            attempts: 0,
            timeSpent: 0,
            success: false,
          };
        }
        acc[missionId].attempts += 1;
        acc[missionId].timeSpent += log.timeSpent;
        if (log.success) acc[missionId].success = true;
        return acc;
      },
      {} as Record<string, any>,
    );

    // AI model usage breakdown
    const modelUsage = logs.reduce(
      (acc, log) => {
        const model = log.aiModel;
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      anonymizedUserId,
      totalSubmissions,
      successfulSubmissions,
      successRate:
        totalSubmissions > 0
          ? (successfulSubmissions / totalSubmissions) * 100
          : 0,
      totalTimeSpent,
      averageTimePerSubmission:
        totalSubmissions > 0 ? totalTimeSpent / totalSubmissions : 0,
      missionProgress: Object.entries(missionProgress).map(([id, data]) => ({
        missionId: id,
        ...data,
      })),
      aiModelUsage: modelUsage,
      weakConcepts: this.getMostFrequent(
        logs.flatMap((l) => l.weakConcepts),
        5,
      ),
      strongConcepts: this.getMostFrequent(
        logs.flatMap((l) => l.strongConcepts),
        5,
      ),
    };
  }

  private getMostFrequent(
    items: string[],
    limit: number,
  ): { concept: string; count: number }[] {
    const frequency: Record<string, number> = {};
    items.forEach((item) => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([concept, count]) => ({ concept, count }));
  }

  // ========== PRE/POST TEST ANALYTICS ==========

  /**
   * Get all pre-test submissions for a user
   */
  async getPreTestResults(userId: string): Promise<SubmissionLogDocument[]> {
    return this.submissionLogModel
      .find({
        userId,
        experimentGroup: 'PRE_TEST',
      })
      .sort({ timestamp: 1 })
      .exec();
  }

  /**
   * Get all post-test submissions for a user
   */
  async getPostTestResults(userId: string): Promise<SubmissionLogDocument[]> {
    return this.submissionLogModel
      .find({
        userId,
        experimentGroup: 'POST_TEST',
      })
      .sort({ timestamp: 1 })
      .exec();
  }

  /**
   * Get intervention mission submissions for a user
   */
  async getInterventionResults(userId: string): Promise<SubmissionLogDocument[]> {
    return this.submissionLogModel
      .find({
        userId,
        experimentGroup: 'INTERVENTION',
      })
      .sort({ timestamp: 1 })
      .exec();
  }

  /**
   * Compare pre vs post test results for a user
   */
  async getTestComparison(userId: string): Promise<any> {
    const preTests = await this.getPreTestResults(userId);
    const postTests = await this.getPostTestResults(userId);

    const preAggregate = this.aggregateTestScores(preTests);
    const postAggregate = this.aggregateTestScores(postTests);

    return {
      pre: preAggregate,
      post: postAggregate,
      improvement: {
        totalScore: postAggregate.avgTotal - preAggregate.avgTotal,
        pythonSyntax: postAggregate.avgPythonSyntax - preAggregate.avgPythonSyntax,
        correctness: postAggregate.avgCorrectness - preAggregate.avgCorrectness,
        codeStructure: postAggregate.avgCodeStructure - preAggregate.avgCodeStructure,
        requiredFeatures: postAggregate.avgRequiredFeatures - preAggregate.avgRequiredFeatures,
        noErrors: postAggregate.avgNoErrors - preAggregate.avgNoErrors,
        attempts: preAggregate.avgAttempts - postAggregate.avgAttempts,
        timeSpent: preAggregate.avgTimeSpent - postAggregate.avgTimeSpent,
        syntaxErrorReduction: preAggregate.avgSyntaxErrors - postAggregate.avgSyntaxErrors,
      },
    };
  }

  /**
   * Aggregate test scores from multiple submissions
   */
  private aggregateTestScores(submissions: SubmissionLogDocument[]): any {
    if (submissions.length === 0) {
      return {
        count: 0,
        avgTotal: 0,
        avgPythonSyntax: 0,
        avgCorrectness: 0,
        avgCodeStructure: 0,
        avgRequiredFeatures: 0,
        avgNoErrors: 0,
        avgAttempts: 0,
        avgTimeSpent: 0,
        avgSyntaxErrors: 0,
      };
    }

    const totals = submissions.reduce(
      (acc, sub) => ({
        total: acc.total + (sub.rubricScores?.total || 0),
        pythonSyntax: acc.pythonSyntax + (sub.rubricScores?.pythonSyntax || 0),
        correctness: acc.correctness + (sub.rubricScores?.correctness || 0),
        codeStructure: acc.codeStructure + (sub.rubricScores?.codeStructure || 0),
        requiredFeatures: acc.requiredFeatures + (sub.rubricScores?.requiredFeatures || 0),
        noErrors: acc.noErrors + (sub.rubricScores?.noErrors || 0),
        attempts: acc.attempts + (sub.attempts || 0),
        timeSpent: acc.timeSpent + (sub.timeSpent || 0),
        syntaxErrors: acc.syntaxErrors + (sub.syntaxErrorsDetailed?.length || 0),
      }),
      {
        total: 0,
        pythonSyntax: 0,
        correctness: 0,
        codeStructure: 0,
        requiredFeatures: 0,
        noErrors: 0,
        attempts: 0,
        timeSpent: 0,
        syntaxErrors: 0,
      },
    );

    const count = submissions.length;

    return {
      count,
      avgTotal: totals.total / count,
      avgPythonSyntax: totals.pythonSyntax / count,
      avgCorrectness: totals.correctness / count,
      avgCodeStructure: totals.codeStructure / count,
      avgRequiredFeatures: totals.requiredFeatures / count,
      avgNoErrors: totals.noErrors / count,
      avgAttempts: totals.attempts / count,
      avgTimeSpent: totals.timeSpent / count,
      avgSyntaxErrors: totals.syntaxErrors / count,
      submissions,
    };
  }

  /**
   * Get all test data for export (CSV/Excel)
   */
  async getAllTestData(): Promise<any[]> {
    const testSubmissions = await this.submissionLogModel
      .find({
        experimentGroup: { $in: ['PRE_TEST', 'POST_TEST', 'INTERVENTION'] },
      })
      .sort({ userId: 1, timestamp: 1 })
      .exec();

    return testSubmissions.map((sub) => ({
      userId: sub.anonymizedUserId,
      experimentGroup: sub.experimentGroup,
      testProblemId: sub.testProblemId,
      missionTitle: sub.missionTitle,
      timestamp: sub.timestamp,
      totalScore: sub.rubricScores?.total || 0,
      pythonSyntax: sub.rubricScores?.pythonSyntax || 0,
      correctness: sub.rubricScores?.correctness || 0,
      codeStructure: sub.rubricScores?.codeStructure || 0,
      requiredFeatures: sub.rubricScores?.requiredFeatures || 0,
      noErrors: sub.rubricScores?.noErrors || 0,
      attempts: sub.attempts,
      timeSpent: sub.timeSpent,
      syntaxErrorCount: sub.syntaxErrorsDetailed?.length || 0,
      syntaxErrors: sub.syntaxErrorsDetailed?.join('; ') || '',
      passed: sub.success,
    }));
  }
}

