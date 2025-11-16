import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import {
  Submission,
  SubmissionSchema,
} from '../submissions/schemas/submission.schema';
import {
  SubmissionLog,
  SubmissionLogSchema,
} from '../submissions/schemas/submission-log.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Mission, MissionSchema } from '../missions/schemas/mission.schema';
import {
  LearningProfile,
  LearningProfileSchema,
} from '../learning-profile/schemas/learning-profile.schema';
import {
  Gamification,
  GamificationSchema,
} from '../gamification/schemas/gamification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: SubmissionLog.name, schema: SubmissionLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Mission.name, schema: MissionSchema },
      { name: LearningProfile.name, schema: LearningProfileSchema },
      { name: Gamification.name, schema: GamificationSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
