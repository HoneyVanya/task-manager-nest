import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TasksGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBoard')
  handleJoinBoard(
    @MessageBody() boardId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`board:${boardId}`);
    this.logger.log(`Client ${client.id} joined board:${boardId}`);
    return { event: 'joined', boardId };
  }

  @SubscribeMessage('leaveBoard')
  handleLeaveBoard(
    @MessageBody() boardId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`board:${boardId}`);
    this.logger.log(`Client ${client.id} left board:${boardId}`);
  }

  notifyTaskUpdated(boardId: string, task: any) {
    this.server.to(`board:${boardId}`).emit('taskUpdated', task);
  }
}
