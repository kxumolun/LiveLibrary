import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from '../auth/dto/auth.dto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

type Pending = {
  pendingId: string;
  dto: RegisterDto;
  otp: string;
  createdAt: number;
  expiresAt: number;
  telegramChatId?: number;
  telegramUsername?: string;
  otpSent: boolean;
};

type PendingLink = {
  pendingId: string;
  userId: string;
  otp: string;
  createdAt: number;
  expiresAt: number;
  telegramChatId?: number;
  telegramUsername?: string;
};

@Injectable()
export class TelegramOtpService implements OnModuleInit, OnModuleDestroy {
  private botToken: string | null = null;
  private botUsername: string | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private updateOffset = 0;

  // In-memory store (free tier uchun mos). Server restart bo‘lsa pendinglar yo‘qoladi.
  private pendingById = new Map<string, Pending>();
  private pendingIdByChatId = new Map<number, string>();
  private pendingLinkById = new Map<string, PendingLink>();
  private pendingLinkIdByChatId = new Map<number, string>();

  constructor(
    private config: ConfigService,
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN') || null;
    this.botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME') || null;

    if (!this.botToken) return;

    // Tez-tez so‘ramaslik uchun interval bilan ishlaymiz.
    this.pollingTimer = setInterval(() => {
      this.pollOnce().catch(() => {});
    }, 2500);
  }

  onModuleDestroy() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  private normalizePhone(phone: string) {
    // +998 ... ko'rinishlarini faqat raqamlarga keltiramiz.
    return phone.replace(/[^\d]/g, '');
  }

  private generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private generatePendingId() {
    return `tg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  private generateLinkPendingId() {
    return `tglink_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  private async tgRequest<T = any>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const url = `https://api.telegram.org/bot${this.botToken}${path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.description || 'Telegram error');
    return json.result as T;
  }

  private async sendMessage(chatId: number, text: string, replyMarkup?: any) {
    if (!this.botToken) return;
    await this.tgRequest('POST', '/sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }

  async sendToUserById(userId: string, text: string) {
    if (!this.botToken) return { ok: false as const, reason: 'bot_not_configured' };
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!user?.telegramChatId) return { ok: false as const, reason: 'chat_not_linked' };

    const chatId = Number(user.telegramChatId);
    if (!Number.isFinite(chatId)) return { ok: false as const, reason: 'invalid_chat_id' };
    await this.sendMessage(chatId, text);
    return { ok: true as const };
  }

  private async pollOnce() {
    if (!this.botToken) return;

    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?timeout=25&offset=${this.updateOffset}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.ok) return;

    const updates = (json.result || []) as any[];
    for (const u of updates) {
      this.updateOffset = (u.update_id ?? this.updateOffset) + 1;
      await this.handleUpdate(u).catch(() => {});
    }

    // expirelarni yig'ishtirish
    const now = Date.now();
    for (const [id, p] of this.pendingById.entries()) {
      if (p.expiresAt <= now) {
        this.pendingById.delete(id);
        if (p.telegramChatId) this.pendingIdByChatId.delete(p.telegramChatId);
      }
    }
    for (const [id, p] of this.pendingLinkById.entries()) {
      if (p.expiresAt <= now) {
        this.pendingLinkById.delete(id);
        if (p.telegramChatId)
          this.pendingLinkIdByChatId.delete(p.telegramChatId);
      }
    }
  }

  private async handleUpdate(update: any) {
    const msg = update?.message;
    if (!msg) return;
    const chatId = msg.chat?.id as number | undefined;
    if (!chatId) return;

    // /start <pendingId>
    const text: string | undefined = msg.text;
    if (text?.startsWith('/start')) {
      const parts = text.split(' ');
      const pendingId = parts[1]?.trim();
      if (!pendingId) return;

      const pendingLink = this.pendingLinkById.get(pendingId);
      if (pendingLink) {
        pendingLink.telegramChatId = chatId;
        pendingLink.telegramUsername = msg.from?.username || undefined;
        this.pendingLinkIdByChatId.set(chatId, pendingId);
        await this.sendMessage(
          chatId,
          `Telegram ulash kodi: <b>${pendingLink.otp}</b>\n\nBu kodni profil sahifasiga kiriting.`,
        );
        return;
      }

      const pending = this.pendingById.get(pendingId);
      if (!pending) {
        await this.sendMessage(
          chatId,
          'Kechirasiz, bu tasdiqlash muddati tugagan yoki topilmadi.',
        );
        return;
      }

      pending.telegramChatId = chatId;
      pending.telegramUsername = msg.from?.username || undefined;
      this.pendingIdByChatId.set(chatId, pendingId);

      // Contact so‘rash (telefon raqam)
      await this.sendMessage(
        chatId,
        'Telefon raqamingizni yuboring. Shundan so‘ng sizga tasdiqlash kodi beriladi.',
        {
          keyboard: [
            [
              {
                text: '📱 Telefon raqamni yuborish',
                request_contact: true,
              },
            ],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
          selective: true,
        },
      );
      return;
    }

    // Contact kelgan
    if (msg.contact?.phone_number) {
      const pendingId = this.pendingIdByChatId.get(chatId);
      if (!pendingId) return;
      const pending = this.pendingById.get(pendingId);
      if (!pending) return;

      const sentPhone = this.normalizePhone(pending.dto.phone);
      const gotPhone = this.normalizePhone(msg.contact.phone_number as string);

      if (sentPhone !== gotPhone) {
        await this.sendMessage(
          chatId,
          'Yuborgan telefon raqamingiz ro‘yxatdan o‘tishdagi raqamga mos kelmadi. Iltimos, qayta urinib ko‘ring.',
        );
        return;
      }

      if (!pending.otpSent) {
        pending.otpSent = true;
        // OTP kodni yuboramiz
        await this.sendMessage(
          chatId,
          `Tasdiqlash kodi: <b>${pending.otp}</b>\n\nKodni ro‘yxatdan o‘tish sahifasiga kiriting.`,
        );
      }
      return;
    }
  }

  async initTelegramRegister(dto: RegisterDto) {
    if (!this.botToken || !this.botUsername) {
      throw new ServiceUnavailableException(
        'Telegram bot sozlanmagan. Iltimos keyinroq urinib ko‘ring.',
      );
    }

    const pendingId = this.generatePendingId();
    const otp = this.generateOtp();
    const now = Date.now();

    const pending: Pending = {
      pendingId,
      dto,
      otp,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 daqiqa
      otpSent: false,
    };

    this.pendingById.set(pendingId, pending);

    const botLink = `https://t.me/${this.botUsername}?start=${encodeURIComponent(pendingId)}`;

    return {
      pendingId,
      botLink,
      expiresInSeconds: 600,
    };
  }

