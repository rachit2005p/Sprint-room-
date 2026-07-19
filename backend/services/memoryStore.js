import crypto from 'crypto';

// In-memory fallback stores for development (no MongoDB required)
const users = [];
const rooms = [];
const messages = [];

// Generate a random hex ID (24 chars) for in-memory documents
const createId = () => crypto.randomBytes(12).toString('hex');

// Normalize any ID value to a string for comparison
const toId = (value) => value?.toString?.() || String(value);

// Deep-clone an object to avoid unintended mutations
const clone = (value) => JSON.parse(JSON.stringify(value));

// Wrap a room object with a save() method that updates the in-memory array (mimics Mongoose's .save())
const attachSave = (room) => ({
  ...room,
  async save() {
    const idx = rooms.findIndex((r) => r._id === this._id);
    if (idx !== -1) {
      // Omit the save method when merging current data back into the stored room
      const { save, ...data } = this;
      rooms[idx] = { ...rooms[idx], ...data };
    }
    return this;
  }
});

export const memoryStore = {
  // Find a user by email in the in-memory array
  async findUserByEmail(email) {
    return users.find((user) => user.email === email) || null;
  },

  // Create a new user and add it to the in-memory store
  async createUser({ username, email, password }) {
    const now = new Date();
    const user = {
      _id: createId(),
      username,
      email,
      password,
      avatar_url: null,
      createdAt: now,
      updatedAt: now
    };
    users.push(user);
    return clone(user);
  },

  // Find a user by their _id in the in-memory store
  async findUserById(id) {
    const user = users.find((item) => item._id === toId(id));
    return user ? clone(user) : null;
  },

  // Create a new room and add it to the in-memory store
  async createRoom(roomData) {
    const now = new Date();
    const room = {
      _id: createId(),
      ...roomData,
      created_by: toId(roomData.created_by),
      members: roomData.members.map((member) => ({
        ...member,
        user: toId(member.user)
      })),
      is_active: true,
      createdAt: now,
      updatedAt: now
    };
    rooms.push(room);
    return clone(room);
  },

  // Return all active rooms (not expired), sorted by newest first, with creator info populated
  async getActiveRooms() {
    const now = new Date();
    const activeRooms = rooms.filter(
      (room) => room.is_active && (!room.expires_at || new Date(room.expires_at) > now)
    );
    const sortedRooms = activeRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sortedRooms.map((room) => ({
      ...clone(room),
      created_by: clone(users.find((user) => user._id === room.created_by) || { _id: room.created_by, username: 'Unknown' })
    }));
  },

  // Find a single active room by ID (returns an object with a .save() method)
  async findActiveRoomById(id) {
    const room = rooms.find((item) => item._id === toId(id) && item.is_active);
    return room ? attachSave(room) : null;
  },

  // Find any room by ID (active or inactive)
  async findRoomById(id) {
    const room = rooms.find((item) => item._id === toId(id));
    return room ? clone(room) : null;
  },

  // Delete a room by its ID from the in-memory array
  async deleteRoomById(id) {
    const index = rooms.findIndex((room) => room._id === toId(id));
    if (index !== -1) rooms.splice(index, 1);
  },

  // Remove all messages belonging to a given room
  async deleteMessagesByRoomId(roomId) {
    // Loop backward because splice shifts array indices; iterating top-down would skip adjacent items
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].room_id === toId(roomId)) {
        messages.splice(index, 1);
      }
    }
  },

  // Create a new message in the in-memory store
  async createMessage(params) {
    const {
      room_id,
      sender_id,
      message = '',
      message_type = 'text',
      audio_data = null,
      file_data = null,
      file_name = null,
      file_mime = null
    } = params;
    const now = new Date();
    const savedMessage = {
      _id: createId(),
      room_id: toId(room_id),
      sender_id: toId(sender_id),
      message,
      message_type,
      audio_data,
      file_data,
      file_name,
      file_mime,
      createdAt: now,
      updatedAt: now
    };
    messages.push(savedMessage);
    return clone(savedMessage);
  },


  // Delete a message by its ID, but only if the senderId matches (ownership check)
  async deleteMessageById(id, senderId) {
    const index = messages.findIndex((m) => m._id === toId(id) && m.sender_id === toId(senderId));
    if (index !== -1) {
      messages.splice(index, 1);
      return true;
    }
    return false;
  },

  // Get all messages for a room, sorted chronologically, with sender info populated
  async getMessagesByRoomId(roomId) {
    const roomMessages = messages.filter((message) => message.room_id === toId(roomId));
    const sortedMessages = roomMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return sortedMessages.map((message) => ({
      ...clone(message),
      sender_id: clone(users.find((user) => user._id === message.sender_id) || { _id: message.sender_id, username: 'Unknown', avatar_url: null })
    }));
  },

  // Find and delete all rooms whose expires_at has passed, along with their messages
  async deleteExpiredRooms() {
    const now = new Date();
    const expiredRooms = rooms.filter((room) => room.expires_at && new Date(room.expires_at) <= now);
    for (const room of expiredRooms) {
      await this.deleteMessagesByRoomId(room._id);
      await this.deleteRoomById(room._id);
    }
    return expiredRooms.map(clone);
  }
};
