import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { Mission, MissionSchema } from './schemas/mission.schema';
import { UsersModule } from '../users/users.module';
import { LearningProfileModule } from '../learning-profile/learning-profile.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mission.name, schema: MissionSchema }]),
    UsersModule,
    LearningProfileModule,
    GamificationModule,
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
