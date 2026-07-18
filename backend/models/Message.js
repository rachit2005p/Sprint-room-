import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: '' },
  message_type: { type: String, enum: ['text', 'audio', 'ppt', 'image'], default: 'text' },
  audio_data: { type: String, default: null },

  // PPT attachment (base64)
  file_name: { type: String, default: null },
  file_mime: { type: String, default: null },
  file_data: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);

