import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private checkedBlockedColumn = false;
  private blockedColumnExists = false;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // NOTE: DB migration hali qo'llanmagan bo'lishi mumkin.
    // Shuning uchun avval minimal fieldlar, keyin isBlocked bo'lsa tekshiramiz.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    // isBlocked column DB'da bo'lmasa Prisma har safar error log yozadi.
    // Shuning uchun bir marta tekshirib, keyin natijani cache qilamiz.
    if (!this.checkedBlockedColumn) {
      try {
        await this.prisma.user.findFirst({ select: { isBlocked: true } });
        this.blockedColumnExists = true;
      } catch {
        this.blockedColumnExists = false;
      } finally {
        this.checkedBlockedColumn = true;
      }
    }

    if (this.blockedColumnExists) {
      const extra = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBlocked: true },
      });
      if ((extra as any)?.isBlocked)
        throw new ForbiddenException('Akkount vaqtinchalik bloklangan');
    }
    return user;
  }
}
