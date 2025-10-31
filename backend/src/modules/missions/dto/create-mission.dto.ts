import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';

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
}
