import { generateComments, getRestaurant, reviewUrl, topicsFor } from '../lib/comments.js';

// Per-IP cap on AI calls so a bored scanner can't burn through the Groq quota.
// Over the cap, visitors still get comments, just from the built-in fallback set.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_AI_CALLS = 40;
const hits = new Map();

function overLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_AI_CALLS;
}

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const restaurant = getRestaurant(params.get('r'));
  const rating = Number(params.get('rating'));
  const topic = params.get('topic');

  if (!restaurant) return res.status(404).json({ error: 'Unknown restaurant' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be a whole number from 1 to 5' });
  }
  const topics = topicsFor(rating);
  if (topic && !Object.hasOwn(topics, topic)) {
    return res.status(400).json({ error: `topic must be one of: ${Object.keys(topics).join(', ')}` });
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '').split(',')[0].trim();
  const result = await generateComments(restaurant, rating, { useAI: !overLimit(ip), topic });

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ...result, reviewUrl: reviewUrl(restaurant) });
}
