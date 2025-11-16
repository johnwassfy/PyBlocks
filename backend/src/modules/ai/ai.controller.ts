import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LearningStateUpdateDto } from './dto/learning-state-update.dto';
import { ChatbotInteractionDto } from './dto/chatbot-interaction.dto';

@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('hint')
  @ApiOperation({ summary: 'Get AI-powered hint for a mission' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        missionId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        code: {
          type: 'string',
          example: 'def hello():\n    # help me here',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI hint generated',
    schema: {
      example: {
        hint: 'Try using the print() function to display output.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHint(@Body() body: { missionId: string; code: string }) {
    return this.aiService.generateHint(body.missionId, body.code);
  }

  @Post('recommendations')
  @ApiOperation({
    summary: 'Get personalized AI recommendations based on weak skills',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        weakSkills: {
          type: 'array',
          items: { type: 'string' },
          example: ['loops', 'error-handling'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI recommendations generated',
    schema: {
      example: {
        recommendations: [
          'Practice more with for loops',
          'Try missions focusing on error handling',
        ],
        adaptive_hints: ['Start with simple loop exercises'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecommendations(
    @CurrentUser() user: { userId: string; username: string },
    @Body() body: { weakSkills: string[] },
  ) {
    return this.aiService.getAdaptiveRecommendations(
      user.userId,
      body.weakSkills,
    );
  }

  @Post('update-learning-state')
  @ApiOperation({
    summary:
      'Update student learning state based on AI analysis (called by AI service)',
  })
  @ApiBody({ type: LearningStateUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Learning state updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Learning state updated successfully',
        updates: {
          conceptsUpdated: 3,
          weaknessesIdentified: 2,
          strengthsIdentified: 2,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or submission not found' })
  async updateLearningState(@Body() dto: LearningStateUpdateDto) {
    return this.aiService.updateLearningState(dto);
  }

  @Post('chatbot-interaction')
  @ApiOperation({
    summary: 'Store chatbot interaction for learning analytics',
    description:
      'Saves chatbot conversations to track difficulty patterns and update learning state',
  })
  @ApiBody({ type: ChatbotInteractionDto })
  @ApiResponse({
    status: 200,
    description: 'Chatbot interaction stored successfully',
    schema: {
      example: {
        success: true,
        message: 'Interaction saved successfully',
        analytics: {
          difficultConcepts: ['loops', 'functions'],
          helpFrequency: 'medium',
          conversationQuality: 'productive',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async storeChatbotInteraction(@Body() dto: ChatbotInteractionDto) {
    return await this.aiService.storeChatbotInteraction(dto);
  }
}
