import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard analytics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard() {
    return this.analyticsService.getDashboardData();
  }

  @Get('overall')
  @ApiOperation({ summary: 'Get overall platform statistics' })
  @ApiResponse({ status: 200, description: 'Overall stats retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverallStats() {
    return this.analyticsService.getOverallStats();
  }

  @Get('concepts')
  @ApiOperation({ summary: 'Get concept mastery statistics across users' })
  @ApiResponse({ status: 200, description: 'Concepts mastery data retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConceptsMastery() {
    return this.analyticsService.getConceptsMastery();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get analytics for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAnalytics(@Param('userId') userId: string) {
    return this.analyticsService.getUserAnalytics(userId);
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Get analytics for a specific mission' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission analytics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async getMissionAnalytics(@Param('missionId') missionId: string) {
    return this.analyticsService.getMissionAnalytics(missionId);
  }

  @Get('my-analytics')
  @ApiOperation({ summary: 'Get analytics for current user' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyAnalytics(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.analyticsService.getUserAnalytics(user.userId);
  }
}
