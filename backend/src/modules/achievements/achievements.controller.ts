import { Controller, Get, Post } from '@nestjs/common';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  // Return all canonical achievements from database
  @Get()
  async getAll() {
    return this.achievementsService.getAll();
  }

  // Return persisted achievements (alias for getAll)
  @Get('persisted')
  async getPersisted() {
    return this.achievementsService.getPersisted();
  }
}
