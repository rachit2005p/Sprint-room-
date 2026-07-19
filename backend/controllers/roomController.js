import Room from '../models/Room.js';
import Message from '../models/Message.js';
import bcrypt from 'bcrypt';
import { isMemoryDb } from '../config/db.js';
import { memoryStore } from '../services/memoryStore.js';

const createRoomRecord = (room) => (
  isMemoryDb() ? memoryStore.createRoom(room) : Room.create(room)
);

const findActiveRooms = () => {
  if (isMemoryDb()) return memoryStore.getActiveRooms();

  return Room.find({ 
    is_active: true,
    $or: [
      { expires_at: null },
      { expires_at: { $gt: new Date() } }
    ]
  })
    .populate('created_by', 'username')
    .sort({ createdAt: -1 });
};

const findActiveRoomById = (id) => (
  isMemoryDb() ? memoryStore.findActiveRoomById(id) : Room.findOne({ _id: id, is_active: true })
);

const findRoomById = (id) => (
  isMemoryDb() ? memoryStore.findRoomById(id) : Room.findById(id)
);

const deleteMessagesByRoomId = (roomId) => (
  isMemoryDb() ? memoryStore.deleteMessagesByRoomId(roomId) : Message.deleteMany({ room_id: roomId })
);

const deleteRoomById = (roomId) => (
  isMemoryDb() ? memoryStore.deleteRoomById(roomId) : Room.findByIdAndDelete(roomId)
);

const findMessagesByRoomId = (roomId) => {
  if (isMemoryDb()) return memoryStore.getMessagesByRoomId(roomId);

  return Message.find({ room_id: roomId })
    .populate('sender_id', 'username avatar_url')
    .sort({ createdAt: 1 });
};

export const createRoom = async (req, res, next) => {
  const { room_name, agenda, description, expires_in_minutes, password } = req.body;
  try {
    const mins = Math.max(5, Number(expires_in_minutes) || 5);
    const expires_at = new Date(Date.now() + mins * 60000);
    
    let hashedPassword = null;
    let is_private = false;
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
      is_private = true;
    }
    
    const newRoom = await createRoomRecord({
      room_name,
      agenda,
      description,
      password: hashedPassword,
      is_private,
      created_by: req.user.id,
      expires_at,
      members: [{ user: req.user.id, role: 'admin' }]
    });

    res.json({
      id: newRoom._id,
      room_name: newRoom.room_name,
      agenda: newRoom.agenda,
      description: newRoom.description,
      is_private: newRoom.is_private,
      created_by: newRoom.created_by,
      expires_at: newRoom.expires_at,
      created_at: newRoom.createdAt
    });
  } catch (err) {
    next(err);
  }
};

export const getRooms = async (req, res, next) => {
  try {
    const rooms = await findActiveRooms();

    const formattedRooms = rooms.map(r => ({
      id: r._id,
      room_name: r.room_name,
      agenda: r.agenda,
      description: r.description,
      is_private: r.is_private,
      created_by: r.created_by._id,
      creator_name: r.created_by.username,
      expires_at: r.expires_at,
      participant_count: r.members.length,
      created_at: r.createdAt
    }));

    res.json(formattedRooms);
  } catch (err) {
    next(err);
  }
};

export const joinRoom = async (req, res, next) => {
  const { room_id, password } = req.body;
  try {
    const room = await findActiveRoomById(room_id);
    if (!room) return res.status(404).json({ msg: 'Room not found or inactive' });

    const isMember = room.members.find(m => m.user.toString() === req.user.id);
    
    if (!isMember) {
      if (room.is_private) {
        if (!password) {
          return res.status(401).json({ msg: 'Password required to join this room', requires_password: true });
        }
        const isMatch = await bcrypt.compare(password, room.password);
        if (!isMatch) {
          return res.status(401).json({ msg: 'Incorrect password' });
        }
      }
      
      room.members.push({ user: req.user.id, role: 'member' });
      await room.save();
    }

    res.json({ msg: 'Joined successfully', room });
  } catch (err) {
    next(err);
  }
};

export const deleteRoom = async (req, res, next) => {
  const roomId = req.params.id;
  try {
    const room = await findRoomById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    if (room.created_by.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this room' });
    }

    // Delete messages and room
    await deleteMessagesByRoomId(roomId);
    await deleteRoomById(roomId);

    res.json({ msg: 'Room and all associated data permanently deleted' });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  const roomId = req.params.roomId;
  try {
    const messages = await findMessagesByRoomId(roomId);

    const formattedMessages = messages.map(m => ({
      id: m._id,
      room_id: m.room_id,
      sender_id: m.sender_id._id,
      username: m.sender_id.username,
      avatar_url: m.sender_id.avatar_url,
      message: m.message,
      message_type: m.message_type || 'text',
      audio_data: m.audio_data || null,

      file_name: m.file_name || null,
      file_mime: m.file_mime || null,
      file_data: m.file_data || null,

      created_at: m.createdAt
    }));


    res.json(formattedMessages);
  } catch (err) {
    next(err);
  }
};
