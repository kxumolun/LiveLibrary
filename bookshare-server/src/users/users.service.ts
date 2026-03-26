import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsersForMap(
    lat: number,
    lng: number,
    radiusMeters: number,
    userId?: string,
  ) {
    const radiusKm = radiusMeters / 1000;

    const where: any = {
      ownedBooks: {
        some: {
          meetupLat: { not: null },
          meetupLng: { not: null },
        },
      },
    };

    if (userId) {
      where.id = { not: userId };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        city: true,
        ownedBooks: {
          where: {
            meetupLat: { not: null },
            meetupLng: { not: null },
          },
          select: {
            id: true,
            title: true,
            author: true,
            coverUrl: true,
            status: true,
            meetupLat: true,
            meetupLng: true,
            meetupLocation: true,
          },
        },
      },
    });

    const result: any[] = [];

    users.forEach((u) => {
      u.ownedBooks.forEach((book) => {
        if (!book.meetupLat || !book.meetupLng) return;
        if (distanceKm(lat, lng, book.meetupLat, book.meetupLng) <= radiusKm) {
          const existing = result.find((r) => r.id === u.id);
          if (existing) {
            existing.books.push(book);
          } else {
            result.push({
              id: u.id,
              fullName: u.fullName,
              avatarUrl: u.avatarUrl,
              city: u.city,
              latitude: book.meetupLat,
              longitude: book.meetupLng,
              books: [book],
            });
          }
        }
      });
    });

    return result;
  }

  async getUserProfile(userId: string) {
    const [user, givenCount, receivedCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
          city: true,
          createdAt: true,
          ownedBooks: {
            select: {
              id: true,
              title: true,
              author: true,
              coverUrl: true,
              status: true,
              city: true,
              condition: true,
              language: true,
              meetupLocation: true,
              meetupLat: true,
              meetupLng: true,
            },
          },
        },
      }),
      this.prisma.borrow.count({
        where: { book: { ownerId: userId }, status: 'RETURNED' },
      }),
      this.prisma.borrow.count({
        where: { borrowerId: userId, status: 'RETURNED' },
      }),
    ]);

    if (!user) return null;

    const totalScore = givenCount + receivedCount;
    const badge =
      totalScore >= 10
        ? { label: 'Faol', icon: '🥇' }
        : totalScore >= 3
          ? { label: 'Ishonchli', icon: '🥈' }
          : { label: 'Yangi', icon: '🥉' };

    return {
      ...user,
      stats: { givenCount, receivedCount, totalScore },
      badge,
    };
  }

  async getUserSummary(userId: string) {
    const [user, givenCount, receivedCount, booksCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.borrow.count({
        where: { book: { ownerId: userId }, status: 'RETURNED' },
      }),
      this.prisma.borrow.count({
        where: { borrowerId: userId, status: 'RETURNED' },
      }),
      this.prisma.book.count({
        where: { ownerId: userId },
      }),
    ]);

    if (!user) return null;

    const totalScore = givenCount + receivedCount;
    const badge =
      totalScore >= 10
        ? { label: 'Faol', icon: '🥇' }
        : totalScore >= 3
          ? { label: 'Ishonchli', icon: '🥈' }
          : { label: 'Yangi', icon: '🥉' };

    return {
      ...user,
      booksCount,
      stats: { givenCount, receivedCount, totalScore },
      badge,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const { supabase } = await import('../supabase.js');

    const ext = file.originalname.split('.').pop();
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: data.publicUrl },
      select: { id: true, avatarUrl: true },
    });
  }
}
