import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('submissions')
@ApiBearerAuth('JWT-auth')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit code for a mission' })
  @ApiResponse({
    status: 201,
    description: 'Submission created and analyzed',
    schema: {
      example: {
        submission: {
          _id: '507f1f77bcf86cd799439011',
          userId: '507f191e810c19729de860ea',
          missionId: '507f1f77bcf86cd799439012',
          code: 'def hello():\n    print("Hello, World!")',
          isSuccessful: true,
          score: 50,
          feedback: 'Great job! Your code works perfectly.',
        },
        aiResult: {
          status: 'success',
          feedback: 'Great job! Your code works perfectly.',
          concepts_detected: ['functions', 'print'],
        },
        xpGained: 50,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async create(
    @CurrentUser() user: { userId: string; username: string },
    @Body() createSubmissionDto: CreateSubmissionDto,
  ): Promise<{
    submission: any;
    aiResult: any;
    xpGained: number;
  }> {
    return this.submissionsService.create(user.userId, createSubmissionDto);
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get all submissions by current user' })
  @ApiResponse({ status: 200, description: 'List of user submissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMySubmissions(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.submissionsService.findByUserId(user.userId);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get submission statistics for current user' })
  @ApiResponse({
    status: 200,
    description: 'User submission statistics',
    schema: {
      example: {
        total: 10,
        successful: 7,
        successRate: 70,
        totalScore: 350,
        averageAttempts: 2.3,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyStats(@CurrentUser() user: { userId: string; username: string }) {
    return this.submissionsService.getUserSubmissionStats(user.userId);
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Get all submissions for a specific mission' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'List of mission submissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubmissionsByMission(@Param('missionId') missionId: string) {
    return this.submissionsService.findByMissionId(missionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific submission by ID' })
  @ApiParam({ name: 'id', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async findById(@Param('id') id: string) {
    return this.submissionsService.findById(id);
  }
}
