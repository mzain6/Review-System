import { COMPLAINT_TOPICS, getRestaurant, reviewUrl } from '../lib/comments.js';

const complaintTopics = Object.entries(COMPLAINT_TOPICS).map(([id, { label, hint }]) => ({ id, label, hint }));

export default function handler(req, res) {
  const restaurant = getRestaurant(new URL(req.url, 'http://localhost').searchParams.get('r'));
  if (!restaurant) return res.status(404).json({ error: 'Unknown restaurant' });

  res.status(200).json({
    name: restaurant.name,
    area: restaurant.area ?? '',
    reviewUrl: reviewUrl(restaurant),
    complaintTopics,
  });
}
