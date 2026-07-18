import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  room_name: { type: String, required: true },
  agenda: { type: String },
  description: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  password: { type: String, default: null },
  is_private: { type: Boolean, default: false },
  expires_at: { type: Date, default: null },
  is_active: { type: Boolean, default: true },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['admin', 'member'], default: 'member' }
    }
  ]
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);

