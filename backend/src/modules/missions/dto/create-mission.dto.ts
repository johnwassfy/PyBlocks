import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Step definition for step-based missions
export class MissionStepDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  instructions: string;

  @IsString()
  @IsOptional()
  starterCode?: string;

  @IsString()
  @IsOptional()
  expectedOutput?: string;

  @IsArray()
  @IsOptional()
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];

  @IsArray()
  @IsOptional()
  concepts?: string[];

  @IsArray()
  @IsOptional()
  hints?: string[];

  @IsBoolean()
  @IsOptional()
  aiCheckpoints?: boolean;

  @IsNumber()
  @IsOptional()
  xpReward?: number;
}

// Validation rules for anti-cheating
export class ValidationRulesDto {
  @IsBoolean()
  @IsOptional()
  disallowHardcodedOutput?: boolean;

  @IsArray()
  @IsOptional()
  requiredConcepts?: string[];

  @IsArray()
  @IsOptional()
  forbiddenPatterns?: string[];
}

// Mission configuration
export class MissionConfigDto {
  @IsBoolean()
  @IsOptional()
  allowSkipSteps?: boolean;
}

// Analytics data
export class MissionAnalyticsDto {
  @IsNumber()
  @IsOptional()
  averageStepsCompleted?: number;

  @IsNumber()
  @IsOptional()
  averageCompletionTime?: number;

  @IsNumber()
  @IsOptional()
  completionRate?: number;
}

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  starterCode?: string;

  @IsString()
  @IsOptional()
  expectedOutput?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsOptional()
  objectives?: string[];

  @IsArray()
  @IsOptional()
  hints?: string[];

  @IsArray()
  @IsOptional()
  concepts?: string[];

  @IsNumber()
  @IsOptional()
  xpReward?: number;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  estimatedTime?: number;

  @IsOptional()
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];

  // NEW: Step-based mission structure
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MissionStepDto)
  steps?: MissionStepDto[];

  // NEW: Validation rules for anti-cheating
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationRulesDto)
  validationRules?: ValidationRulesDto;

  // NEW: Mission configuration
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MissionConfigDto)
  config?: MissionConfigDto;

  // NEW: Analytics data
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MissionAnalyticsDto)
  analytics?: MissionAnalyticsDto;
}
