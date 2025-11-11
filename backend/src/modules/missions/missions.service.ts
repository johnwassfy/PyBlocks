import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mission, MissionDocument } from './schemas/mission.schema';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Injectable()
export class MissionsService {
  constructor(
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
  ) {}

  async create(createMissionDto: CreateMissionDto): Promise<MissionDocument> {
    const mission = new this.missionModel({
      ...createMissionDto,
      // Initialize analytics if not provided
      analytics: createMissionDto.analytics || {
        totalAttempts: 0,
        successRate: 0,
        averageScore: 0,
        averageTimeSpent: 0,
        averageStepsCompleted: 0,
        lastUpdated: new Date(),
      },
    });
    return mission.save();
  }

  async findAll(difficulty?: string): Promise<MissionDocument[]> {
    const query = difficulty
      ? { difficulty, isActive: true }
      : { isActive: true };
    return this.missionModel.find(query).sort({ order: 1 }).exec();
  }

  async findById(id: string): Promise<MissionDocument> {
    const mission = await this.missionModel.findById(id).exec();
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  async update(
    id: string,
    updateMissionDto: UpdateMissionDto,
  ): Promise<MissionDocument> {
    const mission = await this.missionModel
      .findByIdAndUpdate(id, updateMissionDto, { new: true })
      .exec();
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  async delete(id: string): Promise<void> {
    const result = await this.missionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Mission not found');
    }
  }

  async getAdaptiveMissions(
    weakSkills: string[],
    completedMissions: string[],
    options: {
      excludeMissionIds?: string[];
      difficulty?: string;
      limit?: number;
    } = {},
  ): Promise<MissionDocument[]> {
    const excludedIds = [
      ...completedMissions,
      ...(options.excludeMissionIds || []),
    ];

    const query: Record<string, unknown> = {
      isActive: true,
      _id: { $nin: excludedIds },
    };

    if (weakSkills.length > 0) {
      query['tags'] = { $in: weakSkills };
    }

    if (options.difficulty) {
      query['difficulty'] = options.difficulty;
    }

    return this.missionModel
      .find(query)
      .sort({ order: 1 })
      .limit(options.limit ?? 5)
      .exec();
  }

  async getNextMission(
    completedMissions: string[],
  ): Promise<MissionDocument | null> {
    // Get the first incomplete mission by order
    return this.missionModel
      .findOne({
        isActive: true,
        _id: { $nin: completedMissions },
      })
      .sort({ order: 1 })
      .exec();
  }

  /**
   * 🎯 Get a specific step from a mission
   */
  async getMissionStep(
    missionId: string,
    stepIndex: number,
  ): Promise<{ step: any; totalSteps: number; mission: MissionDocument }> {
    const mission = await this.findById(missionId);

    if (!mission.steps || mission.steps.length === 0) {
      throw new NotFoundException('This mission has no steps');
    }

    if (stepIndex < 0 || stepIndex >= mission.steps.length) {
      throw new NotFoundException(
        `Step ${stepIndex} not found. Mission has ${mission.steps.length} steps.`,
      );
    }

    return {
      step: mission.steps[stepIndex],
      totalSteps: mission.steps.length,
      mission,
    };
  }

  /**
   * 📊 Update mission analytics after a submission
   */
  async updateMissionAnalytics(
    missionId: string,
    submissionData: {
      isSuccessful: boolean;
      score: number;
      timeSpent: number;
      stepsCompleted?: number;
    },
  ): Promise<void> {
    const mission = await this.findById(missionId);

    const currentAnalytics = mission.analytics || {
      totalAttempts: 0,
      successRate: 0,
      averageScore: 0,
      averageTimeSpent: 0,
      averageStepsCompleted: 0,
    };

    const totalAttempts = (currentAnalytics.totalAttempts || 0) + 1;
    const successCount = submissionData.isSuccessful
      ? (currentAnalytics.successRate || 0) *
          (currentAnalytics.totalAttempts || 0) +
        1
      : (currentAnalytics.successRate || 0) *
        (currentAnalytics.totalAttempts || 0);

    const newAnalytics = {
      totalAttempts,
      successRate: successCount / totalAttempts,
      averageScore:
        ((currentAnalytics.averageScore || 0) *
          (currentAnalytics.totalAttempts || 0) +
          submissionData.score) /
        totalAttempts,
      averageTimeSpent:
        ((currentAnalytics.averageTimeSpent || 0) *
          (currentAnalytics.totalAttempts || 0) +
          submissionData.timeSpent) /
        totalAttempts,
      averageStepsCompleted: submissionData.stepsCompleted
        ? ((currentAnalytics.averageStepsCompleted || 0) *
            (currentAnalytics.totalAttempts || 0) +
            submissionData.stepsCompleted) /
          totalAttempts
        : currentAnalytics.averageStepsCompleted || 0,
      lastUpdated: new Date(),
    };

    await this.missionModel
      .findByIdAndUpdate(missionId, { analytics: newAnalytics })
      .exec();
  }

  /**
   * 🔒 Validate code against mission rules
   */
  async validateCode(
    missionId: string,
    code: string,
  ): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const mission = await this.findById(missionId);
    const violations: string[] = [];

    if (!mission.validationRules) {
      return { isValid: true, violations: [] };
    }

    const rules = mission.validationRules;

    // Check for hardcoded output
    if (rules.disallowHardcodedOutput && mission.expectedOutput) {
      const expectedOutputEscaped = mission.expectedOutput.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      const hardcodedPattern = new RegExp(
        `['"]\\s*${expectedOutputEscaped}\\s*['"]`,
        'i',
      );

      if (hardcodedPattern.test(code)) {
        violations.push(
          'Hardcoded output detected. Try solving the problem dynamically!',
        );
      }
    }

    // Check for required concepts
    if (rules.requiredConcepts && rules.requiredConcepts.length > 0) {
      for (const concept of rules.requiredConcepts) {
        let conceptFound = false;

        // Check for common patterns
        switch (concept) {
          case 'loops':
            conceptFound = /\b(for|while)\b/.test(code);
            break;
          case 'variables':
            conceptFound = /\w+\s*=/.test(code);
            break;
          case 'functions':
            conceptFound = /\bdef\s+\w+/.test(code);
            break;
          case 'conditionals':
            conceptFound = /\b(if|elif|else)\b/.test(code);
            break;
          case 'lists':
            conceptFound = /\[.*\]/.test(code);
            break;
          case 'input':
            conceptFound = /\binput\s*\(/.test(code);
            break;
          case 'print':
            conceptFound = /\bprint\s*\(/.test(code);
            break;
          default:
            conceptFound = new RegExp(`\\b${concept}\\b`, 'i').test(code);
        }

        if (!conceptFound) {
          violations.push(
            `This mission requires using ${concept}. Try incorporating it into your solution!`,
          );
        }
      }
    }

    // Check for forbidden patterns
    if (rules.forbiddenPatterns && rules.forbiddenPatterns.length > 0) {
      for (const pattern of rules.forbiddenPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(code)) {
          violations.push(
            `Your code uses a forbidden pattern. Try a different approach!`,
          );
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * 📈 Get missions ranked by difficulty for a student
   */
  async getMissionsByDifficulty(
    weakConcepts: string[],
    completedMissions: string[],
  ): Promise<{
    easy: MissionDocument[];
    medium: MissionDocument[];
    hard: MissionDocument[];
  }> {
    const baseQuery = {
      isActive: true,
      _id: { $nin: completedMissions },
    };

    const conceptQuery =
      weakConcepts.length > 0 ? { concepts: { $in: weakConcepts } } : {};

    const [easy, medium, hard] = await Promise.all([
      this.missionModel
        .find({ ...baseQuery, ...conceptQuery, difficulty: 'easy' })
        .sort({ order: 1 })
        .limit(5)
        .exec(),
      this.missionModel
        .find({ ...baseQuery, ...conceptQuery, difficulty: 'medium' })
        .sort({ order: 1 })
        .limit(5)
        .exec(),
      this.missionModel
        .find({ ...baseQuery, ...conceptQuery, difficulty: 'hard' })
        .sort({ order: 1 })
        .limit(5)
        .exec(),
    ]);

    return { easy, medium, hard };
  }

  /**
   * 🎓 Get missions that teach specific concepts
   */
  async getMissionsByConcepts(
    concepts: string[],
    excludeMissionIds: string[] = [],
  ): Promise<MissionDocument[]> {
    return this.missionModel
      .find({
        isActive: true,
        _id: { $nin: excludeMissionIds },
        concepts: { $in: concepts },
      })
      .sort({ order: 1 })
      .exec();
  }

  /**
   * 🔄 Check if student can skip to next step
   */
  canSkipStep(mission: MissionDocument): boolean {
    return mission.config?.allowSkipSteps ?? false;
  }

  /**
   * ✅ Check if AI checkpoint should trigger after this step
   */
  shouldTriggerAICheckpoint(
    mission: MissionDocument,
    stepIndex: number,
  ): boolean {
    if (!mission.steps || stepIndex >= mission.steps.length) {
      return false;
    }

    return mission.steps[stepIndex].aiCheckpoint ?? true;
  }
}
