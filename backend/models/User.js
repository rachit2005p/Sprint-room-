import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },             // Display name shown in rooms
  email: { type: String, required: true, unique: true },  // Login credential, must be unique
  password: { type: String, required: true },             // Hashed password
  avatar_url: { type: String, default: null }             // Optional profile picture URL
}, { timestamps: true });                                  // Auto-manages createdAt / updatedAt

export default mongoose.model('User', userSchema);
