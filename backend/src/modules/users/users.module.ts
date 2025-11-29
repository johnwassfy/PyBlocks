import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { GamificationModule } from '../gamification/gamification.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ProgressModule } from '../progress/progress.module';
import { LearningProfileModule } from '../learning-profile/learning-profile.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => GamificationModule),
    forwardRef(() => SubmissionsModule),
    forwardRef(() => ProgressModule),
    LearningProfileModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
