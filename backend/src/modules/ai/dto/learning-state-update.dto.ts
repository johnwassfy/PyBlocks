import {
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  IsOptional,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AnalysisDto {
  @ApiProperty({ example: ['loops', 'conditionals', 'functions'] })
  @IsArray()
  @IsString({ each: true })
  detectedConcepts: string[];

  @ApiProperty({ example: ['loop logic', 'boundary conditions'] })
  @IsArray()
  @IsString({ each: true })
  weaknesses: string[];

  @ApiProperty({ example: ['code structure', 'variable naming'] })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @ApiProperty({
    example: ['Practice nested loops', 'Review range() function'],
  })
  @IsArray()
  @IsString({ each: true })
  suggestions: string[];

  @ApiProperty({ example: { loops: 75, conditionals: 90 } })
  @IsObject()
  conceptScores: { [key: string]: number };

  @ApiProperty({ example: true })
  @IsBoolean()
  isSuccessful: boolean;

  @ApiProperty({ example: 85 })
  @IsNumber()
  score: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  attempts?: number;

  @ApiPropertyOptional({ example: 185 })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class LearningStateUpdateDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '507f191e810c19729de860ea' })
  @IsString()
  submissionId: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AnalysisDto)
  analysis: AnalysisDto;
}
