import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('progress')
@ApiBearerAuth('JWT-auth')
@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get learning progress for current user' })
  @ApiResponse({
    status: 200,
    description: 'Progress data retrieved',
    schema: {
      example: {
        userId: '507f191e810c19729de860ea',
        conceptMastery: {
          functions: 85,
          loops: 65,
          conditionals: 90,
        },
        weakConcepts: ['loops', 'error-handling'],
        strongConcepts: ['functions', 'conditionals'],
        completedConcepts: ['print'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProgress(@CurrentUser() user: { userId: string; username: string }) {
    return this.progressService.getOrCreateProgress(user.userId);
  }
}
