import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { forwardRef, Inject } from '@nestjs/common';
import { GamificationService } from '../gamification/gamification.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { ProgressService } from '../progress/progress.service';
import { LearningProfileService } from '../learning-profile/learning-profile.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => GamificationService))
    private gamificationService: GamificationService,
    @Inject(forwardRef(() => SubmissionsService))
    private submissionsService: SubmissionsService,
    @Inject(forwardRef(() => ProgressService))
    private progressService: ProgressService,
    private learningProfileService: LearningProfileService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return newUser.save();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ guardianEmail: email }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Note: XP, badges, missions, and skills are now managed in LearningProfileService
  // These methods are deprecated and will be removed in a future version

  async getLeaderboard(limit: number = 10): Promise<UserDocument[]> {
    // TODO: Update to fetch from learning profiles instead
    return this.userModel
      .find()
      .sort({ username: 1 })
      .limit(limit)
      .select('-password')
      .exec();
  }

  async getUserProfile(userId: string): Promise<Partial<UserDocument>> {
    const user = await this.findById(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
    const { password: _, ...profile } = user.toObject();

    // Transform _id to id for consistency with auth response
    return {
      ...profile,
      id: user._id.toString(),
    };
  }

  /**
   * ✏️ Update user profile
   */
  async update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 🗑️ Delete user account and all related data (Cascade)
   */
  async delete(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cascade delete
    await this.gamificationService.delete(userId);
    await this.submissionsService.delete(userId);
    await this.progressService.delete(userId);
    await this.learningProfileService.delete(user._id); // LearningProfile uses ObjectId

    // Finally delete the user
    await this.userModel.findByIdAndDelete(userId).exec();
  }
}
