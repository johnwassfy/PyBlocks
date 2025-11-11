import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import {
  SubmissionLog,
  SubmissionLogSchema,
} from './schemas/submission-log.schema';
import { UsersModule } from '../users/users.module';
import { MissionsModule } from '../missions/missions.module';
import { AiModule } from '../ai/ai.module';
import { AdaptivityModule } from '../adaptivity/adaptivity.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: SubmissionLog.name, schema: SubmissionLogSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => MissionsModule),
    AiModule,
    AdaptivityModule, // New: Handles all adaptive logic
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
