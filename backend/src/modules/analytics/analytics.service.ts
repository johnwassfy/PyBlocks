import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Submission,
  SubmissionDocument,
} from '../submissions/schemas/submission.schema';
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
}
