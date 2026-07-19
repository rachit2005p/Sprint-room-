import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB, { isMemoryDb } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import { setupSocketHandlers } from './sockets/roomHandler.js';
import { memoryStore } from './services/memoryStore.js';

// Connect to MongoDB (or fall back to in-memory store in dev)
await connectDB();

const app = express();
const server = http.createServer(app);

// Set up Socket.IO for real-time communication (chat, typing, screen share, presentation)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE']
  },
  maxHttpBufferSize: 50 * 1024 * 1024 // Allow up to 50MB file uploads via socket
});

// Security headers
app.use(helmet());

// Allow cross-origin requests from frontend
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Middleware: Check DB health before processing any /api requests
app.use('/api', (req, res, next) => {
  const dbIsDisconnected = !isMemoryDb() && mongoose.connection.readyState !== 1;

  if (dbIsDisconnected) {
    return res.status(503).json({
      msg: 'Database unavailable. Start MongoDB or check MONGO_URI, then restart the backend.'
    });
  }

  next();
});

// Route mounting
app.use('/api/auth', authRoutes);  // Signup, login, profile
app.use('/api/rooms', roomRoutes); // CRUD rooms, messages

app.use(errorHandler); // Global error handler

setupSocketHandlers(io); // Initialize all Socket.IO event handlers

import Room from './models/Room.js';
import Message from './models/Message.js';

/**
 * Notify all clients in a room that it has ended, then force them to leave the socket room.
 */
function notifyRoomEnded(roomId, ioInstance) {
  const roomIdString = roomId.toString();

  ioInstance.to(roomIdString).emit('room_ended');
  ioInstance.sockets.in(roomIdString).socketsLeave(roomIdString);

  console.log(`Automatically deleted expired room: ${roomId}`);
}

// CRITICAL: Auto-cleanup expired rooms every 60 seconds.
// This is the "ephemeral" feature — when a room's timer expires,
// all messages and the room itself are permanently deleted from MongoDB.
const CLEANUP_INTERVAL_MS = 60_000;

setInterval(async () => {
  // --- In-memory store path ---
  if (isMemoryDb()) {
    const expiredRooms = await memoryStore.deleteExpiredRooms();

    for (const room of expiredRooms) {
      notifyRoomEnded(room._id, io);
    }

    return;
  }

  // --- MongoDB path ---
  if (mongoose.connection.readyState !== 1) return;

  try {
    const currentTimestamp = new Date();
    const expiredRoomQuery = { expires_at: { $lte: currentTimestamp } };
    const expiredRooms = await Room.find(expiredRoomQuery);

    for (const room of expiredRooms) {
      // Wipe all messages belonging to the expired room
      await Message.deleteMany({ room_id: room._id });

      // Delete the room itself
      await Room.findByIdAndDelete(room._id);

      // Notify all connected clients that this room is gone
      notifyRoomEnded(room._id, io);
    }
  } catch (err) {
    console.error('Error cleaning up expired rooms:', err);
  }
}, CLEANUP_INTERVAL_MS);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
