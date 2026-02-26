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
import AudioPost from './AudioPostModel.js';
import { getFeed } from './feedController.js';
import { getAudioFeed } from './audioFeedController.js';

const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
const hasCloudinaryKeys =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;
if (hasCloudinaryUrl) {
  cloudinary.config();
} else if (hasCloudinaryKeys) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4'];
const MAX_DURATION_SEC = 60;
const DEFAULT_EXPIRY_HOURS = 24;

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

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.post('/api/audio/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file' });
  }
  const mimetype = (req.file.mimetype || '').toLowerCase();
  const isAllowed = ALLOWED_AUDIO_TYPES.some((t) => mimetype === t) || mimetype.startsWith('audio/');
  if (!isAllowed) {
    return res.status(400).json({ error: 'Invalid file type. Allowed: audio only.' });
  }
  const durationSec = Math.min(Number(req.body.duration) || 0, MAX_DURATION_SEC);
  if (!hasCloudinaryUrl && !hasCloudinaryKeys) {
    return res.status(503).json({ error: 'Cloudinary not configured' });
  }
  try {
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, { resource_type: 'video' });
    const createdAt = new Date();
    const expiryAt = new Date(createdAt.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);
    const newPost = await AudioPost.create({
      userId: req.body.userId || null,
      username: req.body.username || 'anonymous',
      audioUrl: result.secure_url,
      duration: durationSec,
      createdAt,
      expiryAt,
      likes: 0,
      impressions: 0,
      avatar: req.body.avatar || null,
      anonymousId: req.body.anonymousId || '',
    });
    const post = newPost.toObject ? newPost.toObject() : newPost;
    return res.status(200).json({ post });
  } catch (err) {
    console.error('Upload failed:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/audio/feed', async (req, res) => {
  try {
    const posts = await getAudioFeed();
    return res.status(200).json({ posts });
  } catch (err) {
    console.error('Feed failed:', err);
    return res.status(500).json({ error: 'Feed failed' });
  }
});

app.post('/bubble/upload', upload.single('audio'), async (req, res) => {
  console.log('FILE:', req.file);
  console.log('BODY:', req.body);
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file received' });
  }
  if (!hasCloudinaryUrl && !hasCloudinaryKeys) {
    return res.status(503).json({ error: 'Cloudinary not configured' });
  }
  try {
    const dataUri =
      'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'video',
    });
    console.log('Cloudinary URL:', result.secure_url);
    const newBubble = await Bubble.create({
      audioUrl: result.secure_url,
      avatar: req.body.avatar || null,
      anonymousId: req.body.anonymousId || '',
      createdAt: new Date(),
      expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      likes: 0,
      impressions: 0,
    });
    res.json({ bubble: newBubble });
  } catch (err) {
    console.error('Upload failed:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/bubble/feed', async (req, res) => {
  try {
    const bubbles = await getFeed();
    return res.status(200).json({ bubbles });
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
    const [bubbleResult, postResult] = await Promise.all([
      Bubble.deleteMany({ expiryAt: { $lte: new Date() } }),
      AudioPost.deleteMany({ expiryAt: { $lte: new Date() } }),
    ]);
    const total = (bubbleResult.deletedCount || 0) + (postResult.deletedCount || 0);
    if (total > 0) console.log(`Deleted ${total} expired post(s)`);
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
