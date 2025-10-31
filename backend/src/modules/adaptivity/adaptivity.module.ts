import { Module } from '@nestjs/common';
import { AdaptivityService } from './adaptivity.service';
import { ProgressModule } from '../progress/progress.module';
import { GamificationModule } from '../gamification/gamification.module';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [ProgressModule, GamificationModule, MissionsModule],
  providers: [AdaptivityService],
  exports: [AdaptivityService],
})
export class AdaptivityModule {}
