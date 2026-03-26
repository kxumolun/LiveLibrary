import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { TelegramOtpService } from '../telegram/telegram-otp.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private telegramOtpService: TelegramOtpService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register/telegram/init')
  initTelegramRegister(@Body() dto: RegisterDto) {
    return this.telegramOtpService.initTelegramRegister(dto);
  }

  @Post('register/telegram/verify')
  verifyTelegramRegister(@Body() dto: { pendingId: string; code: string }) {
    return this.telegramOtpService.verifyTelegramRegister(
      dto.pendingId,
      dto.code,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @Request() req,
    @Body()
    dto: {
      latitude?: number;
      longitude?: number;
      city?: string;
      bio?: string;
      fullName?: string;
    },
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('telegram/link/init')
  @UseGuards(AuthGuard('jwt'))
  initTelegramLink(@Request() req) {
    return this.telegramOtpService.initTelegramLink(req.user.id);
  }

  @Post('telegram/link/verify')
  @UseGuards(AuthGuard('jwt'))
  verifyTelegramLink(
    @Request() req,
    @Body() dto: { pendingId: string; code: string },
  ) {
    return this.telegramOtpService.verifyTelegramLink(
      req.user.id,
      dto.pendingId,
      dto.code,
    );
  }
}
