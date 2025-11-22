import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Achievement as AchievementClass } from '../achievements/schemas/achievement.schema';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(@InjectModel('Achievement') private achievementModel: Model<any>) {}

  /**
   * Return all canonical achievement definitions from the database.
   */
  async getAll(): Promise<any[]> {
    return this.achievementModel.find().lean().exec();
  }

  /**
   * Return persisted achievements from DB (alias for getAll).
   */
  async getPersisted(): Promise<any[]> {
    return this.achievementModel.find().lean().exec();
  }
}
