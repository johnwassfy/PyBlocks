import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LearningProfileService } from '../learning-profile/learning-profile.service';
import { GamificationService } from '../gamification/gamification.service';
import { Types } from 'mongoose';

@ApiTags('missions')
@ApiBearerAuth('JWT-auth')
@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly learningProfileService: LearningProfileService,
    private readonly gamificationService: GamificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new mission (admin only)' })
  @ApiResponse({ status: 201, description: 'Mission created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createMissionDto: CreateMissionDto) {
    return this.missionsService.create(createMissionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all missions, optionally filtered by difficulty',
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    description: 'Filter by difficulty level',
    enum: ['beginner', 'intermediate', 'advanced'],
  })
  @ApiResponse({ status: 200, description: 'List of missions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('difficulty') difficulty?: string) {
    return this.missionsService.findAll(difficulty);
  }

  @Get('adaptive')
  @ApiOperation({
    summary: 'Get personalized missions based on user weaknesses',
  })
  @ApiResponse({ status: 200, description: 'Adaptive mission recommendations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdaptiveMissions(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    const learningProfile = await this.learningProfileService.getByUserId(
      new Types.ObjectId(user.userId),
    );
    const gamification = await this.gamificationService.getGamification(
      user.userId,
    );
    const completedMissions = gamification
      ? gamification.completedMissions.map((id) => id.toString())
      : [];
    return this.missionsService.getAdaptiveMissions(
      learningProfile.weakSkills,
      completedMissions,
    );
  }

  @Get('next')
  @ApiOperation({ summary: 'Get the next recommended mission for user' })
  @ApiResponse({ status: 200, description: 'Next mission recommendation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNextMission(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    const gamification = await this.gamificationService.getGamification(
      user.userId,
    );
    const completedMissions = gamification
      ? gamification.completedMissions.map((id) => id.toString())
      : [];
    return this.missionsService.getNextMission(completedMissions);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific mission by ID' })
  @ApiParam({ name: 'id', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async findById(@Param('id') id: string) {
    return this.missionsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a mission (admin only)' })
  @ApiParam({ name: 'id', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMissionDto: UpdateMissionDto,
  ) {
    return this.missionsService.update(id, updateMissionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a mission (admin only)' })
  @ApiParam({ name: 'id', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Mission deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async delete(@Param('id') id: string) {
    await this.missionsService.delete(id);
    return { message: 'Mission deleted successfully' };
  }
}
