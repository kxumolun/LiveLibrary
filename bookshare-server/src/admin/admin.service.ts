import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BorrowStatus, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private assertAdmin(email: string) {
    const raw = this.config.get<string>('ADMIN_EMAILS') || '';
    const admins = raw
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    if (!email || !admins.includes(email.toLowerCase())) {
      throw new ForbiddenException('Faqat admin kirishi mumkin');
    }
  }

  async getDashboard(email: string) {
    this.assertAdmin(email);

    const [
      usersCount,
      newUsers7d,
      booksCount,
      availableBooksCount,
      borrowRequestsCount,
      pendingRequestsCount,
      borrowsCount,
      activeBorrowsCount,
      usersWithLocation,
      recentBooks,
      borrowsByStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.book.count(),
      this.prisma.book.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.borrowRequest.count(),
      this.prisma.borrowRequest.count({ where: { status: RequestStatus.PENDING } }),
      this.prisma.borrow.count(),
      this.prisma.borrow.count({
        where: {
          status: {
            in: [
              BorrowStatus.PENDING_HANDOVER,
              BorrowStatus.ACTIVE,
              BorrowStatus.PENDING_RETURN,
            ],
          },
        },
      }),
      this.prisma.user.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: {
          id: true,
          fullName: true,
          city: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          _count: { select: { ownedBooks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          status: true,
          city: true,
          createdAt: true,
          owner: { select: { fullName: true } },
        },
      }),
      this.prisma.borrow.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    return {
      summary: {
        usersCount,
        newUsers7d,
        booksCount,
        availableBooksCount,
        borrowRequestsCount,
        pendingRequestsCount,
        borrowsCount,
        activeBorrowsCount,
        estimatedVisits: usersCount + borrowRequestsCount + borrowsCount,
      },
      usersMap: usersWithLocation.map((u) => ({
        ...u,
        booksCount: u._count.ownedBooks,
      })),
      recentBooks,
      borrowsByStatus,
      generatedAt: new Date().toISOString(),
    };
  }
}

