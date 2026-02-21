import Bubble from './BubbleModel.js';

const now = () => new Date();

export async function getFeed() {
  const bubbles = await Bubble.find({ expiryAt: { $gt: now() } })
    .sort({ createdAt: -1 })
    .lean();
  return bubbles;
}
