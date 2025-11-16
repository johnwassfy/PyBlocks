import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('gamification')
@ApiBearerAuth('JWT-auth')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get gamification stats for current user' })
  @ApiResponse({
    status: 200,
    description: 'Gamification data retrieved',
    schema: {
      example: {
        userId: '507f191e810c19729de860ea',
        xp: 350,
        level: 4,
        badges: ['first-mission', 'quick-learner', 'streak-3'],
        streak: 5,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGamification(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.gamificationService.getOrCreateGamification(user.userId);
  }

  @Get('my-profile')
  @ApiOperation({ summary: 'Get gamification profile for current user' })
  @ApiResponse({
    status: 200,
    description: 'Gamification profile retrieved',
    schema: {
      example: {
        userId: '507f191e810c19729de860ea',
        xp: 350,
        level: 4,
        badges: ['first-mission', 'quick-learner', 'streak-3'],
        streak: 5,
        completedMissions: ['mission1', 'mission2', 'mission3'],
        achievements: [],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.gamificationService.getOrCreateGamification(user.userId);
  }
}
