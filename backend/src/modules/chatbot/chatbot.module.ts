import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChatbotConversation,
  ChatbotConversationSchema,
} from './schemas/chatbot-conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatbotConversation.name, schema: ChatbotConversationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ChatbotModule {}
