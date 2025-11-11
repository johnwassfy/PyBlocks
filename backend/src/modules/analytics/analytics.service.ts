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
    
    // Get top learning profiles by XP
    const topLearningProfiles = await this.learningProfileModel
      .find()
      .sort({ xp: -1 })
      .limit(10)
      .populate('userId', 'username')
      .exec();

    // Transform to include username from populated user
    const topUsers = topLearningProfiles.map((profile) => ({
      username: (profile.userId as any)?.username || 'Unknown',
      xp: profile.xp,
      level: profile.level,
      badges: profile.badges,
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
        uniqueStudents: new Set(
          modelLogs.map((l) => l.anonymizedUserId),
        ).size,
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
}
