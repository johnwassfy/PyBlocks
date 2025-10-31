import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ChatMessageDto {
  @ApiProperty({ example: 'user' })
  @IsString()
  role: string;

  @ApiProperty({ example: 'Hi! Can you help me?' })
  @IsString()
  content: string;

  @ApiProperty({ example: '2025-01-15T10:30:00Z', required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ example: '👋', required: false })
  @IsOptional()
  @IsString()
  emoji?: string;
}

class DifficultyAnalysisDto {
  @ApiProperty({ example: ['loops', 'functions'] })
  @IsArray()
  @IsString({ each: true })
  difficultConcepts: string[];

  @ApiProperty({ example: ['variables', 'print'] })
  @IsArray()
  @IsString({ each: true })
  easyConcepts: string[];

  @ApiProperty({ example: ['getting_stuck', 'error_confusion'] })
  @IsArray()
  @IsString({ each: true })
  questionPatterns: string[];

  @ApiProperty({ example: 'medium' })
  @IsString()
  helpFrequency: string;
}

export class ChatbotInteractionDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  missionId: string;

  @ApiProperty({ example: '507f191e810c19729de860ea', required: false })
  @IsOptional()
  @IsString()
  submissionId?: string;

  @ApiProperty({ example: "I'm not sure how to begin!" })
  @IsString()
  question: string;

  @ApiProperty({ example: 'stuck_1', required: false })
  @IsOptional()
  @IsString()
  promptId?: string;

  @ApiProperty({ example: '# My code', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'SyntaxError: invalid syntax', required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ type: [ChatMessageDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  conversationHistory?: ChatMessageDto[];

  @ApiProperty({ example: ['loops'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weakConcepts?: string[];

  @ApiProperty({ example: ['functions'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strongConcepts?: string[];

  @ApiProperty({ example: 2 })
  @IsNumber()
  attemptNumber: number;

  @ApiProperty({ type: DifficultyAnalysisDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyAnalysisDto)
  difficultyAnalysis?: DifficultyAnalysisDto;

  @ApiProperty({ example: 'Great question! Let me help...' })
  @IsString()
  response: string;

  @ApiProperty({ example: 'gentle' })
  @IsString()
  hintType: string;
}
