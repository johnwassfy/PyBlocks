import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}
