import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { supabase } from '../supabase';

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
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateBookDto) {
    return this.prisma.book.create({
      data: { ...dto, ownerId },
      include: {
        owner: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async findAll(search?: string, lat?: number, lng?: number, radiusKm = 5) {
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    const books = await this.prisma.book.findMany({
      where,
      include: {
        owner: {
          select: { id: true, fullName: true, avatarUrl: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = books;
    if (lat !== undefined && lng !== undefined) {
      filtered = books.filter((b) => {
        if (!b.latitude || !b.longitude) return true;
        return distanceKm(lat, lng, b.latitude, b.longitude) <= radiusKm;
      });
    }

    const available = filtered.filter((b) => b.status === 'AVAILABLE');
    const borrowed = filtered.filter((b) => b.status !== 'AVAILABLE');

    return [...available, ...borrowed];
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, fullName: true, avatarUrl: true, city: true },
        },
        borrows: {
          where: { status: 'ACTIVE' },
          select: { dueAt: true },
          take: 1,
        },
      },
    });
    if (!book) throw new NotFoundException('Kitob topilmadi');
    return book;
  }

  async update(id: string, userId: string, dto: UpdateBookDto) {
    await this.checkOwner(id, userId);
    return this.prisma.book.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.checkOwner(id, userId);
    await this.prisma.borrow.deleteMany({ where: { bookId: id } });
    await this.prisma.borrowRequest.deleteMany({ where: { bookId: id } });
    await this.prisma.book.delete({ where: { id } });
    return { message: "Kitob o'chirildi" };
  }

  async findMyBooks(ownerId: string) {
    return this.prisma.book.findMany({
      where: { ownerId },
      include: {
        borrows: {
          where: { status: 'ACTIVE' },
          select: {
            dueAt: true,
            borrower: { select: { id: true, fullName: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadCover(id: string, userId: string, file: Express.Multer.File) {
    await this.checkOwner(id, userId);

    const ext = file.originalname.split('.').pop();
    const fileName = `${id}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('book-covers')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from('book-covers')
      .getPublicUrl(fileName);

    return this.prisma.book.update({
      where: { id },
      data: { coverUrl: data.publicUrl },
    });
  }

  private async checkOwner(bookId: string, userId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Kitob topilmadi');
    if (book.ownerId !== userId) throw new ForbiddenException("Ruxsat yo'q");
    return book;
  }
}
