import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { getModelToken } from '@nestjs/mongoose';
import { LearningProfileService } from '../learning-profile/learning-profile.service';

describe('ProgressService', () => {
  let service: ProgressService;

  const progressDoc: any = {
    conceptMastery: new Map<string, number>(),
    weakConcepts: [] as string[],
    strongConcepts: [] as string[],
    completedConcepts: [] as string[],
    totalMissionsCompleted: 0,
    totalTimeSpent: 0,
    averageScore: 0,
    lastUpdated: new Date(),
    save: jest.fn(),
  };

  const progressModel = {
    findOne: jest.fn().mockResolvedValue(progressDoc),
  };

  const learningProfileService = {
    update: jest.fn().mockResolvedValue(undefined),
    addCompletedMission: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    progressDoc.conceptMastery = new Map([['loops', 40]]);
    progressDoc.weakConcepts = [];
    progressDoc.strongConcepts = [];
    progressDoc.completedConcepts = [];
    progressDoc.totalMissionsCompleted = 2;
    progressDoc.totalTimeSpent = 30;
    progressDoc.averageScore = 70;
    progressDoc.save = jest.fn().mockResolvedValue(progressDoc);

    progressModel.findOne = jest.fn().mockResolvedValue(progressDoc);
    learningProfileService.update.mockClear();
    learningProfileService.addCompletedMission.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: getModelToken('Progress'), useValue: progressModel },
        { provide: LearningProfileService, useValue: learningProfileService },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  it('applies mastery adjustments and updates linked services', async () => {
    const adjustments = new Map<string, number>([
      ['loops', 0.1],
      ['functions', -0.05],
    ]);

    const result = await service.applyAdaptiveMasteryUpdate(
      '507f1f77bcf86cd799439011',
      adjustments,
      {
        score: 95,
        weakConcepts: ['functions'],
        strongConcepts: ['loops'],
        timeSpent: 120,
        missionId: 'mission123',
        isSuccessful: true,
      },
    );

    expect(progressDoc.conceptMastery.get('loops')).toBe(50);
    expect(progressDoc.conceptMastery.get('functions')).toBe(0);
    expect(progressDoc.totalMissionsCompleted).toBe(3);
    expect(progressDoc.totalTimeSpent).toBe(150);
    expect(progressDoc.averageScore).toBeCloseTo(78.333, 1);

    expect(learningProfileService.update).toHaveBeenCalledTimes(1);
    expect(learningProfileService.addCompletedMission).toHaveBeenCalledTimes(1);

    expect(result.masterySnapshot.get('loops')).toBe(50);
  });

  it('does not increment completions when submission is unsuccessful', async () => {
    const adjustments = new Map<string, number>([['loops', -0.05]]);
    progressDoc.totalMissionsCompleted = 5;

    await service.applyAdaptiveMasteryUpdate(
      '507f1f77bcf86cd799439011',
      adjustments,
      {
        score: 40,
        weakConcepts: ['loops'],
        strongConcepts: [],
        timeSpent: 60,
        missionId: 'mission123',
        isSuccessful: false,
      },
    );

    expect(progressDoc.totalMissionsCompleted).toBe(5);
    expect(learningProfileService.addCompletedMission).not.toHaveBeenCalled();
  });
});
