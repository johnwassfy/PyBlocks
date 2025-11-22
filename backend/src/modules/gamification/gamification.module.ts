import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import {
  Gamification,
  GamificationSchema,
} from './schemas/gamification.schema';
import {
  Achievement,
  AchievementSchema,
} from '../achievements/schemas/achievement.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Gamification.name, schema: GamificationSchema },
      { name: Achievement.name, schema: AchievementSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
