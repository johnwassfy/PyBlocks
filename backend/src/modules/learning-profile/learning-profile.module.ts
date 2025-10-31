import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningProfileController } from './learning-profile.controller';
import { LearningProfileService } from './learning-profile.service';
import {
  LearningProfile,
  LearningProfileSchema,
} from './schemas/learning-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningProfile.name, schema: LearningProfileSchema },
    ]),
  ],
  controllers: [LearningProfileController],
  providers: [LearningProfileService],
  exports: [LearningProfileService], // Export so other modules can use it
})
export class LearningProfileModule {}
