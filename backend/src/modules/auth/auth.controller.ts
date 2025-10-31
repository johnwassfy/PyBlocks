import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '507f1f77bcf86cd799439011',
          username: 'student1',
          xp: 0,
          level: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Username already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login with existing credentials' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '507f1f77bcf86cd799439011',
          username: 'demo',
          xp: 150,
          level: 2,
          badges: ['first-mission', 'quick-learner'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('check-username')
  @ApiOperation({ summary: 'Check if username is available' })
  @ApiResponse({
    status: 200,
    description: 'Username availability check result',
    schema: {
      example: {
        available: true,
      },
    },
  })
  async checkUsername(@Query('username') username: string) {
    return await this.authService.checkUsernameAvailability(username);
  }

  @Get('check-email')
  @ApiOperation({ summary: 'Check if email is already in use' })
  @ApiResponse({
    status: 200,
    description: 'Email check result',
    schema: {
      example: {
        exists: false,
      },
    },
  })
  async checkEmail(@Query('email') email: string) {
    return await this.authService.checkEmailExists(email);
  }
}
