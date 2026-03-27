import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from 'src/chat/chat.service';
import { TelegramOtpService } from '../telegram/telegram-otp.service';

function generateOTP(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += chars[Math.floor(Math.random() * chars.length)];
  }
  return otp;
}

@Injectable()
export class BorrowsService {
  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
    private telegramOtpService: TelegramOtpService,
  ) {}

  async createRequest(
    requesterId: string,
    bookId: string,
    durationDays: number,
    message?: string,
  ) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Kitob topilmadi');
    if (book.status !== 'AVAILABLE')
      throw new BadRequestException('Kitob hozir mavjud emas');
    if (book.ownerId === requesterId)
      throw new BadRequestException("O'z kitobingizni ijaraga ololmaysiz");

    const existing = await this.prisma.borrowRequest.findFirst({
      where: { bookId, requesterId, status: 'PENDING' },
    });
    if (existing)
      throw new BadRequestException("Siz allaqachon so'rov yuborgansiz");

    return this.prisma.borrowRequest.create({
      data: { bookId, requesterId, durationDays, message },
      include: {
        book: { select: { id: true, title: true, author: true } },
        requester: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async getIncomingRequests(ownerId: string) {
    return this.prisma.borrowRequest.findMany({
      where: { book: { ownerId }, status: 'PENDING' },
      include: {
        book: {
          select: { id: true, title: true, author: true, coverUrl: true },
        },
        requester: {
          select: { id: true, fullName: true, avatarUrl: true, city: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getMyRequests(requesterId: string) {
    return this.prisma.borrowRequest.findMany({
      where: { requesterId },
      include: {
        book: {
          include: {
            owner: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async respond(requestId: string, ownerId: string, accept: boolean) {
    const request = await this.prisma.borrowRequest.findUnique({
      where: { id: requestId },
      include: { book: true },
    });
    if (!request) throw new NotFoundException("So'rov topilmadi");
    if (request.book.ownerId !== ownerId)
      throw new ForbiddenException("Ruxsat yo'q");
    if (request.status !== 'PENDING')
      throw new BadRequestException("So'rov allaqachon ko'rib chiqilgan");

    if (accept) {
      const freshBook = await this.prisma.book.findUnique({
        where: { id: request.bookId },
      });
      if (freshBook?.status !== 'AVAILABLE')
        throw new BadRequestException('Kitob allaqachon ijarada');

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + request.durationDays);

      // OTP generatsiya — borrower ga ko'rsatiladi
      const handoverOtp = generateOTP();
      const handoverExpiry = new Date();
      handoverExpiry.setHours(handoverExpiry.getHours() + 12);

      await this.prisma.$transaction([
        this.prisma.borrow.create({
          data: {
            bookId: request.bookId,
            borrowerId: request.requesterId,
            requestId: request.id,
            dueAt,
            handoverOtp,
            handoverExpiry,
            status: 'PENDING_HANDOVER',
          },
        }),
        this.prisma.book.update({
          where: { id: request.bookId },
          data: { status: 'BORROWED', availableFrom: dueAt },
        }),
        this.prisma.borrowRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        }),
        this.prisma.borrowRequest.updateMany({
          where: {
            bookId: request.bookId,
            status: 'PENDING',
            id: { not: requestId },
          },
          data: { status: 'REJECTED', respondedAt: new Date() },
        }),
      ]);

      return { message: 'Qabul qilindi', handoverOtp };
    } else {
      await this.prisma.borrowRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
      return { message: 'Rad etildi' };
    }
  }

  // Owner kitobni topshirish — OTP tekshiradi
  async confirmHandover(borrowId: string, borrowerId: string, otp: string) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: { book: { include: { owner: true } } },
    });
    if (!borrow) throw new NotFoundException('Ijara topilmadi');
    if (borrow.borrowerId !== borrowerId)
      throw new ForbiddenException("Ruxsat yo'q");
    if (borrow.status !== 'PENDING_HANDOVER')
      throw new BadRequestException('Bu ijara topshirish kutilmayapti');

    if (borrow.handoverExpiry && new Date() > borrow.handoverExpiry) {
      await this.prisma.$transaction([
        this.prisma.borrow.update({
          where: { id: borrowId },
          data: { status: 'CANCELLED' },
        }),
        this.prisma.book.update({
          where: { id: borrow.bookId },
          data: { status: 'AVAILABLE', availableFrom: null },
        }),
      ]);
      throw new BadRequestException('Muddat tugadi, ijara bekor qilindi');
    }

    if (borrow.handoverOtp !== otp.toUpperCase())
      throw new BadRequestException("Noto'g'ri OTP kodi");

    await this.prisma.borrow.update({
      where: { id: borrowId },
      data: { status: 'ACTIVE', handoverOtp: null },
    });

    return { message: 'Kitob qabul qilindi!' };
  }

  // Borrower qaytarish so'rovi — owner ga OTP yuboriladi
  async initiateReturn(borrowId: string, borrowerId: string) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: { book: true },
    });
    if (!borrow) throw new NotFoundException('Ijara topilmadi');
    if (borrow.borrowerId !== borrowerId)
      throw new ForbiddenException("Ruxsat yo'q");
    if (borrow.status !== 'ACTIVE' && borrow.status !== 'OVERDUE')
      throw new BadRequestException('Bu ijara faol emas');

    const returnOtp = generateOTP();
    const returnExpiry = new Date();
    returnExpiry.setHours(returnExpiry.getHours() + 24);

    await this.prisma.borrow.update({
      where: { id: borrowId },
      data: { status: 'PENDING_RETURN', returnOtp, returnExpiry },
    });

    return { message: "Qaytarish so'rovi yuborildi", returnOtp };
  }

  // Owner qaytarishni tasdiqlash — OTP tekshiradi
  async confirmReturn(borrowId: string, ownerId: string, otp: string) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: { book: true },
    });
    if (!borrow) throw new NotFoundException('Ijara topilmadi');
    if (borrow.book.ownerId !== ownerId)
      throw new ForbiddenException("Ruxsat yo'q");
    if (borrow.status !== 'PENDING_RETURN')
      throw new BadRequestException("Qaytarish so'rovi yo'q");

    if (borrow.returnExpiry && new Date() > borrow.returnExpiry) {
      await this.prisma.borrow.update({
        where: { id: borrowId },
        data: { status: 'ACTIVE', returnOtp: null },
      });
      throw new BadRequestException('Muddat tugadi');
    }

    if (borrow.returnOtp !== otp.toUpperCase())
      throw new BadRequestException("Noto'g'ri OTP kodi");

    await this.prisma.$transaction([
      this.prisma.borrow.update({
        where: { id: borrowId },
        data: { status: 'RETURNED', returnedAt: new Date(), returnOtp: null },
      }),
      this.prisma.book.update({
        where: { id: borrow.bookId },
        data: { status: 'AVAILABLE', availableFrom: null },
      }),
    ]);
    // Chat avtomatik o'chirish vaqtini belgilash ← QO'SHING
    await this.chatService.setChatAutoDelete(borrowId);

    return { message: 'Kitob qaytarildi!' };
  }

  async getMyBorrows(borrowerId: string) {
    return this.prisma.borrow.findMany({
      where: { borrowerId },
      include: {
        book: {
          include: {
            owner: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { borrowedAt: 'desc' },
    });
  }

  async submitOverdueReason(borrowId: string, borrowerId: string, reason: string) {
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      throw new BadRequestException("Sabab kamida 10 ta belgidan iborat bo'lishi kerak");
    }
    if (cleanReason.length > 500) {
      throw new BadRequestException("Sabab 500 belgidan oshmasligi kerak");
    }

    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: {
        borrower: { select: { id: true, fullName: true } },
        book: { select: { id: true, title: true, ownerId: true, owner: { select: { fullName: true } } } },
      },
    });
    if (!borrow) throw new NotFoundException('Ijara topilmadi');
    if (borrow.borrowerId !== borrowerId) throw new ForbiddenException("Ruxsat yo'q");
    if (borrow.status !== 'OVERDUE') {
      throw new BadRequestException("Kechikish sababi faqat muddati o'tgan ijarada yuboriladi");
    }

    const now = new Date();
    await this.prisma.borrow.update({
      where: { id: borrowId },
      data: {
        overdueReason: cleanReason,
        overdueReasonSentAt: now,
      },
    });

    const ownerText = `Assalomu alaykum, ${borrow.book.owner.fullName}.\n\nSizning "${borrow.book.title}" kitobingiz bo'yicha oluvchi (${borrow.borrower.fullName}) kechikish sababini yubordi:\n\n"${cleanReason}"\n\nIltimos, ilovadagi chat orqali qaytarish vaqtini kelishib oling.`;
    await this.telegramOtpService.sendToUserById(borrow.book.ownerId, ownerText);

    return { message: "Kechikish sababi egasiga yuborildi" };
  }

  async requestExtension(
    borrowId: string,
    borrowerId: string,
    reason: string,
    extraDays: number,
  ) {
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      throw new BadRequestException("Sabab kamida 10 ta belgidan iborat bo'lishi kerak");
    }
    if (cleanReason.length > 500) {
      throw new BadRequestException("Sabab 500 belgidan oshmasligi kerak");
    }
    if (!Number.isFinite(extraDays) || extraDays < 1 || extraDays > 30) {
      throw new BadRequestException("Uzatish muddati 1-30 kun oralig'ida bo'lishi kerak");
    }

    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: {
        borrower: { select: { id: true, fullName: true } },
        book: {
          select: {
            title: true,
            ownerId: true,
            owner: { select: { fullName: true } },
          },
        },
      },
    });
    if (!borrow) throw new NotFoundException('Ijara topilmadi');
    if (borrow.borrowerId !== borrowerId) throw new ForbiddenException("Ruxsat yo'q");
    if (!['ACTIVE', 'OVERDUE'].includes(borrow.status)) {
      throw new BadRequestException("Faqat faol yoki muddati o'tgan ijarada so'rov yuboriladi");
    }
    if (borrow.extensionStatus === 'PENDING') {
      throw new BadRequestException("Uzaytirish so'rovi allaqachon yuborilgan");
    }

    await this.prisma.borrow.update({
      where: { id: borrowId },
      data: {
        extensionStatus: 'PENDING',
        extensionReason: cleanReason,
        extensionDays: extraDays,
        extensionRequestedAt: new Date(),
        extensionRespondedAt: null,
      },
    });

    const ownerText = `Assalomu alaykum, ${borrow.book.owner.fullName}.\n\n"${borrow.book.title}" kitobi bo'yicha oluvchi (${borrow.borrower.fullName}) muddatni uzaytirish so'rovi yubordi.\n\nUzatish: ${extraDays} kun\nSabab: "${cleanReason}"\n\nIltimos, ilovada so'rovni ko'rib qabul yoki rad qiling.`;
    await this.telegramOtpService.sendToUserById(borrow.book.ownerId, ownerText);

    return { message: "Uzatish so'rovi yuborildi" };
  }

  async respondExtension(borrowId: string, ownerId: string, accept: boolean) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: {
        book: { select: { ownerId: true, title: true } },
        borrower: { select: { id: true, fullName: true } },
      },
    });
    if (!borrow) throw new NotFoundException('Ijara topilmadi');
    if (borrow.book.ownerId !== ownerId) throw new ForbiddenException("Ruxsat yo'q");
    if (borrow.extensionStatus !== 'PENDING' || !borrow.extensionDays) {
      throw new BadRequestException("Faol uzaytirish so'rovi topilmadi");
    }

    if (accept) {
      const nextDueAt = new Date(borrow.dueAt);
      nextDueAt.setDate(nextDueAt.getDate() + borrow.extensionDays);
      const now = new Date();
      const nextStatus = nextDueAt > now ? 'ACTIVE' : 'OVERDUE';

      await this.prisma.borrow.update({
        where: { id: borrowId },
        data: {
          dueAt: nextDueAt,
          status: nextStatus,
          extensionStatus: 'ACCEPTED',
          extensionRespondedAt: now,
          extensionCount: { increment: 1 },
          dueSoonReminderSentAt: null,
        },
      });

      const when = nextDueAt.toLocaleDateString('uz-UZ');
      const text = `Assalomu alaykum, ${borrow.borrower.fullName}.\n\n"${borrow.book.title}" kitobi bo'yicha muddat uzaytirish so'rovingiz qabul qilindi.\n\nYangi qaytarish sanasi: ${when} (${borrow.extensionDays} kun uzaytirildi).`;
      await this.telegramOtpService.sendToUserById(borrow.borrowerId, text);

      return { message: "So'rov qabul qilindi", dueAt: nextDueAt };
    }

    await this.prisma.borrow.update({
      where: { id: borrowId },
      data: {
        extensionStatus: 'REJECTED',
        extensionRespondedAt: new Date(),
      },
    });
    const text = `Assalomu alaykum, ${borrow.borrower.fullName}.\n\n"${borrow.book.title}" kitobi bo'yicha muddat uzaytirish so'rovingiz rad etildi.\n\nIltimos, kitobni kelishilgan sanada qaytaring.`;
    await this.telegramOtpService.sendToUserById(borrow.borrowerId, text);

    return { message: "So'rov rad etildi" };
  }

  // Owner ning PENDING_HANDOVER va PENDING_RETURN borrows
  async getOwnerBorrows(ownerId: string) {
    return this.prisma.borrow.findMany({
      where: {
        book: { ownerId },
        status: {
          in: ['PENDING_HANDOVER', 'ACTIVE', 'OVERDUE', 'PENDING_RETURN'],
        },
      },
      include: {
        book: {
          select: { id: true, title: true, author: true, coverUrl: true },
        },
        borrower: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            city: true,
            phone: true,
          },
        },
      },
      orderBy: { borrowedAt: 'desc' },
    });
  }

  async getNavbarCounts(userId: string) {
    const [incomingCount, ownerPendingCount, myPendingCount, unreadCount] =
      await Promise.all([
        this.prisma.borrowRequest.count({
          where: {
            status: 'PENDING',
            book: { ownerId: userId },
          },
        }),
        this.prisma.borrow.count({
          where: {
            book: { ownerId: userId },
            OR: [
              { status: { in: ['PENDING_HANDOVER', 'PENDING_RETURN'] } },
              { extensionStatus: 'PENDING' },
            ],
          },
        }),
        this.prisma.borrow.count({
          where: {
            borrowerId: userId,
            status: 'PENDING_HANDOVER',
          },
        }),
        this.prisma.message.count({
          where: { receiverId: userId, isRead: false },
        }),
      ]);

    return {
      incomingCount,
      ownerPendingCount,
      myPendingCount,
      unreadCount,
      generatedAt: new Date().toISOString(),
    };
  }
}
