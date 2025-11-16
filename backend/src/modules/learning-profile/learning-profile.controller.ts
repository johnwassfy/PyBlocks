import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { LearningProfileService } from './learning-profile.service';
import { UpdateLearningProfileDto } from './dto/update-learning-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('learning-profile')
@UseGuards(JwtAuthGuard)
export class LearningProfileController {
  constructor(
    private readonly learningProfileService: LearningProfileService,
  ) {}

  /**
   * Get current user's learning profile
   * GET /learning-profile
   */
  @Get()
  async getMyProfile(@CurrentUser() user: { userId: string }) {
    return this.learningProfileService.getByUserId(
      new Types.ObjectId(user.userId),
    );
  }

  /**
   * Update current user's learning profile
   * PATCH /learning-profile
   */
  @Patch()
  async updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() updateDto: UpdateLearningProfileDto,
  ) {
    return this.learningProfileService.update(
      new Types.ObjectId(user.userId),
      updateDto,
    );
  }
}
