import { COMPLAINT_TOPICS, FEEDBACK_TOPICS, getRestaurant, reviewUrl } from '../lib/comments.js';

const describe = (topics) => Object.entries(topics).map(([id, { label, hint }]) => ({ id, label, hint }));
const complaintTopics = describe(COMPLAINT_TOPICS);
const feedbackTopics = describe(FEEDBACK_TOPICS);

export default function handler(req, res) {
  const restaurant = getRestaurant(new URL(req.url, 'http://localhost').searchParams.get('r'));
  if (!restaurant) return res.status(404).json({ error: 'Unknown restaurant' });

  res.status(200).json({
    name: restaurant.name,
    area: restaurant.area ?? '',
    reviewUrl: reviewUrl(restaurant),
    complaintTopics,
    feedbackTopics,
  });
}
