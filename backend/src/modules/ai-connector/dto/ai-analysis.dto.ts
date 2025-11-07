import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standardized request format for AI service
 */
export class AiAnalysisRequestDto {
  @ApiProperty({
    description: 'Python code to analyze',
    example: 'def greet():\n    print("Hello, World!")',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Mission ID for context',
    example: '6742a1b2c3d4e5f6a7b8c9d0',
  })
  @IsString()
  missionId: string;

  @ApiPropertyOptional({
    description: 'Expected test cases',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  testCases?: Array<{
    input: any;
    expectedOutput: any;
    description?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Concepts being tested',
    example: ['loops', 'functions'],
  })
  @IsOptional()
  @IsArray()
  concepts?: string[];

  @ApiPropertyOptional({
    description: 'Difficulty level',
    example: 'medium',
  })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({
    description: 'Validation rules for anti-cheating',
    example: {
      disallowHardcodedOutput: true,
      requiredConcepts: ['loops', 'conditionals'],
      forbiddenPatterns: ['eval', 'exec'],
    },
  })
  @IsOptional()
  validationRules?: {
    disallowHardcodedOutput?: boolean;
    requiredConcepts?: string[];
    forbiddenPatterns?: string[];
  };

  @ApiPropertyOptional({
    description: 'Whether to enable AI checkpoints for this step',
    example: true,
  })
  @IsOptional()
  aiCheckpoints?: boolean;

  @ApiPropertyOptional({
    description: 'Current step number in step-based missions',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  currentStep?: number;
}

/**
 * Standardized response format from AI service
 */
export class AiAnalysisResponseDto {
  @ApiProperty({
    description: 'Overall success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Score out of 100',
    example: 85,
  })
  @IsNumber()
  score: number;

  @ApiProperty({
    description: 'Human-readable feedback',
    example: 'Great job! Your code works correctly.',
  })
  @IsString()
  feedback: string;

  @ApiPropertyOptional({
    description: 'Detected weak concepts',
    example: ['loops', 'edge cases'],
  })
  @IsOptional()
  @IsArray()
  weakConcepts?: string[];

  @ApiPropertyOptional({
    description: 'Strong concepts demonstrated',
    example: ['functions', 'variables'],
  })
  @IsOptional()
  @IsArray()
  strongConcepts?: string[];

  @ApiPropertyOptional({
    description: 'Helpful hints for improvement',
    example: ['Consider handling edge cases', 'Try using list comprehension'],
  })
  @IsOptional()
  @IsArray()
  hints?: string[];

  @ApiPropertyOptional({
    description: 'Specific code suggestions',
    example: ['Add error handling for empty lists'],
  })
  @IsOptional()
  @IsArray()
  suggestions?: string[];

  @ApiPropertyOptional({
    description: 'Test case results',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  testResults?: Array<{
    passed: boolean;
    input: any;
    expected: any;
    actual: any;
    description?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Execution time in milliseconds',
    example: 125,
  })
  @IsOptional()
  @IsNumber()
  executionTime?: number;

  @ApiPropertyOptional({
    description: 'Attempt count associated with the submission',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  attempts?: number;

  @ApiPropertyOptional({
    description: 'Time spent on the submission in seconds',
    example: 185,
  })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}
