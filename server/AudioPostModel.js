import mongoose from 'mongoose';

const audioPostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: 'anonymous' },
    audioUrl: { type: String, required: true },
    duration: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    expiryAt: { type: Date, required: true },
    likes: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    avatar: { type: String, default: null },
    anonymousId: { type: String, default: '' },
  },
  { collection: 'audioposts' }
);

export default mongoose.model('AudioPost', audioPostSchema);
