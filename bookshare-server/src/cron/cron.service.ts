import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
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
      where: { status: 'ACTIVE', dueAt: { lt: now } },
    });

    if (overdue.length === 0) return;

    for (const borrow of overdue) {
      await this.prisma.borrow.update({
        where: { id: borrow.id },
        data: { status: 'OVERDUE' },
      });
    }
    this.logger.log(`${overdue.length} ta ijara OVERDUE qilindi`);
  }

  @Cron('*/1 * * * *')
  async deleteExpiredChats() {
    const count = await this.chatService.deleteExpiredChats();
    if (count > 0) {
      this.logger.log(`${count} ta chat avtomatik o'chirildi`);
    }
  }
}
