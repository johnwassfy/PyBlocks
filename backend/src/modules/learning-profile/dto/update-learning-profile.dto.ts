import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsObject } from 'class-validator';

export class UpdateLearningProfileDto {
  @IsOptional()
  @IsEnum(['none', 'beginner', 'intermediate'])
  codingExperience?: 'none' | 'beginner' | 'intermediate';

  @IsOptional()
  @IsEnum(['none', 'some', 'comfortable'])
  pythonFamiliarity?: 'none' | 'some' | 'comfortable';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownConcepts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weakSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strongSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedMissions?: string[];

  @IsOptional()
  @IsNumber()
  totalSubmissions?: number;

  @IsOptional()
  @IsNumber()
  successfulSubmissions?: number;

  @IsOptional()
  @IsNumber()
  avgAccuracy?: number;

  @IsOptional()
  @IsNumber()
  xp?: number;

  @IsOptional()
  @IsNumber()
  level?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  badges?: string[];

  @IsOptional()
  @IsObject()
  skillScores?: Record<string, number>;
}
