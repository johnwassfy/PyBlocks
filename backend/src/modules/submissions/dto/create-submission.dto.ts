import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
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
}
