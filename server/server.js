import './loadEnv.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Server } from 'socket.io';
import cron from 'node-cron';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import Bubble from './BubbleModel.js';
import { getFeed } from './feedController.js';

if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

let db = null;

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set; running without database.');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('DB connect failed (server will still start):', err.message);
    if (err.message?.includes('whitelist')) {
      console.warn('Add your IP at https://cloud.mongodb.com → Network Access → Add IP Address');
    }
  }
}

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.post('/bubble/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file' });
  }
  if (!process.env.CLOUDINARY_URL) {
    return res.status(503).json({ error: 'Cloudinary not configured' });
  }
  try {
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, { resource_type: 'video' });
    return res.status(200).json({ audioUrl: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/bubble/feed', async (req, res) => {
  try {
    const bubbles = await getFeed();
    return res.status(200).json(bubbles);
  } catch (err) {
    console.error('Feed failed:', err);
    return res.status(500).json({ error: 'Feed failed' });
  }
});

app.post('/bubble/impression', (req, res) => {
  res.status(200).json({});
});

connectDB().then(() => {
  cron.schedule('0 * * * *', async () => {
    const result = await Bubble.deleteMany({ expiryAt: { $lte: new Date() } });
    if (result.deletedCount > 0) console.log(`Deleted ${result.deletedCount} expired bubble(s)`);
  });
  server.listen(PORT, () => {
    console.log(`BUBBLE server listening on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Kill it with: kill $(lsof -i :${PORT} -t)`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
});
