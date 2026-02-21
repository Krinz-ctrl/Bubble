import mongoose from 'mongoose';

const bubbleSchema = new mongoose.Schema(
  {
    audioUrl: { type: String, required: true },
    avatar: { type: String, default: null },
    anonymousId: { type: String, required: true },
    likes: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    expiryAt: { type: Date, required: true },
  },
  { collection: 'bubbles' }
);

export default mongoose.model('Bubble', bubbleSchema);
