// ── Dependencies ──────────────────────────────────────────────────────────────
// Room / Message: Mongoose models that map to the rooms and messages collections.
// bcrypt: used to hash room passwords so they're never stored in plaintext.
// isMemoryDb / memoryStore: abstraction layer so the app can run with either
//   MongoDB or an in-memory fallback (helpful for demos / CI).
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import bcrypt from 'bcrypt';
import { isMemoryDb } from '../config/db.js';
import { memoryStore } from '../services/memoryStore.js';

// ── Internal helpers ──────────────────────────────────────────────────────────
// Each helper shields the route handlers from the choice of database backend.
// If isMemoryDb() is true they delegate to memoryStore; otherwise they use the
// real Mongoose model.

// Create a room document and persist it.
const createRoomRecord = (room) => {
  if (isMemoryDb()) {
    return memoryStore.createRoom(room);
  } else {
    return Room.create(room);
  }
};

// Return rooms that are active (is_active = true) AND whose expiration date
// hasn't passed yet (or rooms that never expire). Populate the creator's
// username to avoid an extra query on every list. Sort newest first.
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

// Look up a single room, but only if it's still marked active.
const findActiveRoomById = (id) => {
  if (isMemoryDb()) {
    return memoryStore.findActiveRoomById(id);
  } else {
    return Room.findOne({ _id: id, is_active: true });
  }
};

// Look up a room regardless of its active status (used e.g. during deletion).
const findRoomById = (id) => {
  if (isMemoryDb()) {
    return memoryStore.findRoomById(id);
  } else {
    return Room.findById(id);
  }
};

// Remove every message that belongs to a given room.
const deleteMessagesByRoomId = (roomId) => {
  if (isMemoryDb()) {
    return memoryStore.deleteMessagesByRoomId(roomId);
  } else {
    return Message.deleteMany({ room_id: roomId });
  }
};

// Remove the room document itself.
const deleteRoomById = (roomId) => {
  if (isMemoryDb()) {
    return memoryStore.deleteRoomById(roomId);
  } else {
    return Room.findByIdAndDelete(roomId);
  }
};

// Retrieve all messages for a room, sorted chronologically (oldest first).
// Populate sender info (username + avatar) so the client can render them
// without a second API call.
const findMessagesByRoomId = (roomId) => {
  if (isMemoryDb()) return memoryStore.getMessagesByRoomId(roomId);

  return Message.find({ room_id: roomId })
    .populate('sender_id', 'username avatar_url')
    .sort({ createdAt: 1 });
};

// ── Create Room ───────────────────────────────────────────────────────────────
// Accepts room_name, agenda, description, expires_in_minutes, and an optional
// password. The minimum lifetime is 5 minutes. If a password is supplied the
// room is marked private and the password is bcrypt-hashed before storage.
// The creator is automatically added as an admin member.
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

// ── List Rooms ────────────────────────────────────────────────────────────────
// Returns all currently active rooms. Each entry is flattened into a JSON-safe
// shape that includes the creator's name (resolved via populate) and the number
// of members currently in the room. The password hash is intentionally omitted.
export const getRooms = async (req, res, next) => {
  try {
    const rooms = await findActiveRooms();

    const formattedRooms = rooms.map(r => {
      const entry = {
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
      };
      return entry;
    });

    res.json(formattedRooms);
  } catch (err) {
    next(err);
  }
};

// ── Join Room ─────────────────────────────────────────────────────────────────
// Accepts room_id and an optional password. If the room is private and the
// user isn't already a member, they must supply the correct password. Once
// authenticated the user is appended to the members array as a regular member.
// Already-joined users get a success response without being added again.
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

// ── Delete Room ───────────────────────────────────────────────────────────────
// Only the original creator may delete a room. This is a hard delete: it
// removes both the room document and every message belonging to that room.
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

// ── Get Messages ──────────────────────────────────────────────────────────────
// Returns every message in a given room, ordered oldest-first. Each message is
// flattened into a safe JSON shape that includes the sender's display name and
// avatar (resolved via populate). Optional fields (audio, file attachments) are
// included only when they exist.
export const getMessages = async (req, res, next) => {
  const roomId = req.params.roomId;
  try {
    const messages = await findMessagesByRoomId(roomId);

    const formattedMessages = messages.map(m => {
      const entry = {
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
      };
      return entry;
    });


    res.json(formattedMessages);
  } catch (err) {
    next(err);
  }
};
