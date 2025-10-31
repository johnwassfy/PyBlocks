import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import {
  Gamification,
  GamificationSchema,
} from './schemas/gamification.schema';
import { UsersModule } from '../users/users.module';
import { LearningProfileModule } from '../learning-profile/learning-profile.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Gamification.name, schema: GamificationSchema },
    ]),
    forwardRef(() => UsersModule),
    LearningProfileModule,
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
