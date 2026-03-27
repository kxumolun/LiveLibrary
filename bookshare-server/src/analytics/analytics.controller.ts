import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('public-stats')
  getPublicStats() {
    return this.analytics.getPublicStats();
  }

  @Post('visit')
  trackVisit(
    @Body() body: { visitorId?: string; path?: string; referrer?: string },
    @Headers('user-agent') userAgent?: string,
  ) {
    const visitorId = (body?.visitorId || '').trim();
    const path = (body?.path || '').trim();
    if (!visitorId || visitorId.length < 8) {
      throw new BadRequestException("visitorId noto'g'ri");
    }
    if (!path || !path.startsWith('/')) {
      throw new BadRequestException("path noto'g'ri");
    }
    return this.analytics.trackVisit({
      visitorId,
      path: path.slice(0, 180),
      referrer: body?.referrer?.slice(0, 300),
      userAgent: userAgent?.slice(0, 300),
    });
  }
}
