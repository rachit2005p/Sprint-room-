import Message from '../models/Message.js';
import { isMemoryDb } from '../config/db.js';
import { memoryStore } from '../services/memoryStore.js';

// Helper: save a message to either the in-memory store or MongoDB depending on the database mode
const createMessage = (message) => (
  isMemoryDb() ? memoryStore.createMessage(message) : Message.create(message)
);

export const setupSocketHandlers = (io) => {
  // Track online users per room (keyed by roomId)
  const onlineUsers = {};

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // join_room: User joins a socket room and is added to the online users list
    socket.on('join_room', ({ roomId, user }) => {
      socket.join(roomId);
      
      if (!onlineUsers[roomId]) {
        onlineUsers[roomId] = [];
      }
      
      if (!onlineUsers[roomId].find(u => u.userId === user.id)) {
        onlineUsers[roomId].push({ userId: user.id, username: user.username, socketId: socket.id });
      }

      io.to(roomId).emit('room_users_update', onlineUsers[roomId]);
      
      console.log(`User ${user.username} joined room ${roomId}`);
    });

    // send_message: Persists a chat message (text, audio, file) and broadcasts it to the room
    socket.on('send_message', async ({
      roomId,
      senderId,
      message = '',
      username,
      messageType = 'text',
      audioData = null,
      fileData = null,
      fileName = null,
      fileMime = null
    }) => {
      try {
        const msg = await createMessage({
          room_id: roomId,
          sender_id: senderId,
          message,
          message_type: messageType,
          audio_data: audioData,

          file_data: fileData,
          file_name: fileName,
          file_mime: fileMime
        });

        const savedMessage = {
          id: msg._id,
          room_id: roomId,
          sender_id: senderId,
          message: msg.message,
          message_type: msg.message_type,
          audio_data: msg.audio_data,

          file_data: msg.file_data,
          file_name: msg.file_name,
          file_mime: msg.file_mime,

          username: username,
          avatar_url: null,
          created_at: msg.createdAt
        };

        io.to(roomId).emit('receive_message', savedMessage);
      } catch (err) {
        console.error('Message save error:', err);
      }
    });

    // media_share_request: Non-admin user requests permission to share media (image/audio) in the room
    socket.on('media_share_request', ({ roomId, senderId, username, messageType, fileData, fileName, fileMime, audioData }) => {
      socket.to(roomId).emit('media_share_requested', { senderId, username, messageType, fileData, fileName, fileMime, audioData, requesterSocketId: socket.id });
    });

    // media_share_approve: Admin approves the media share request; saves the message and notifies the requester
    socket.on('media_share_approve', async ({ roomId, requesterSocketId, senderId, username, messageType, fileData, fileName, fileMime, audioData }) => {
      try {
        const msg = await createMessage({
          room_id: roomId,
          sender_id: senderId,
          message: messageType === 'audio' ? 'Voice message' : `Sent a ${messageType}: ${fileName || 'media'}`,
          message_type: messageType,
          audio_data: audioData,
          file_data: fileData,
          file_name: fileName,
          file_mime: fileMime
        });

        const savedMessage = {
          id: msg._id,
          room_id: roomId,
          sender_id: senderId,
          message: msg.message,
          message_type: msg.message_type,
          audio_data: msg.audio_data,
          file_data: msg.file_data,
          file_name: msg.file_name,
          file_mime: msg.file_mime,
          username: username,
          avatar_url: null,
          created_at: msg.createdAt
        };

        io.to(roomId).emit('receive_message', savedMessage);
        io.to(requesterSocketId).emit('media_share_approved');
      } catch (err) {
        console.error('media_share_approve error:', err);
      }
    });

    // media_share_deny: Admin denies the media share request
    socket.on('media_share_deny', ({ roomId, requesterSocketId }) => {
      io.to(requesterSocketId).emit('media_share_denied');
    });

    // delete_message: Removes a message (only by its sender) from the database and broadcasts the deletion
    socket.on('delete_message', async ({ roomId, messageId, senderId }) => {
      try {
        if (isMemoryDb()) {
          const deleted = await memoryStore.deleteMessageById(messageId, senderId);
          if (!deleted) return;
        } else {
          const msg = await Message.findOne({ _id: messageId, sender_id: senderId });
          if (!msg) return;
          await Message.findByIdAndDelete(messageId);
        }
        io.to(roomId).emit('message_deleted', { messageId });
      } catch (err) {
        console.error('Delete message error:', err);
      }
    });

    // typing: Broadcasts to the room (excluding sender) that a user is typing
    socket.on('typing', ({ roomId, username }) => {
      socket.to(roomId).emit('typing', { username });
    });

    // stop_typing: Broadcasts to the room (excluding sender) that a user has stopped typing
    socket.on('stop_typing', ({ roomId, username }) => {
      socket.to(roomId).emit('stop_typing', { username });
    });

    // room_ended: Immediately terminates a room, kicking all sockets and clearing the online user list
    socket.on('room_ended', ({ roomId }) => {
      io.to(roomId).emit('room_ended');
      io.sockets.in(roomId).socketsLeave(roomId);
      delete onlineUsers[roomId];
    });

    // extend_room_timer: Admin/creator adjusts the room's expiration time by ±delta_minutes
    //   Positive values extend the room, negative values shorten it.
    //   Clamped to ±12 hours per adjustment and total capped at 24 hours from now.
    //   If the timer drops to <= 0 the room is ended immediately and all data is cleaned up.
    socket.on('extend_room_timer', async ({ roomId, delta_minutes, user }) => {
      try {
        console.log('extend_room_timer received', { roomId, delta_minutes, userId: user?.id, username: user?.username });

        // Only allow room admin
        if (!user?.id) {
          console.log('extend_room_timer: missing user.id');
          return;
        }

        let room;
        if (isMemoryDb()) {
          room = await memoryStore.findActiveRoomById(roomId);
        } else {
          const { default: Room } = await import('../models/Room.js');
          room = await Room.findOne({ _id: roomId, is_active: true });
        }
        
        if (!room) return;

        const isAdmin = room.members?.some((m) => {
          const memberUserId = m?.user?.toString?.() ?? m?.user;
          return String(memberUserId) === String(user.id) && m.role === 'admin';
        });

        // Allow both: admin member role OR original creator
        const isCreator = room.created_by?.toString?.() ? String(room.created_by.toString()) === String(user.id) : String(room.created_by) === String(user.id);

        if (!isAdmin && !isCreator) return;

        const now = new Date();
        const currentExpires = room.expires_at ? new Date(room.expires_at) : null;

        let baseTime = currentExpires && currentExpires > now ? currentExpires : now;
        const minutes = Number(delta_minutes);
        if (!Number.isFinite(minutes) || minutes === 0) return;

        // Cap delta to ±12 hours per adjustment (prevent infinite time exploits)
        const maxDelta = 12 * 60; // 12 hours in minutes
        const clampedMinutes = Math.min(Math.max(minutes, -maxDelta), maxDelta);
        let newExpires = new Date(baseTime.getTime() + clampedMinutes * 60000);

        // Cap total timer to max 24 hours from now (prevent infinite room)
        const maxExpires = new Date(now.getTime() + 24 * 60 * 60000);
        if (newExpires > maxExpires) newExpires = maxExpires;

        if (newExpires <= now) {
          // If timer is decreased to zero or less, end the room immediately!
          if (isMemoryDb()) {
            await memoryStore.deleteMessagesByRoomId(roomId);
            await memoryStore.deleteRoomById(roomId);
          } else {
            const { default: Message } = await import('../models/Message.js');
            const { default: Room } = await import('../models/Room.js');
            await Message.deleteMany({ room_id: roomId });
            await Room.findByIdAndDelete(roomId);
          }
          io.to(roomId).emit('room_ended');
          io.sockets.in(roomId).socketsLeave(roomId);
          console.log(`Room ended due to timer set to <= 0: ${roomId}`);
          return;
        }

        room.expires_at = newExpires;
        await room.save();

        // broadcast updated target
        io.to(roomId).emit('room_timer_update', { roomId, expires_at: newExpires.toISOString() });
      } catch (err) {
        console.error('extend_room_timer error:', err);
      }
    });


    // request_presentation: A user requests to start a PowerPoint presentation in the room
    socket.on('request_presentation', ({ roomId, senderId, username, fileName, fileData }) => {
      console.log('request_presentation received', { roomId, senderId, username, fileName });
      io.to(roomId).emit('presentation_requested', { senderId, username, fileName, fileData });
    });

    // approve_presentation: Admin approves the presentation request; saves a chat message and broadcasts the file to all users
    socket.on('approve_presentation', async ({ roomId, presenterId, presenterName, fileName, fileData }) => {
      try {
        console.log('approve_presentation received', { roomId, presenterId, presenterName, fileName });
        
        // Save the presentation in the chat messages
        const msg = await createMessage({
          room_id: roomId,
          sender_id: presenterId,
          message: `Shared presentation: ${fileName}`,
          message_type: 'ppt',
          file_name: fileName,
          file_data: fileData,
          file_mime: 'application/vnd.ms-powerpoint'
        });

        const savedMessage = {
          id: msg._id,
          room_id: roomId,
          sender_id: presenterId,
          message: msg.message,
          message_type: msg.message_type,
          audio_data: null,
          file_data: msg.file_data,
          file_name: msg.file_name,
          file_mime: msg.file_mime,
          username: presenterName,
          avatar_url: null,
          created_at: msg.createdAt
        };

        // Broadcast approved presentation to everyone (so the view opens)
        io.to(roomId).emit('presentation_approved', { presenterId, presenterName, fileName, fileData });
        
        // Also send the presentation message to the chat
        io.to(roomId).emit('receive_message', savedMessage);
      } catch (err) {
        console.error('approve_presentation error:', err);
      }
    });

    // deny_presentation: Admin denies the presentation request
    socket.on('deny_presentation', ({ roomId, presenterId }) => {
      console.log('deny_presentation received', { roomId, presenterId });
      io.to(roomId).emit('presentation_denied', { presenterId });
    });

    // change_slide: Presenter navigates to a specific slide number; broadcast to the room
    socket.on('change_slide', ({ roomId, slideNumber }) => {
      io.to(roomId).emit('slide_changed', { slideNumber });
    });

    // stop_presentation: Presenter ends the presentation; closes the viewer on all clients
    socket.on('stop_presentation', ({ roomId }) => {
      console.log('stop_presentation received', { roomId });
      io.to(roomId).emit('presentation_stopped');
    });

    // add_image_to_presentation: Presenter inserts an image into the live presentation
    socket.on('add_image_to_presentation', ({ roomId, fileName, fileData }) => {
      console.log('add_image_to_presentation received', { roomId, fileName: fileName?.substring(0, 30) });
      io.to(roomId).emit('presentation_image_added', { fileName, fileData });
    });

    // screen_share_request: A user requests permission to start screen sharing
    socket.on('screen_share_request', ({ roomId, userId, username }) => {
      socket.to(roomId).emit('screen_share_requested', { userId, username, requesterSocketId: socket.id });
    });

    // screen_share_approve: Admin approves the screen share request
    socket.on('screen_share_approve', ({ roomId, requesterSocketId }) => {
      io.to(requesterSocketId).emit('screen_share_approved');
    });

    // screen_share_deny: Admin denies the screen share request
    socket.on('screen_share_deny', ({ roomId, requesterSocketId }) => {
      io.to(requesterSocketId).emit('screen_share_denied');
    });

    // screen_share_start: Notifies the room that a user has started sharing their screen
    socket.on('screen_share_start', ({ roomId, userId, username }) => {
      socket.to(roomId).emit('screen_share_started', { userId, username });
    });

    // screen_share_offer: Forwards a WebRTC offer from the sharer to the target viewer
    socket.on('screen_share_offer', ({ roomId, offer, targetSocketId }) => {
      socket.to(targetSocketId).emit('screen_share_offer', { offer, senderSocketId: socket.id });
    });

    // screen_share_answer: Forwards a WebRTC answer from the viewer back to the sharer
    socket.on('screen_share_answer', ({ roomId, answer, targetSocketId }) => {
      socket.to(targetSocketId).emit('screen_share_answer', { answer, senderSocketId: socket.id });
    });

    // screen_share_ice_candidate: Forwards an ICE candidate between peers for WebRTC connection setup
    socket.on('screen_share_ice_candidate', ({ roomId, candidate, targetSocketId }) => {
      socket.to(targetSocketId).emit('screen_share_ice_candidate', { candidate, senderSocketId: socket.id });
    });

    // screen_share_stop: Notifies the room that the screen share has ended
    socket.on('screen_share_stop', ({ roomId }) => {
      socket.to(roomId).emit('screen_share_stopped', { socketId: socket.id });
    });

    // disconnect: Clean up — remove the user from all online user lists and notify each room
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      for (const roomId in onlineUsers) {
        const initialLength = onlineUsers[roomId].length;
        onlineUsers[roomId] = onlineUsers[roomId].filter(u => u.socketId !== socket.id);
        
        if (onlineUsers[roomId].length < initialLength) {
          io.to(roomId).emit('room_users_update', onlineUsers[roomId]);
        }
        
        if (onlineUsers[roomId].length === 0) {
          delete onlineUsers[roomId];
        }
      }
    });
  });
};
