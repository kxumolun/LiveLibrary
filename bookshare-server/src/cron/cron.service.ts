import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { TelegramOtpService } from '../telegram/telegram-otp.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
    private telegramOtpService: TelegramOtpService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cancelExpiredHandovers() {
    const now = new Date();
    const expiredBorrows = await this.prisma.borrow.findMany({
      where: { status: 'PENDING_HANDOVER', handoverExpiry: { lt: now } },
    });

    if (expiredBorrows.length === 0) {
      this.logger.log("Muddati o'tgan ijara yo'q");
      return;
    }

    for (const borrow of expiredBorrows) {
      await this.prisma.$transaction([
        this.prisma.borrow.update({
          where: { id: borrow.id },
          data: { status: 'CANCELLED', handoverOtp: null },
        }),
        this.prisma.book.update({
          where: { id: borrow.bookId },
          data: { status: 'AVAILABLE', availableFrom: null },
        }),
      ]);
    }
    this.logger.log(`${expiredBorrows.length} ta ijara CANCELLED qilindi`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async markOverdueBorrows() {
    const now = new Date();

    const overdue = await this.prisma.borrow.findMany({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] }, dueAt: { lt: now } },
      include: {
        book: { select: { title: true, ownerId: true } },
        borrower: { select: { id: true, fullName: true } },
      },
    });

    if (overdue.length === 0) return;

    for (const borrow of overdue) {
      const shouldRemind =
        !borrow.overdueReminderSentAt ||
        now.getTime() - new Date(borrow.overdueReminderSentAt).getTime() >=
          24 * 60 * 60 * 1000;

      await this.prisma.borrow.update({
        where: { id: borrow.id },
        data: {
          status: 'OVERDUE',
          overdueReminderSentAt: shouldRemind ? now : borrow.overdueReminderSentAt,
        },
      });

      if (shouldRemind) {
        const dueDate = borrow.dueAt.toLocaleDateString('uz-UZ');
        const reminderText = `Assalomu alaykum, ${borrow.borrower.fullName}.\n\nSiz olgan "${borrow.book.title}" kitobining qaytarish muddati (${dueDate}) o'tib ketdi.\n\nEslatma: bu kitob egasining omonati. Iltimos, imkon qadar tezroq egasi bilan bog'lanib qaytaring.\n\nAgar uzrli sabab bo'lsa, ilovadagi "Mening ijaralarim" bo'limidan kechikish sababini yozib yuboring.`;
        await this.telegramOtpService.sendToUserById(borrow.borrowerId, reminderText);
      }
    }
    this.logger.log(`${overdue.length} ta ijara OVERDUE qilindi`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async remindDueSoonBorrows() {
    const now = new Date();
    const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const rows = await this.prisma.borrow.findMany({
      where: {
        status: 'ACTIVE',
        dueAt: { gte: now, lte: next48h },
      },
      include: {
        book: { select: { title: true } },
        borrower: { select: { fullName: true } },
      },
    });
    if (rows.length === 0) return;

    for (const borrow of rows) {
      const alreadySent = borrow.dueSoonReminderSentAt;
      if (alreadySent) continue;
      const due = borrow.dueAt.toLocaleDateString('uz-UZ');
      const text = `Assalomu alaykum, ${borrow.borrower.fullName}.\n\n"${borrow.book.title}" kitobini qaytarish muddati yaqinlashmoqda (${due}).\n\nAgar o'qib tugatmagan bo'lsangiz, ilovadagi "Mening ijaralarim" bo'limidan sabab yozib muddat uzaytirish so'rovini yuboring.`;
      await this.telegramOtpService.sendToUserById(borrow.borrowerId, text);
      await this.prisma.borrow.update({
        where: { id: borrow.id },
        data: { dueSoonReminderSentAt: now },
      });
    }
  }

  @Cron('*/1 * * * *')
  async deleteExpiredChats() {
    const count = await this.chatService.deleteExpiredChats();
    if (count > 0) {
      this.logger.log(`${count} ta chat avtomatik o'chirildi`);
    }
  }
}
