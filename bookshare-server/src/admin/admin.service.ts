import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BorrowStatus, Prisma, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly cacheTtlMs = 120_000;
  private dashboardCache = new Map<string, { at: number; data: any }>();
  private usersCache = new Map<string, { at: number; data: any }>();
  private booksCache = new Map<string, { at: number; data: any }>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private getCached<T>(
    store: Map<string, { at: number; data: T }>,
    key: string,
  ) {
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > this.cacheTtlMs) {
      store.delete(key);
      return null;
    }
    return hit.data;
  }

  private setCached<T>(
    store: Map<string, { at: number; data: T }>,
    key: string,
    data: T,
  ) {
    store.set(key, { at: Date.now(), data });
  }

  private invalidateAdminCaches() {
    this.dashboardCache.clear();
    this.usersCache.clear();
    this.booksCache.clear();
  }

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

  async getDashboard(
    email: string,
    opts?: {
      includeMap?: boolean;
      includeRecent?: boolean;
      includeStats?: boolean;
    },
  ) {
    this.assertAdmin(email);
    const includeMap = !!opts?.includeMap;
    const includeRecent = !!opts?.includeRecent;
    const includeStats = !!opts?.includeStats;
    const cacheKey = JSON.stringify({
      includeMap,
      includeRecent,
      includeStats,
    });
    const cached = this.getCached(this.dashboardCache, cacheKey);
    if (cached) return cached;

    const now = Date.now();
    const usersCountPromise = this.prisma.user.count();
    const newUsers7dPromise = this.prisma.user.count({
      where: { createdAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } },
    });
    const booksCountPromise = this.prisma.book.count();
    const availableBooksCountPromise = this.prisma.book.count({
      where: { status: 'AVAILABLE' },
    });
    const borrowRequestsCountPromise = this.prisma.borrowRequest.count();
    const pendingRequestsCountPromise = this.prisma.borrowRequest.count({
      where: { status: RequestStatus.PENDING },
    });
    const borrowsCountPromise = this.prisma.borrow.count();
    const activeBorrowsCountPromise = this.prisma.borrow.count({
      where: {
        status: {
          in: [
            BorrowStatus.PENDING_HANDOVER,
            BorrowStatus.ACTIVE,
            BorrowStatus.PENDING_RETURN,
          ],
        },
      },
    });
    const borrowsByStatusPromise = includeStats
      ? this.prisma.borrow.groupBy({
          by: ['status'],
          _count: { _all: true },
        })
      : Promise.resolve([]);
    const realVisitsPromise = (async () => {
      try {
        return await this.prisma.visitEvent.count();
      } catch {
        return 0;
      }
    })();
    const uniqueVisitors7dPromise = (async () => {
      try {
        const rows = await this.prisma.visitEvent.groupBy({
          by: ['visitorId'],
          where: {
            createdAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        return rows.length;
      } catch {
        return 0;
      }
    })();

    // Xarita uchun user jadvalidan emas, meetup location'i bor kitoblardan olamiz.
    // Bu usul amalda ancha tez va foydaliroq (real kitob joylashuvlari ko'rinadi).
    const usersWithLocationPromise = includeMap
      ? (async () => {
          const books = await this.prisma.book.findMany({
            where: {
              meetupLat: { not: null },
              meetupLng: { not: null },
              isHidden: false,
            },
            select: {
              ownerId: true,
              meetupLat: true,
              meetupLng: true,
              owner: {
                select: {
                  id: true,
                  fullName: true,
                  city: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1200,
          });

          const byOwner = new Map<string, any>();
          for (const b of books) {
            if (!b.owner || b.meetupLat == null || b.meetupLng == null)
              continue;
            const existing = byOwner.get(b.owner.id);
            if (existing) {
              existing.booksCount += 1;
            } else {
              byOwner.set(b.owner.id, {
                id: b.owner.id,
                fullName: b.owner.fullName,
                city: b.owner.city,
                latitude: b.meetupLat,
                longitude: b.meetupLng,
                createdAt: b.owner.createdAt,
                booksCount: 1,
              });
            }
            if (byOwner.size >= 300) break;
          }
          return Array.from(byOwner.values());
        })()
      : Promise.resolve([]);

    const recentBooksPromise = includeRecent
      ? (async () => {
          try {
            return await this.prisma.book.findMany({
              take: 8,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                author: true,
                status: true,
                isHidden: true,
                city: true,
                createdAt: true,
                owner: { select: { fullName: true } },
              },
            });
          } catch {
            return await this.prisma.book.findMany({
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
            });
          }
        })()
      : Promise.resolve([]);

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
      realVisits,
      uniqueVisitors7d,
    ] = await Promise.all([
      usersCountPromise,
      newUsers7dPromise,
      booksCountPromise,
      availableBooksCountPromise,
      borrowRequestsCountPromise,
      pendingRequestsCountPromise,
      borrowsCountPromise,
      activeBorrowsCountPromise,
      usersWithLocationPromise,
      recentBooksPromise,
      borrowsByStatusPromise,
      realVisitsPromise,
      uniqueVisitors7dPromise,
    ]);

    const payload = {
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
        realVisits,
        uniqueVisitors7d,
      },
      usersMap: usersWithLocation.map((u: any) => ({
        ...u,
        booksCount: u?.booksCount ?? 0,
      })),
      recentBooks,
      borrowsByStatus,
      generatedAt: new Date().toISOString(),
    };
    this.setCached(this.dashboardCache, cacheKey, payload);
    return payload;
  }

  async listUsers(
    email: string,
    opts: { q?: string; take?: number; skip?: number },
  ) {
    this.assertAdmin(email);
    const take = Math.min(Math.max(opts.take ?? 30, 1), 100);
    const skip = Math.max(opts.skip ?? 0, 0);
    const q = (opts.q || '').trim();
    const cacheKey = JSON.stringify({ q, take, skip });
    const cached = this.getCached(this.usersCache, cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { telegramUsername: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          city: true,
          createdAt: true,
          isBlocked: true,
          blockedAt: true,
          telegramChatId: true,
          telegramUsername: true,
          telegramVerifiedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const payload = {
      items: items.map((u) => ({
        ...u,
        telegramChatId:
          typeof u.telegramChatId === 'bigint'
            ? u.telegramChatId.toString()
            : u.telegramChatId,
      })),
      total,
      take,
      skip,
    };
    this.setCached(this.usersCache, cacheKey, payload);
    return payload;
  }

  async blockUser(email: string, userId: string) {
    this.assertAdmin(email);
    const res = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true, blockedAt: new Date() },
      select: { id: true, isBlocked: true, blockedAt: true },
    });
    this.invalidateAdminCaches();
    return res;
  }

  async unblockUser(email: string, userId: string) {
    this.assertAdmin(email);
    const res = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false, blockedAt: null },
      select: { id: true, isBlocked: true, blockedAt: true },
    });
    this.invalidateAdminCaches();
    return res;
  }

  async listBooks(
    email: string,
    opts: { q?: string; take?: number; skip?: number },
  ) {
    this.assertAdmin(email);
    const take = Math.min(Math.max(opts.take ?? 30, 1), 100);
    const skip = Math.max(opts.skip ?? 0, 0);
    const q = (opts.q || '').trim();
    const cacheKey = JSON.stringify({ q, take, skip });
    const cached = this.getCached(this.booksCache, cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { owner: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          title: true,
          author: true,
          status: true,
          city: true,
          createdAt: true,
          isHidden: true,
          hiddenAt: true,
          owner: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    const payload = { items, total, take, skip };
    this.setCached(this.booksCache, cacheKey, payload);
    return payload;
  }

  async hideBook(email: string, bookId: string) {
    this.assertAdmin(email);
    const res = await this.prisma.book.update({
      where: { id: bookId },
      data: { isHidden: true, hiddenAt: new Date() },
      select: { id: true, isHidden: true, hiddenAt: true },
    });
    this.invalidateAdminCaches();
    return res;
  }

  async unhideBook(email: string, bookId: string) {
    this.assertAdmin(email);
    const res = await this.prisma.book.update({
      where: { id: bookId },
      data: { isHidden: false, hiddenAt: null },
      select: { id: true, isHidden: true, hiddenAt: true },
    });
    this.invalidateAdminCaches();
    return res;
  }

  async deleteBook(email: string, bookId: string) {
    this.assertAdmin(email);
    await this.prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({ where: { borrow: { bookId } } });
      await tx.borrow.deleteMany({ where: { bookId } });
      await tx.borrowRequest.deleteMany({ where: { bookId } });
      await tx.book.delete({ where: { id: bookId } });
    });
    this.invalidateAdminCaches();
    return { ok: true };
  }

  async deleteUser(email: string, adminId: string, userId: string) {
    this.assertAdmin(email);
    if (adminId === userId) {
      throw new ForbiddenException("O'zingizni o'chira olmaysiz");
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const [ownedBooks, userBorrows] = await Promise.all([
            tx.book.findMany({
              where: { ownerId: userId },
              select: { id: true },
            }),
            tx.borrow.findMany({
              where: { borrowerId: userId },
              select: { id: true, requestId: true },
            }),
          ]);

          const ownedBookIds = ownedBooks.map((b) => b.id);
          const userBorrowIds = userBorrows.map((b) => b.id);
          const userBorrowRequestIds = userBorrows.map((b) => b.requestId);

          const borrowsOnOwnedBooks = ownedBookIds.length
            ? await tx.borrow.findMany({
                where: { bookId: { in: ownedBookIds } },
                select: { id: true, requestId: true },
              })
            : [];

          const ownedBookBorrowIds = borrowsOnOwnedBooks.map((b) => b.id);
          const ownedBookBorrowRequestIds = borrowsOnOwnedBooks.map(
            (b) => b.requestId,
          );

          const borrowIdsForMessageCleanup = Array.from(
            new Set([...userBorrowIds, ...ownedBookBorrowIds]),
          );
          const requestIdsToDelete = Array.from(
            new Set([...userBorrowRequestIds, ...ownedBookBorrowRequestIds]),
          );

          if (borrowIdsForMessageCleanup.length) {
            await tx.message.deleteMany({
              where: { borrowId: { in: borrowIdsForMessageCleanup } },
            });
          }

          await tx.message.deleteMany({
            where: {
              OR: [{ senderId: userId }, { receiverId: userId }],
            },
          });

          if (borrowIdsForMessageCleanup.length) {
            await tx.borrow.deleteMany({
              where: { id: { in: borrowIdsForMessageCleanup } },
            });
          }

          if (requestIdsToDelete.length) {
            await tx.borrowRequest.deleteMany({
              where: { id: { in: requestIdsToDelete } },
            });
          }

          await tx.borrowRequest.deleteMany({ where: { requesterId: userId } });
          if (ownedBookIds.length) {
            await tx.borrowRequest.deleteMany({
              where: { bookId: { in: ownedBookIds } },
            });
          }
          await tx.notification.deleteMany({ where: { userId } });

          if (ownedBookIds.length) {
            await tx.book.deleteMany({ where: { id: { in: ownedBookIds } } });
          }

          await tx.user.delete({ where: { id: userId } });
        },
        { maxWait: 15_000, timeout: 60_000 },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new BadRequestException(
            'User topilmadi yoki allaqachon o‘chirilgan',
          );
        }
        if (err.code === 'P2003') {
          throw new BadRequestException(
            "Userni o'chirishda bog'liq ma'lumotlar tozalashda xatolik bo'ldi",
          );
        }
      }
      const details = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Userni o'chirishda kutilmagan xatolik: ${details}`,
      );
    }

    this.invalidateAdminCaches();
    return { ok: true };
  }
}
