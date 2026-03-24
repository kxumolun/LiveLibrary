import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('messages/:borrowId')
  getMessages(@Param('borrowId') borrowId: string, @Request() req) {
    return this.chatService.getMessages(borrowId, req.user.id);
  }

  @Get('unread')
  getUnread(@Request() req) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Delete(':borrowId')
  deleteChat(@Param('borrowId') borrowId: string, @Request() req) {
    return this.chatService.deleteChat(borrowId, req.user.id);
  }
}
