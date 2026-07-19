import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  room_name: { type: String, required: true },                      // Title of the room
  agenda: { type: String },                                          // Meeting agenda or purpose
  description: { type: String },                                     // Additional room details
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Room creator
  password: { type: String, default: null },                         // Optional join password
  is_private: { type: Boolean, default: false },                     // Requires password if true
  expires_at: { type: Date, default: null },                         // Auto-expiration date
  is_active: { type: Boolean, default: true },                       // Soft-delete toggle
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Member's user reference
      role: { type: String, enum: ['admin', 'member'], default: 'member' } // Permission level
    }
  ]
}, { timestamps: true });                                            // Auto-manages createdAt / updatedAt

export default mongoose.model('Room', roomSchema);

