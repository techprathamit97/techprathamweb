const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join notification room
  socket.on('join', (data) => {
    const { userId, userType } = data;
    const room = `${userType}_${userId}`;
    socket.join(room);
    console.log(`User ${userId} (${userType}) joined room: ${room}`);
  });

  // Leave notification room
  socket.on('leave', (data) => {
    const { userId, userType } = data;
    const room = `${userType}_${userId}`;
    socket.leave(room);
    console.log(`User ${userId} (${userType}) left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible
global.io = io;

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

// Export for use in Next.js API routes
module.exports = { io };