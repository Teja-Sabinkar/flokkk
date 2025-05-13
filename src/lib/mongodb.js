// src/lib/mongodb.js
import { MongoClient } from 'mongodb';

// If we're in a Node.js environment, we'll need to polyfill global.AbortController
if (typeof AbortController === 'undefined')
  global.AbortController = class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }
    abort() {
      this.signal.aborted = true;
    }
  };

// IMPORTANT: We're explicitly setting the database name to 'test'
// This overrides any database name in the connection string
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = 'test';  // Hardcoded to ensure we connect to the right database

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
let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    // If we're connected to the wrong database, clear the cache to force reconnection
    if (cached.conn.db.databaseName !== MONGODB_DB) {
      console.log(`Reconnecting to correct database: ${MONGODB_DB} (was: ${cached.conn.db.databaseName})`);
      cached.conn = null;
      cached.promise = null;
    } else {
      return cached.conn;
    }
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
    };

    // Modify the connection string if needed to ensure we connect to the test database
    let uri = MONGODB_URI;
    
    // Extract parts of the connection string
    const urlParts = new URL(uri);
    // Override the pathname to force connection to the test database
    urlParts.pathname = '/test';
    uri = urlParts.toString();
    
    console.log(`Connecting to database: ${MONGODB_DB}`);

    cached.promise = MongoClient.connect(uri, opts).then((client) => {
      // Explicitly specify the database name rather than letting it be determined
      // from the connection string
      return {
        client,
        db: client.db(MONGODB_DB),
      };
    }).catch(err => {
      console.error('Database connection error:', err);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}