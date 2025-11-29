import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LearningProfileService } from '../learning-profile/learning-profile.service';
import { GamificationService } from '../gamification/gamification.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // In-memory token blacklists (consider Redis for production)
  private tokenBlacklist: Set<string> = new Set();
  private refreshTokenBlacklist: Set<string> = new Set();

  constructor(
    private usersService: UsersService,
    private learningProfileService: LearningProfileService,
    private gamificationService: GamificationService,
    private jwtService: JwtService,
  ) { }

  // Helper method to generate access token (15 minutes)
  private generateAccessToken(userId: string, username: string): string {
    const payload = { sub: userId, username };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  // Helper method to generate refresh token (7 days)
  private generateRefreshToken(userId: string, username: string): string {
    const payload = { sub: userId, username, type: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  async register(registerDto: RegisterDto) {
    try {
      // Handle flexible field names from frontend
      const username = registerDto.username || registerDto.nickname;
      if (!username) {
        throw new BadRequestException('Username or nickname is required');
      }

      // Check if username already exists (BLOCKING)
      const existingUsername = await this.usersService.findByUsername(username);
      if (existingUsername) {
        throw new BadRequestException(
          'Username already exists. Please choose a different username.',
        );
      }

      // Check if email already exists (WARNING ONLY)
      let emailWarning: string | null = null;
      if (registerDto.email) {
        const existingEmail = await this.usersService.findByEmail(
          registerDto.email,
        );
        if (existingEmail) {
          emailWarning =
            'This email is already associated with another account.';
        }
      }

      // Handle avatar - could be object or string
      let avatarEmoji = '🐱'; // default
      if (registerDto.avatar) {
        if (typeof registerDto.avatar === 'string') {
          avatarEmoji = registerDto.avatar;
        } else if (typeof registerDto.avatar === 'object') {
          const avatarObj = registerDto.avatar;
          if (avatarObj.emoji && typeof avatarObj.emoji === 'string') {
            avatarEmoji = avatarObj.emoji;
          }
        }
      }

      const user = await this.usersService.create({
        username,
        password: registerDto.password,
        ageRange: registerDto.ageRange,
        avatar: avatarEmoji,
        guardianEmail: registerDto.email, // Store guardian email
      });

      // Create learning profile for the new user
      await this.learningProfileService.create(user._id);

      // Get or create gamification profile
      const gamification =
        await this.gamificationService.getOrCreateGamification(
          user._id.toString(),
        );

      const accessToken = this.generateAccessToken(user._id.toString(), user.username);
      const refreshToken = this.generateRefreshToken(user._id.toString(), user.username);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user._id.toString(),
          username: user.username,
          avatar: user.avatar,
          ageRange: user.ageRange,
          xp: gamification.xp,
          level: gamification.level,
        },
        warning: emailWarning, // Include warning about email if exists
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  async login(loginDto: LoginDto) {
    // Handle flexible field names - accept either username or email field
    const usernameOrEmail = loginDto.username || loginDto.email;
    if (!usernameOrEmail) {
      throw new UnauthorizedException('Username or email is required');
    }

    const user = await this.usersService.findByUsername(usernameOrEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get gamification profile for XP and level
    const gamification = await this.gamificationService.getOrCreateGamification(
      user._id.toString(),
    );

    const accessToken = this.generateAccessToken(user._id.toString(), user.username);
    const refreshToken = this.generateRefreshToken(user._id.toString(), user.username);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        ageRange: user.ageRange,
        xp: gamification.xp,
        level: gamification.level,
        achievementCount: gamification.achievements.length,
      },
    };
  }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
      const { password: _, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async checkUsernameAvailability(username: string): Promise<{
    available: boolean;
  }> {
    if (!username || username.length < 3) {
      return { available: false };
    }

    const existingUser = await this.usersService.findByUsername(username);
    return { available: !existingUser };
  }

  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    if (!email || !email.includes('@')) {
      return { exists: false };
    }

    const existingUser = await this.usersService.findByEmail(email);
    return { exists: !!existingUser };
  }

  async logout(token: string): Promise<{ message: string }> {
    // Add token to blacklist
    this.tokenBlacklist.add(token);

    // Optional: Set a timeout to remove token from blacklist after expiry
    // For now, tokens remain blacklisted indefinitely

    return { message: 'Logged out successfully' };
  }

  async verifyToken(token: string): Promise<{
    valid: boolean;
    user?: any;
  }> {
    try {
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        return { valid: false };
      }

      // Verify token signature and expiration
      const payload = this.jwtService.verify(token);

      // Verify user still exists
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          avatar: user.avatar,
          ageRange: user.ageRange,
        },
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async refreshToken(refreshTokenString: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: any;
  }> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshTokenString) as {
        sub: string;
        username: string;
        type?: string;
      };

      if (!payload || !payload.sub || payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token is blacklisted
      if (this.refreshTokenBlacklist.has(refreshTokenString)) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Verify user still exists
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Get gamification data
      const gamification =
        await this.gamificationService.getOrCreateGamification(
          user._id.toString(),
        );

      // Generate new access and refresh tokens (rotation)
      const newAccessToken = this.generateAccessToken(user._id.toString(), user.username);
      const newRefreshToken = this.generateRefreshToken(user._id.toString(), user.username);

      // Blacklist the old refresh token
      this.refreshTokenBlacklist.add(refreshTokenString);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        user: {
          id: user._id.toString(),
          username: user.username,
          avatar: user.avatar,
          ageRange: user.ageRange,
          xp: gamification.xp,
          level: gamification.level,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }
}
