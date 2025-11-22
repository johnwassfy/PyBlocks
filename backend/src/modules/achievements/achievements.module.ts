import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { AchievementSchema } from './schemas/achievement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Achievement', schema: AchievementSchema },
    ]),
  ],
  providers: [AchievementsService],
  controllers: [AchievementsController],
  exports: [AchievementsService],
})
export class AchievementsModule {}
