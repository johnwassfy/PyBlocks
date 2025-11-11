import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mission Context - Rich semantic data about the learning goal
 */
export class MissionContextDto {
  @ApiProperty({ example: 'The Storyteller' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Print three lines to tell a short story.' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: ['Use print statements', 'Structure output in multiple lines'] })
  @IsOptional()
  @IsArray()
  objectives?: string[];

  @ApiPropertyOptional({ example: ['print', 'strings', 'sequence'] })
  @IsOptional()
  @IsArray()
  concepts?: string[];

  @ApiPropertyOptional({ example: 'creative' })
  @IsOptional()
  @IsString()
  validationMode?: 'strict' | 'creative' | 'line-count' | 'concept-only';

  @ApiPropertyOptional({ example: 'Once upon a time...\nThere was a tiny dragon.\nIt loved to code.' })
  @IsOptional()
  @IsString()
  expectedOutput?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  expectedLineCount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isStoryBased?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  difficulty?: number;
}

/**
 * Student Context - Personalization data for adaptive feedback
 */
export class StudentContextDto {
  @ApiProperty({ example: 'user_123' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @IsNumber()
  xp?: number;

  @ApiPropertyOptional({ example: ['loops'] })
  @IsOptional()
  @IsArray()
  weakSkills?: string[];

  @ApiPropertyOptional({ example: ['print', 'strings'] })
  @IsOptional()
  @IsArray()
  strongSkills?: string[];

  @ApiPropertyOptional({ example: 'hands-on' })
  @IsOptional()
  @IsString()
  learningStyle?: string;

  @ApiPropertyOptional({ example: 'short' })
  @IsOptional()
  @IsString()
  feedbackPreference?: 'short' | 'detailed' | 'visual';

  @ApiPropertyOptional({ example: 'friendly' })
  @IsOptional()
  @IsString()
  aiTone?: 'friendly' | 'formal' | 'encouraging' | 'challenging';

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  attemptNumber?: number;

  @ApiPropertyOptional({ example: 183 })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  @ApiPropertyOptional({ example: 'Your story is missing one line!' })
  @IsOptional()
  @IsString()
  previousFeedback?: string;
}

/**
 * Submission Context - Technical data about code and execution
 */
export class SubmissionContextDto {
  @ApiProperty({ example: "print('Hello')\nprint('World')" })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Hello\nWorld' })
  @IsOptional()
  @IsString()
  output?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  executionResult?: {
    success: boolean;
    stdout: string;
    stderr: string;
    executionTime: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  testCases?: any[];

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsNumber()
  complexityScore?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  syntaxScore?: number;

  @ApiPropertyOptional({ example: 96 })
  @IsOptional()
  @IsNumber()
  codeLength?: number;

  @ApiPropertyOptional({ example: ['print', 'string-literals'] })
  @IsOptional()
  @IsArray()
  conceptsDetected?: string[];

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  lineCount?: number;
}

/**
 * Behavior Metrics - Engagement and frustration patterns
 */
export class BehaviorMetricsDto {
  @ApiPropertyOptional({ example: 12.4 })
  @IsOptional()
  @IsNumber()
  idleTime?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  correctionsMade?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  errorsLastAttempt?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  aiHintsUsed?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  proactiveHelpTriggered?: boolean;
}

/**
 * Validation Context - How the AI should judge correctness
 */
export class ValidationContextDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  checkExactOutput?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  checkLineCount?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  checkConcepts?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  disallowHardcodedOutput?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowCreativity?: boolean;

  @ApiPropertyOptional({ example: ['eval', 'exec'] })
  @IsOptional()
  @IsArray()
  forbiddenPatterns?: string[];
}

/**
 * Enhanced AI Analysis Request with Rich Context
 */
export class AiAnalysisRequestDto {
  @ApiProperty({ example: 'M_STORY_001' })
  @IsString()
  missionId: string;

  @ApiPropertyOptional({ example: 'z-ai/glm-4.5-air' })
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiProperty()
  @IsObject()
  missionContext: MissionContextDto;

  @ApiProperty()
  @IsObject()
  studentContext: StudentContextDto;

  @ApiProperty()
  @IsObject()
  submissionContext: SubmissionContextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  behaviorMetrics?: BehaviorMetricsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validationContext?: ValidationContextDto;

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsArray()
  testCases?: any[];

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsArray()
  concepts?: string[];

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  difficulty?: string;
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
