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

// Connect to MongoDB
await connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE']
  },
  maxHttpBufferSize: 50 * 1024 * 1024
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (!isMemoryDb() && mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      msg: 'Database unavailable. Start MongoDB or check MONGO_URI, then restart the backend.'
    });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.use(errorHandler);

setupSocketHandlers(io);

import Room from './models/Room.js';
import Message from './models/Message.js';

// Clean up expired rooms every minute
setInterval(async () => {
  if (isMemoryDb()) {
    const expiredRooms = await memoryStore.deleteExpiredRooms();
    for (const room of expiredRooms) {
      io.to(room._id.toString()).emit('room_ended');
      io.sockets.in(room._id.toString()).socketsLeave(room._id.toString());
      console.log(`Automatically deleted expired room: ${room._id}`);
    }
    return;
  }

  if (mongoose.connection.readyState !== 1) return;

  try {
    const expiredRooms = await Room.find({ 
      expires_at: { $lte: new Date() } 
    });
    
    for (const room of expiredRooms) {
      await Message.deleteMany({ room_id: room._id });
      await Room.findByIdAndDelete(room._id);
      
      // Notify clients that the room has ended
      io.to(room._id.toString()).emit('room_ended');
      io.sockets.in(room._id.toString()).socketsLeave(room._id.toString());
      console.log(`Automatically deleted expired room: ${room._id}`);
    }
  } catch (err) {
    console.error('Error cleaning up expired rooms:', err);
  }
}, 60000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
