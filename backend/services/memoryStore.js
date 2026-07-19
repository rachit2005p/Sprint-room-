import crypto from 'crypto';

const users = [];
const rooms = [];
const messages = [];

const createId = () => crypto.randomBytes(12).toString('hex');

const toId = (value) => value?.toString?.() || String(value);

const clone = (value) => JSON.parse(JSON.stringify(value));

const attachSave = (room) => ({
  ...room,
  async save() {
    const idx = rooms.findIndex((r) => r._id === this._id);
    if (idx !== -1) {
      const { save, ...data } = this;
      rooms[idx] = { ...rooms[idx], ...data };
    }
    return this;
  }
});

export const memoryStore = {
  async findUserByEmail(email) {
    return users.find((user) => user.email === email) || null;
  },

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

  async findUserById(id) {
    const user = users.find((item) => item._id === toId(id));
    return user ? clone(user) : null;
  },

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

  async getActiveRooms() {
    const now = new Date();
    return rooms
      .filter((room) => room.is_active && (!room.expires_at || new Date(room.expires_at) > now))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((room) => ({
        ...clone(room),
        created_by: clone(users.find((user) => user._id === room.created_by) || { _id: room.created_by, username: 'Unknown' })
      }));
  },

  async findActiveRoomById(id) {
    const room = rooms.find((item) => item._id === toId(id) && item.is_active);
    return room ? attachSave(room) : null;
  },

  async findRoomById(id) {
    const room = rooms.find((item) => item._id === toId(id));
    return room ? clone(room) : null;
  },

  async deleteRoomById(id) {
    const index = rooms.findIndex((room) => room._id === toId(id));
    if (index !== -1) rooms.splice(index, 1);
  },

  async deleteMessagesByRoomId(roomId) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].room_id === toId(roomId)) {
        messages.splice(index, 1);
      }
    }
  },

  async createMessage({
    room_id,
    sender_id,
    message = '',
    message_type = 'text',
    audio_data = null,
    file_data = null,
    file_name = null,
    file_mime = null
  }) {
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


  async deleteMessageById(id, senderId) {
    const index = messages.findIndex((m) => m._id === toId(id) && m.sender_id === toId(senderId));
    if (index !== -1) {
      messages.splice(index, 1);
      return true;
    }
    return false;
  },

  async getMessagesByRoomId(roomId) {
    return messages
      .filter((message) => message.room_id === toId(roomId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((message) => ({
        ...clone(message),
        sender_id: clone(users.find((user) => user._id === message.sender_id) || { _id: message.sender_id, username: 'Unknown', avatar_url: null })
      }));
  },

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
