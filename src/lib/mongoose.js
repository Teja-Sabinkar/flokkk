// Add to your mongoose.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    console.log('Using existing mongoose connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Add longer timeout
      connectTimeoutMS: 10000,         // Add connection timeout
      socketTimeoutMS: 45000,          // Add socket timeout
      family: 4                        // Use IPv4, skip trying IPv6
    };

    console.log('Creating new mongoose connection to:', MONGODB_URI);
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        
        // Add connection event listeners for better debugging
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
          console.log('MongoDB disconnected');
          cached.conn = null;
          cached.promise = null;
        });
        
        return mongoose;
      })
      .catch(err => {
        console.error('MongoDB connection error:', err);
        cached.promise = null;
        throw err;
      });
  }
  
  try {
    console.log('Awaiting mongoose connection...');
    cached.conn = await cached.promise;
    console.log('Connection established successfully');
    return cached.conn;
  } catch (e) {
    console.error('Error resolving MongoDB connection:', e);
    cached.promise = null;
    throw e;
  }
}

export default dbConnect;