import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },  // Parent room
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Author
  message: { type: String, default: '' },                                            // Text content
  message_type: { type: String, enum: ['text', 'audio', 'ppt', 'image'], default: 'text' }, // Content type
  audio_data: { type: String, default: null },                                       // Base64-encoded audio

  // PPT / image attachment (base64)
  file_name: { type: String, default: null },  // Original file name
  file_mime: { type: String, default: null },  // MIME type of file
  file_data: { type: String, default: null }   // Base64-encoded file content
}, { timestamps: true });                       // Auto-manages createdAt / updatedAt

export default mongoose.model('Message', messageSchema);

