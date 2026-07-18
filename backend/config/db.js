import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('bufferCommands', false);

let memoryDbEnabled = false;

export const isMemoryDb = () => memoryDbEnabled;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected...');
    return true;
  } catch (err) {
    console.error('Database connection failed', err.message);
    if (process.env.NODE_ENV !== 'production') {
      memoryDbEnabled = true;
      console.warn('Using in-memory development database. Data will reset when the backend restarts.');
      return true;
    }
    return false;
  }
};

export default connectDB;
