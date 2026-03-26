import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private connectedUsers = new Map<string, string>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      this.connectedUsers.set(payload.sub, client.id);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { borrowId: string; receiverId: string; content: string },
  ) {
    try {
      const senderId = client.data.userId;
      const message = await this.chatService.saveMessage({
        borrowId: data.borrowId,
        senderId,
        receiverId: data.receiverId,
        content: data.content,
      });

      const receiverSocketId = this.connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('new_message', message);
      }
      client.emit('new_message', message);
    } catch (err: any) {
      client.emit('chat_error', { message: err.message });
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { borrowId: string },
  ) {
    await this.chatService.markAsRead(data.borrowId, client.data.userId);

    // O'qilgan xabarlar haqida senderga xabar berish
    const readMessages = await this.chatService.getReadMessages(
      data.borrowId,
      client.data.userId,
    );
    if (readMessages.length > 0) {
      const senderIds = [...new Set(readMessages.map((m: any) => m.senderId))];
      const readAt = new Date().toISOString();
      senderIds.forEach((senderId) => {
        const senderSocketId = this.connectedUsers.get(senderId as string);
        if (senderSocketId) {
          this.server.to(senderSocketId).emit('message_read', {
            messageIds: readMessages
              .filter((m: any) => m.senderId === senderId)
              .map((m: any) => m.id),
            readAt,
          });
        }
      });
    }
  }
}
