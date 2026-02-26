import AudioPost from './AudioPostModel.js';

const now = () => new Date();

export async function getAudioFeed() {
  const posts = await AudioPost.find({ expiryAt: { $gt: now() } })
    .sort({ createdAt: -1 })
    .lean();
  return posts;
}
