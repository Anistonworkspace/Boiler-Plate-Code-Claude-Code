import { Server as SocketIoServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '@boilerplate/shared';

let io: SocketIoServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIoServer {
  io = new SocketIoServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Missing token'));
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.userId = decoded.sub;
      socket.data.organizationId = decoded.organizationId;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on('connection', (socket) => {
    const { userId, organizationId } = socket.data as { userId: string; organizationId: string };
    socket.join(`user:${userId}`);
    socket.join(`org:${organizationId}`);

    socket.on('disconnect', () => {
      // cleanup happens automatically
    });
  });

  return io;
}

export function getIo(): SocketIoServer | null {
  return io;
}
