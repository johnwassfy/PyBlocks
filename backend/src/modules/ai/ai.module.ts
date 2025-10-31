import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Progress, ProgressSchema } from '../progress/schemas/progress.schema';
import {
  Submission,
  SubmissionSchema,
} from '../submissions/schemas/submission.schema';
import {
  ChatbotConversation,
  ChatbotConversationSchema,
} from '../chatbot/schemas/chatbot-conversation.schema';
import { LearningProfileModule } from '../learning-profile/learning-profile.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    LearningProfileModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Progress.name, schema: ProgressSchema },
      { name: Submission.name, schema: SubmissionSchema },
      {
        name: ChatbotConversation.name,
        schema: ChatbotConversationSchema,
      },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
