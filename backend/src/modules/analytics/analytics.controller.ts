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

  @Get('ai-models')
  @ApiOperation({
    summary: 'Compare AI model performance metrics for thesis research',
  })
  @ApiResponse({ status: 200, description: 'AI model comparison retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAiModelComparison() {
    return this.analyticsService.getAiModelComparison();
  }

  @Get('submission-logs')
  @ApiOperation({
    summary: 'Get detailed submission logs for data export',
  })
  @ApiResponse({ status: 200, description: 'Submission logs retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubmissionLogs() {
    return this.analyticsService.getSubmissionLogs();
  }

  @Get('student-journey/:anonymizedUserId')
  @ApiOperation({ summary: 'Get individual student learning journey' })
  @ApiParam({
    name: 'anonymizedUserId',
    description: 'Anonymized Student ID',
  })
  @ApiResponse({ status: 200, description: 'Student journey retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStudentJourney(@Param('anonymizedUserId') anonymizedUserId: string) {
    return this.analyticsService.getStudentJourney(anonymizedUserId);
  }

  // ========== PRE/POST TEST ANALYTICS ==========

  @Get('tests/pre/:userId')
  @ApiOperation({ summary: 'Get pre-test results for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Pre-test results retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreTestResults(@Param('userId') userId: string) {
    return this.analyticsService.getPreTestResults(userId);
  }

  @Get('tests/post/:userId')
  @ApiOperation({ summary: 'Get post-test results for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Post-test results retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPostTestResults(@Param('userId') userId: string) {
    return this.analyticsService.getPostTestResults(userId);
  }

  @Get('tests/comparison/:userId')
  @ApiOperation({ summary: 'Compare pre vs post test results for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Test comparison retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTestComparison(@Param('userId') userId: string) {
    return this.analyticsService.getTestComparison(userId);
  }

  @Get('tests/export')
  @ApiOperation({ summary: 'Export all test data for research analysis' })
  @ApiResponse({
    status: 200,
    description: 'All test data exported (CSV-ready format)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportTestData() {
    return this.analyticsService.getAllTestData();
  }
}
