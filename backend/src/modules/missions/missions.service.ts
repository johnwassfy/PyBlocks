import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mission, MissionDocument } from './schemas/mission.schema';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Injectable()
export class MissionsService {
  constructor(
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
  ) {}

  async create(createMissionDto: CreateMissionDto): Promise<MissionDocument> {
    const mission = new this.missionModel(createMissionDto);
    return mission.save();
  }

  async findAll(difficulty?: string): Promise<MissionDocument[]> {
    const query = difficulty
      ? { difficulty, isActive: true }
      : { isActive: true };
    return this.missionModel.find(query).sort({ order: 1 }).exec();
  }

  async findById(id: string): Promise<MissionDocument> {
    const mission = await this.missionModel.findById(id).exec();
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  async update(
    id: string,
    updateMissionDto: UpdateMissionDto,
  ): Promise<MissionDocument> {
    const mission = await this.missionModel
      .findByIdAndUpdate(id, updateMissionDto, { new: true })
      .exec();
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  async delete(id: string): Promise<void> {
    const result = await this.missionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Mission not found');
    }
  }

  async getAdaptiveMissions(
    weakSkills: string[],
    completedMissions: string[],
    options: {
      excludeMissionIds?: string[];
      difficulty?: string;
      limit?: number;
    } = {},
  ): Promise<MissionDocument[]> {
    const excludedIds = [...completedMissions, ...(options.excludeMissionIds || [])];

    const query: Record<string, unknown> = {
      isActive: true,
      _id: { $nin: excludedIds },
    };

    if (weakSkills.length > 0) {
      query['tags'] = { $in: weakSkills };
    }

    if (options.difficulty) {
      query['difficulty'] = options.difficulty;
    }

    return this.missionModel
      .find(query)
      .sort({ order: 1 })
      .limit(options.limit ?? 5)
      .exec();
  }

  async getNextMission(
    completedMissions: string[],
  ): Promise<MissionDocument | null> {
    // Get the first incomplete mission by order
    return this.missionModel
      .findOne({
        isActive: true,
        _id: { $nin: completedMissions },
      })
      .sort({ order: 1 })
      .exec();
  }
}
