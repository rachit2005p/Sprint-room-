// ── MongoDB Connection Setup ─────────────────────────────────────────────────
// Purpose: Connect to MongoDB Atlas. If connection fails during development,
//          fall back to a simple in-memory store so the app can still run.

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file into process.env
dotenv.config();

// Don't queue up database commands when the connection drops
// This prevents commands from hanging indefinitely
mongoose.set('bufferCommands', false);

// Track whether we are using in-memory storage instead of real MongoDB
let usingInMemoryDatabase = false;

// Check if the app is running with in-memory storage
export function isMemoryDb() {
  return usingInMemoryDatabase;
}

// Try to connect to MongoDB. If it fails in development mode,
// switch to in-memory storage so the app can still run for testing.
async function connectToDatabase() {
  try {
    const databaseUrl = process.env.MONGO_URI;

    await mongoose.connect(databaseUrl, {
      // Give up after 5 seconds if the database is unreachable
      serverSelectionTimeoutMS: 5000
    });

    console.log('MongoDB Connected...');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);

    // In development mode, use an in-memory store instead of crashing
    const isDevelopmentMode = process.env.NODE_ENV !== 'production';

    if (isDevelopmentMode) {
      usingInMemoryDatabase = true;
      console.warn('Using in-memory development database. Data will reset when the backend restarts.');
      return true;
    }

    // In production, we must have a real database
    return false;
  }
}

export default connectToDatabase;
