import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MissionsModule } from './modules/missions/missions.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ProgressModule } from './modules/progress/progress.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdaptivityModule } from './modules/adaptivity/adaptivity.module';
import { LearningProfileModule } from './modules/learning-profile/learning-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Event-driven architecture for async processing
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/pyblocks',
    ),
    AuthModule,
    UsersModule,
    LearningProfileModule,
    MissionsModule,
    SubmissionsModule,
    ProgressModule,
    GamificationModule,
    AiModule,
    AnalyticsModule,
    AdaptivityModule, // New adaptive learning brain
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
