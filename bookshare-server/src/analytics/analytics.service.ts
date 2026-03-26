import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private recent = new Map<string, number>();
  private readonly dedupeMs = 30_000;

  constructor(private prisma: PrismaService) {}

  async trackVisit(input: {
    visitorId: string;
    path: string;
    referrer?: string;
    userAgent?: string;
  }) {
    const key = `${input.visitorId}:${input.path}`;
    const now = Date.now();
    const last = this.recent.get(key);
    if (last && now - last < this.dedupeMs) return { ok: true, deduped: true };
    this.recent.set(key, now);

    if (this.recent.size > 10_000) {
      const threshold = now - this.dedupeMs;
      for (const [k, t] of this.recent.entries()) {
        if (t < threshold) this.recent.delete(k);
      }
    }

    await this.prisma.visitEvent.create({
      data: {
        visitorId: input.visitorId,
        path: input.path,
        referrer: input.referrer,
        userAgent: input.userAgent,
      },
    });

    return { ok: true };
  }
}
