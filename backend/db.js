// db.js
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const uri = process.env.MONGO_URI;
let client;

let db;

async function connectDB() {
  if (!uri) {
    throw new Error(
      'MONGO_URI is not set. Please add it to backend/.env before starting the server.'
    );
  }

  client = new MongoClient(uri);
  try {
    await client.connect();
    db = client.db("hopshare");

    // Ensure auth-related indexes exist for user upserts.
    await db.collection('users').createIndex(
      { googleId: 1 },
      { unique: true, sparse: true }
    );
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, sparse: true }
    );

    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    throw err;
  }
}

function getDB() {
  if (!db) throw new Error('Database not connected');
  return db;
}

module.exports = { connectDB, getDB };
