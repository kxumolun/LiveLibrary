import { Module } from '@nestjs/common';
import { BorrowsService } from './borrows.service';
import { BorrowsController } from './borrows.controller';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ChatModule, AuthModule],
  controllers: [BorrowsController],
  providers: [BorrowsService],
})
export class BorrowsModule {}
