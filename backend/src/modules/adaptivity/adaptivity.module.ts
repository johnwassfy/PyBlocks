import { Module } from '@nestjs/common';
import { AdaptivityService } from './adaptivity.service';
import { AdaptivityController } from './adaptivity.controller';
import { ProgressModule } from '../progress/progress.module';
import { GamificationModule } from '../gamification/gamification.module';
import { MissionsModule } from '../missions/missions.module';
import { LearningProfileModule } from '../learning-profile/learning-profile.module';

@Module({
  imports: [
    ProgressModule,
    GamificationModule,
    MissionsModule,
    LearningProfileModule,
  ],
  controllers: [AdaptivityController],
  providers: [AdaptivityService],
  exports: [AdaptivityService],
})
export class AdaptivityModule {}
