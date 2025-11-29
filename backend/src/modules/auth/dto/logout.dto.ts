import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    description: 'Optional device identifier for multi-device logout',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