  async verifyTelegramRegister(pendingId: string, code: string) {
    const pending = this.pendingById.get(pendingId);
    if (!pending)
      throw new BadRequestException(
        'Tasdiqlash topilmadi. Qaytadan urinib ko‘ring.',
      );
    if (pending.expiresAt < Date.now())
      throw new BadRequestException(
        'Tasdiqlash muddati tugadi. Qaytadan urinib ko‘ring.',
      );
    if (!pending.telegramChatId)
      throw new BadRequestException(
        'Avval Telegram botga kiring va telefon raqamingizni yuboring.',
      );

    const cleanCode = (code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new BadRequestException('Kod 6 ta raqamdan iborat bo‘lishi kerak.');
    }
    if (pending.otp !== cleanCode) {
      throw new BadRequestException('Kod noto‘g‘ri. Qayta urinib ko‘ring.');
    }

    // user yaratamiz (existing auth register logikasi orqali)
    try {
      const res = await this.authService.register(pending.dto);

      // Telegram tasdiqlangan ma'lumotlarni userga bog'lab saqlaymiz (admin ko'rishi uchun)
      try {
        const telegramChatId = BigInt(pending.telegramChatId);
        await this.prisma.user.update({
          where: { id: res.user.id },
          data: {
            telegramChatId,
            telegramUsername: pending.telegramUsername || null,
            telegramVerifiedAt: new Date(),
          },
        });
      } catch {
        // saqlash xato bo'lsa ham ro'yxatdan o'tishni to'xtatmaymiz
      }

      // welcome xabarni yuboramiz
      const chatId = pending.telegramChatId;
      const welcome = `Assalomu alaykum, <b>${pending.dto.fullName}</b>!\n\nJonli kutubxona’da ro‘yxatdan o‘tganingiz uchun rahmat. Endi yaqin atrofingizdagi kitoblarni ko‘rib, so‘rov yuborishingiz va so‘rov tasdiqlangach kitobni olib ketishingiz mumkin.\n\nBirinchi qadam: <b>Kitoblar</b> bo‘limiga kiring va sizga mos kitobni tanlang.\n\nXizmatimizdan foydalanishdan zavqlaning!`;
      this.sendMessage(chatId, welcome).catch(() => {});

      this.pendingById.delete(pendingId);
      this.pendingIdByChatId.delete(chatId);

      return res;
    } catch (e: any) {
      // masalan email allaqachon bor bo‘lsa conflict bo‘lib ketadi
      throw e;
    }
  }

  async initTelegramLink(userId: string) {
    if (!this.botToken || !this.botUsername) {
      throw new ServiceUnavailableException(
        'Telegram bot sozlanmagan. Iltimos keyinroq urinib ko‘ring.',
      );
    }

    const pendingId = this.generateLinkPendingId();
    const otp = this.generateOtp();
    const now = Date.now();
    this.pendingLinkById.set(pendingId, {
      pendingId,
      userId,
      otp,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
    });

    return {
      pendingId,
      botLink: `https://t.me/${this.botUsername}?start=${encodeURIComponent(pendingId)}`,
      expiresInSeconds: 600,
    };
  }

  async verifyTelegramLink(userId: string, pendingId: string, code: string) {
    const pending = this.pendingLinkById.get(pendingId);
    if (!pending || pending.userId !== userId) {
      throw new BadRequestException(
        'Tasdiqlash topilmadi. Qaytadan urinib ko‘ring.',
      );
    }
    if (pending.expiresAt < Date.now()) {
      throw new BadRequestException(
        'Tasdiqlash muddati tugadi. Qaytadan urinib ko‘ring.',
      );
    }
    if (!pending.telegramChatId) {
      throw new BadRequestException(
        'Avval botga kirib Start tugmasini bosing.',
      );
    }

    const cleanCode = (code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new BadRequestException('Kod 6 ta raqamdan iborat bo‘lishi kerak.');
    }
    if (cleanCode !== pending.otp) {
      throw new BadRequestException('Kod noto‘g‘ri. Qayta urinib ko‘ring.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: BigInt(pending.telegramChatId),
        telegramUsername: pending.telegramUsername || null,
        telegramVerifiedAt: new Date(),
      },
    });

    this.pendingLinkById.delete(pendingId);
    this.pendingLinkIdByChatId.delete(pending.telegramChatId);

    return { ok: true };
  }
}
