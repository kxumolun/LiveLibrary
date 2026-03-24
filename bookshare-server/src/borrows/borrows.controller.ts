import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BorrowsService } from './borrows.service';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

class CreateRequestDto {
  @IsString()
  bookId: string;

  @IsNumber()
  @Min(1)
  @Max(90)
  durationDays: number;

  @IsOptional()
  @IsString()
  message?: string;
}

class OtpDto {
  @IsString()
  otp: string;
}

@Controller('borrows')
@UseGuards(AuthGuard('jwt'))
export class BorrowsController {
  constructor(private borrowsService: BorrowsService) {}

  @Post('request')
  createRequest(@Request() req, @Body() dto: CreateRequestDto) {
    return this.borrowsService.createRequest(
      req.user.id,
      dto.bookId,
      dto.durationDays,
      dto.message,
    );
  }

  @Get('incoming')
  getIncoming(@Request() req) {
    return this.borrowsService.getIncomingRequests(req.user.id);
  }

  @Get('my-requests')
  getMyRequests(@Request() req) {
    return this.borrowsService.getMyRequests(req.user.id);
  }

  @Get('my-borrows')
  getMyBorrows(@Request() req) {
    return this.borrowsService.getMyBorrows(req.user.id);
  }

  @Get('owner-borrows')
  getOwnerBorrows(@Request() req) {
    return this.borrowsService.getOwnerBorrows(req.user.id);
  }

  @Patch('request/:id/accept')
  accept(@Param('id') id: string, @Request() req) {
    return this.borrowsService.respond(id, req.user.id, true);
  }

  @Patch('request/:id/reject')
  reject(@Param('id') id: string, @Request() req) {
    return this.borrowsService.respond(id, req.user.id, false);
  }

  @Patch(':id/handover')
  confirmHandover(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: OtpDto,
  ) {
    return this.borrowsService.confirmHandover(id, req.user.id, dto.otp);
  }

  @Patch(':id/initiate-return')
  initiateReturn(@Param('id') id: string, @Request() req) {
    return this.borrowsService.initiateReturn(id, req.user.id);
  }

  @Patch(':id/confirm-return')
  confirmReturn(@Param('id') id: string, @Request() req, @Body() dto: OtpDto) {
    return this.borrowsService.confirmReturn(id, req.user.id, dto.otp);
  }
}
