import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedFullName = dto.fullName.trim().replace(/\s+/g, ' ');
    const normalizedPhone = dto.phone.trim();
    const normalizedCity = dto.city?.trim() || null;

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing)
      throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        city: normalizedCity,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        city: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const token = await this.signToken(user.id, user.email);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    // NOTE: DB migration hali qo'llanmagan bo'lishi mumkin.
    // Shuning uchun login uchun minimal fieldlarni select qilamiz (yangi columnlar bo'lmasa ham ishlaydi).
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
        phone: true,
        city: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException("Email yoki parol noto'g'ri");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Email yoki parol noto'g'ri");

    const { passwordHash, ...safeUser } = user;
    const token = await this.signToken(user.id, user.email);
    return { user: safeUser, token };
  }

  async getMe(userId: string) {
    // NOTE: telegram/isBlocked fieldlar DB'da hali bo'lmasligi mumkin (migration pending)
    // Shuning uchun avval minimal select, keyin mavjud bo'lsa kengaytiramiz.
    const base = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });

    if (!base) return null;

    try {
      const extra = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          telegramChatId: true,
          telegramUsername: true,
          telegramVerifiedAt: true,
          isBlocked: true,
        },
      });
      if (!extra) return base;
      return {
        ...base,
        ...extra,
        telegramChatId:
          typeof extra.telegramChatId === 'bigint'
            ? extra.telegramChatId.toString()
            : extra.telegramChatId,
      };
    } catch {
      return base;
    }
  }

  async updateProfile(
    userId: string,
    dto: { fullName?: string; city?: string; bio?: string; phone?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });
  }

  private async signToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      },
    );
  }
}
