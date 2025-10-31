import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsIn,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Display nickname (minimum 3 characters) - used as username',
    example: 'Coder123',
    minLength: 3,
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'Frontend nickname field (maps to username)',
    example: 'Coder123',
    minLength: 3,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  nickname?: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Age range for the student',
    example: '8-10',
    enum: ['6-7', '8-10', '11-13', '14+'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['6-7', '8-10', '11-13', '14+'])
  ageRange: string;

  @ApiProperty({
    description: 'Avatar emoji or identifier (can be string or object)',
    example: '🐱',
    required: false,
  })
  @IsOptional()
  avatar?: string | Record<string, unknown>;

  @ApiProperty({
    description: 'Guardian email for progress updates',
    example: 'parent@email.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Selected avatar ID from frontend',
    example: '1',
    required: false,
  })
  @IsString()
  @IsOptional()
  selectedAvatar?: string;
}
