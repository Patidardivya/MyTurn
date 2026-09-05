import { Server, Socket } from 'socket.io';

export const initializeSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User tracking their own ticket
    socket.on('join:ticket', (data: { ticketId: string }) => {
      socket.join(`ticket:${data.ticketId}`);
      console.log(`Socket joined ticket:${data.ticketId}`);
    });

    // Public display tracking a branch
    socket.on('join:branch', (data: { branchId: string }) => {
      socket.join(`branch:${data.branchId}`);
      console.log(`Socket joined branch:${data.branchId}`);
    });

    // Operator tracking a specific queue or counter
    socket.on('join:queue', (data: { queueId: string }) => {
      socket.join(`queue:${data.queueId}`);
      console.log(`Socket joined queue:${data.queueId}`);
    });

    socket.on('join:counter', (data: { counterId: string }) => {
      socket.join(`counter:${data.counterId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
