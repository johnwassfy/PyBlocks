import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'ID of the mission being attempted',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({
    description: 'The Python code submitted by the user',
    example: 'def hello():\n    print("Hello, World!")\n\nhello()',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'Output from running the code',
    example: 'Hello, World!',
  })
  @IsString()
  @IsOptional()
  output?: string;

  @ApiPropertyOptional({
    description: 'Time spent on the mission in seconds',
    example: 120,
  })
  @IsNumber()
  @IsOptional()
  timeSpent?: number;

  @ApiPropertyOptional({
    description: 'Number of attempts made',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  attempts?: number;

  @ApiPropertyOptional({
    description: 'AI model metadata for analytics tracking',
    example: {
      model: 'glm-4.5-air',
      provider: 'z-ai',
      version: '1.0',
      hintsRequested: 2,
      proactiveHelp: 1,
      chatbotInteractions: 3,
      responseTime: 450,
      sessionId: 'sess_123',
    },
  })
  @IsObject()
  @IsOptional()
  aiMetadata?: {
    model?: string;
    provider?: string;
    version?: string;
    hintsRequested?: number;
    proactiveHelp?: number;
    chatbotInteractions?: number;
    responseTime?: number;
    sessionId?: string;
    errors?: string[];
    idleTime?: number;
    usedStarterCode?: boolean;
    proactiveIntervention?: boolean;
    interventionReason?: string;
    learningState?: string;
    confidenceLevel?: number;
    frustrationLevel?: number;
    sessionDuration?: number;
    experimentGroup?: string;
    additionalMetrics?: Record<string, any>;
  };
}

