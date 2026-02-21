import Bubble from './BubbleModel.js';

const now = () => new Date();
const TRENDING_LIMIT = 5;
const RANDOM_LIMIT = 15;

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function getFeed() {
  const filter = { expiryAt: { $gt: now() } };

  const [trending, random] = await Promise.all([
    Bubble.find(filter).sort({ impressions: -1 }).limit(TRENDING_LIMIT).lean(),
    Bubble.aggregate([
      { $match: { expiryAt: { $gt: now() } } },
      { $sample: { size: RANDOM_LIMIT } },
    ]),
  ]);

  const seen = new Set(trending.map((b) => b._id.toString()));
  const merged = [...trending];
  for (const doc of random) {
    const id = doc._id.toString();
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(doc);
    }
  }

  return shuffle(merged);
}
