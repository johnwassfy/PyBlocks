import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdaptivityService } from './adaptivity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('adaptivity')
@ApiBearerAuth('JWT-auth')
@Controller('adaptivity')
@UseGuards(JwtAuthGuard)
export class AdaptivityController {
  constructor(private readonly adaptivityService: AdaptivityService) {}

  @Get('insights')
  @ApiOperation({ summary: 'Get adaptive learning insights for current user' })
  @ApiResponse({ status: 200, description: 'Adaptive insights retrieved' })
  async getInsights(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.adaptivityService.getUserInsights(user.userId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get adaptivity processing metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  async getMetrics(
    @CurrentUser() user: { userId: string; username: string },
  ) {
    // Endpoint guarded by JWT; returning aggregate metrics only.
    return this.adaptivityService.getMetrics();
  }
}

