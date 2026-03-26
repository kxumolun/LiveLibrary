import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(data: {
    borrowId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: data.borrowId },
    });
    if (!borrow) throw new ForbiddenException('Ijara topilmadi');
    if (borrow.status === 'RETURNED' || borrow.status === 'CANCELLED') {
      throw new ForbiddenException("Bu ijara tugagan, xabar yuborib bo'lmaydi");
    }

    return this.prisma.message.create({
      data,
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async getMessages(borrowId: string, userId: string) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: {
        book: {
          select: {
            ownerId: true,
            title: true,
            owner: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        borrower: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    if (!borrow) throw new ForbiddenException('Ijara topilmadi');
    if (borrow.borrowerId !== userId && borrow.book.ownerId !== userId) {
      throw new ForbiddenException("Ruxsat yo'q");
    }

    const messages = await this.prisma.message.findMany({
      where: { borrowId },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { messages, borrow };
  }

  async markAsRead(borrowId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: { borrowId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.message.count({
      where: { receiverId: userId, isRead: false },
    });
  }

  async getReadMessages(borrowId: string, receiverId: string) {
    return this.prisma.message.findMany({
      where: { borrowId, receiverId, isRead: true },
      select: { id: true, senderId: true },
    });
  }

  async deleteChat(borrowId: string, userId: string) {
    const borrow = await this.prisma.borrow.findUnique({
      where: { id: borrowId },
      include: { book: { select: { ownerId: true } } },
    });

    // Eski chat yoki topilmasa — shunchaki o'chiramiz
    if (!borrow) {
      await this.prisma.message.deleteMany({ where: { borrowId } });
      return { message: "Chat o'chirildi" };
    }

    if (borrow.borrowerId !== userId && borrow.book.ownerId !== userId) {
      throw new ForbiddenException("Ruxsat yo'q");
    }

    const updatedDeletedBy = [...new Set([...borrow.chatDeletedBy, userId])];

    const bothDeleted =
      updatedDeletedBy.includes(borrow.borrowerId) &&
      updatedDeletedBy.includes(borrow.book.ownerId);

    if (bothDeleted) {
      await this.prisma.message.deleteMany({ where: { borrowId } });
      await this.prisma.borrow.update({
        where: { id: borrowId },
        data: { chatDeletedBy: [], chatAutoDeleteAt: null },
      });
    } else {
      await this.prisma.borrow.update({
        where: { id: borrowId },
        data: { chatDeletedBy: updatedDeletedBy },
      });
    }

    return { message: "Chat o'chirildi" };
  }

  async getConversations(userId: string) {
    const borrows = await this.prisma.borrow.findMany({
      where: {
        OR: [{ borrowerId: userId }, { book: { ownerId: userId } }],
        status: { notIn: ['CANCELLED'] },
        NOT: { chatDeletedBy: { has: userId } },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            owner: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        borrower: { select: { id: true, fullName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { borrowedAt: 'desc' },
    });

    const borrowIds = borrows.map((b) => b.id);
    const unreadGrouped = borrowIds.length
      ? await this.prisma.message.groupBy({
          by: ['borrowId'],
          where: {
            borrowId: { in: borrowIds },
            receiverId: userId,
            isRead: false,
          },
          _count: { _all: true },
        })
      : [];
    const unreadMap = new Map(
      unreadGrouped.map((x) => [x.borrowId, x._count._all]),
    );

    const result = borrows.map((b) => ({
      borrowId: b.id,
      status: b.status,
      book: b.book,
      other: b.borrowerId === userId ? b.book.owner : b.borrower,
      lastMessage: b.messages[0] || null,
      unreadCount: unreadMap.get(b.id) ?? 0,
      chatAutoDeleteAt: b.chatAutoDeleteAt,
    }));

    return result;
  }

  // RETURNED bo'lganda chatAutoDeleteAt ni set qilish
  async setChatAutoDelete(borrowId: string) {
    const autoDeleteAt = new Date();
    autoDeleteAt.setMinutes(autoDeleteAt.getMinutes() + 5); // test: 5 daqiqa
    await this.prisma.borrow.update({
      where: { id: borrowId },
      data: { chatAutoDeleteAt: autoDeleteAt },
    });
  }

  // Cron uchun
  async deleteExpiredChats() {
    const now = new Date();
    const expiredBorrows = await this.prisma.borrow.findMany({
      where: {
        chatAutoDeleteAt: { lt: now },
        messages: { some: {} },
      },
    });

    for (const borrow of expiredBorrows) {
      await this.prisma.message.deleteMany({ where: { borrowId: borrow.id } });
      await this.prisma.borrow.update({
        where: { id: borrow.id },
        data: { chatAutoDeleteAt: null, chatDeletedBy: [] },
      });
    }

    return expiredBorrows.length;
  }
}
