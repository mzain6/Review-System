import restaurants from '../restaurants.json' with { type: 'json' };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const COUNT = 6;

// Every batch covers the food, plus other topics picked at random for variety.
const MAIN_TOPIC = 'the food overall';
const OTHER_TOPICS = [
  'the taste and freshness',
  'the service',
  'the staff',
  'the atmosphere',
  'value for money',
  'how long the order took',
  'portion size',
  'the seating and space',
  'who you came with (family, friends or colleagues)',
];

const LENGTHS = [
  'one short sentence (6-12 words)',
  'one short sentence (6-12 words)',
  'one or two sentences (15-25 words)',
  'one or two sentences (15-25 words)',
  'two to three sentences (30-45 words)',
];

const VOICES = [
  'casual and relaxed',
  'warm and enthusiastic',
  'plain and matter-of-fact',
  'polite and straightforward',
  'brief and to the point',
  'chatty',
];

const RATING_GUIDE = {
  1: 'Very disappointed. A calm, honest complaint about one or two ordinary things. No praise at all.',
  2: 'Let down. Mostly negative; may admit one small positive.',
  3: 'Average. A bit of good and a bit of "meh". Nothing glowing, nothing harsh.',
  4: 'Happy. A good visit, with at most one tiny nitpick.',
  5: 'Loved it. Genuinely enthusiastic, but natural, not gushing ad copy.',
};

// For 1-2 star ratings the customer picks which part of the visit fell short, and every comment sticks to it.
// Each list needs at least COUNT angles so a batch never repeats one.
export const COMPLAINT_TOPICS = {
  food: {
    label: 'Food',
    hint: 'Taste, freshness, how hot it was',
    angles: [
      'the taste felt bland or underwhelming',
      'the food arrived lukewarm',
      'the ingredients did not taste very fresh',
      'the food did not match what they expected from the menu',
      'the quality felt inconsistent',
      'the food was nothing special for the price',
    ],
  },
  staff: {
    label: 'Staff & service',
    hint: 'Attitude, attention, order mix-ups',
    angles: [
      'the staff seemed distracted or inattentive',
      'the staff felt cold or rushed',
      'part of the order was wrong and took a while to fix',
      'had to ask more than once for something simple',
      'nobody checked on the table during the meal',
      'the team seemed unsure or careless with the order',
    ],
  },
  environment: {
    label: 'Environment',
    hint: 'Noise, seating, comfort',
    angles: [
      'it was too noisy to hold a conversation',
      'the seating was cramped or uncomfortable',
      'it felt too warm inside',
      'it was crowded and hard to find a table',
      'the lighting or music made it uncomfortable',
      'the overall vibe was not relaxing',
    ],
  },
  wait: {
    label: 'Waiting time',
    hint: 'Slow orders or seating',
    angles: [
      'the food took a long time to arrive',
      'it took a long time to get seated',
      'nobody gave an update about the delay',
      'drinks and food arrived at very different times',
      'a long wait for the bill',
      'the whole visit felt slow and dragged on',
    ],
  },
  value: {
    label: 'Value for money',
    hint: 'Prices and portions',
    angles: [
      'the prices felt high for what was served',
      'the portions were small for the price',
      'it did not feel worth the money',
      'similar food is available cheaper nearby',
      'the quality did not justify the prices',
      'left still feeling hungry after paying',
    ],
  },
};

const SYSTEM_PROMPT = `You write Google Maps restaurant reviews the way real people type them on their phone right after a meal.

Every review must read like a different person wrote it: different openings, sentence shapes and vocabulary. Never start two reviews the same way.

Every review must clearly match the customer's feeling, whatever its topic. A 1 or 2 star feeling means no real praise anywhere; a 3 star feeling is lukewarm; a 4 or 5 star feeling has no complaints beyond one tiny nitpick at 4.

Style rules:
- Plain everyday words. Contractions are fine. An occasional casual fragment is fine.
- No slang openers like "Yo", "Dude" or "Bro".
- The topic on each line is a hint, not wording to copy. Describe it in your own words.
- Don't open reviews with "I was excited" or "I was hoping". Most reviews don't mention expectations at all.
- No marketing language. Never use: "hidden gem", "must-visit", "culinary", "nestled", "delightful", "top-notch", "exceeded expectations". Use "highly recommend" at most once across all reviews.
- No hashtags. No em dashes. At most one emoji in the whole set; most reviews have none.
- Do not mention the star rating or the number of stars.
- Mention the restaurant by name in at most one review.

Accuracy rules:
- Never invent facts: no dish names unless listed under highlights, and no staff names, prices, awards, numbers (minutes, rupees, headcounts), time of day or day of week. Say "a long wait" or "pretty quick", never "twenty minutes".
- Every review must say how the visit went, not just state a fact like who came along.
- Never make claims about cleanliness, hygiene, food poisoning, safety, legality or discrimination, and never insult anyone.
- Negative reviews stay calm and fair, about ordinary things like waiting time, how warm the food was, noise or attentiveness.

Reply with JSON only: {"reviews": ["...", "..."]}`;

const FALLBACK = {
  5: [
    'Really enjoyed our meal here. Food came out hot and the staff were friendly the whole time. Will be back.',
    'Great place. Good food, nice atmosphere and the service was quick.',
    'Loved it! Everything was fresh and tasty, and the portions were generous.',
    'Came with family and everyone left happy. Good service and a comfortable place to sit.',
    'Solid experience from start to finish. Would happily come again.',
    "Tasty food, polite staff and fair prices. Can't ask for much more.",
  ],
  4: [
    'Good food and friendly staff. Service was a little slow at the start but overall a nice visit.',
    'Enjoyed our meal. Tasty and well priced, will probably be back.',
    'Nice place with a good atmosphere. Food was good, only wish the wait had been shorter.',
    'Pretty good experience. Staff were helpful and the food was fresh.',
    'Good value for money and decent portions. Happy with the visit.',
    "Liked it overall. A couple of small things could be better but I'd go again.",
  ],
  3: [
    'It was okay. Food was decent but nothing that really stood out.',
    'Average visit. Service was fine, food was a bit hit and miss.',
    'Not bad, not great. Some dishes were good, others felt ordinary.',
    'Decent place for a quick meal, though I expected a bit more for the price.',
    'Mixed experience. Friendly staff but the food took a while to arrive.',
    'Alright overall. Might give it another try.',
  ],
  2: [
    "Wasn't impressed this time. Food was lukewarm and service felt slow.",
    "Expected better. The wait was long and the food didn't quite make up for it.",
    'Disappointing visit. Staff seemed busy and our order took a while.',
    'Food was just okay and the service needed work. Hope they improve.',
    'Not the best experience. A few things went wrong with our order.',
    "Underwhelming for the price. There's room to improve.",
  ],
  1: [
    'Very disappointing experience. Long wait and the food arrived cold.',
    "Service was poor and our order was wrong. Didn't feel looked after.",
    "Wouldn't go back. The wait was far too long and nobody followed up.",
    'Not a good visit at all. Food quality and service both fell short.',
    'Really let down. Expected much better and left unhappy.',
    'Bad experience overall. Hope the team takes this feedback on board.',
  ],
};

// Used only if Groq is unreachable, so a 1-2 star customer still gets comments about the area they chose.
const COMPLAINT_FALLBACK = {
  food: [
    'Food was just average. Expected a lot more flavor for what we paid.',
    'My order came out lukewarm, which took away from the whole meal.',
    "The taste didn't impress me at all. Pretty bland overall.",
    "Not the freshest food I've had. Disappointing.",
    'Quality seems to be hit and miss here. This time it missed.',
    "Had high hopes for the food but it didn't live up to them.",
  ],
  staff: [
    'Staff seemed distracted and it was hard to get anyone to come to our table.',
    "Service felt rushed and a bit cold. Didn't feel very welcome.",
    'They got part of our order wrong and it took a while to sort out.',
    'Had to ask more than once for something simple. Staff need to be more attentive.',
    'Nobody checked on us during the meal. Service really needs work.',
    'The team seemed unsure and a little careless with our order.',
  ],
  environment: [
    'Way too noisy to have a proper conversation. Not a relaxing place to eat.',
    'Seating was cramped and uncomfortable, especially for a group.',
    'It was quite warm inside and nothing seemed to help.',
    'Hard to find a table and the place felt crowded and chaotic.',
    "The vibe just wasn't comfortable. Wouldn't choose to sit in again.",
    'Lighting and noise made it an uncomfortable place to spend a meal.',
  ],
  wait: [
    'Waited far too long for our food and nobody gave us an update.',
    'Took forever to get seated even though there were free tables.',
    'The food came out very slowly. Not great when you are hungry.',
    'Our drinks and food arrived at completely different times.',
    'Long wait for the bill as well. The whole visit dragged on.',
    'Slow from start to finish. Plan for a long wait if you come here.',
  ],
  value: [
    'Quite pricey for what you get. Did not feel worth it.',
    'Portions were small for the price. Left still feeling hungry.',
    'I expected a lot more for the money we spent.',
    'You can get better food for less elsewhere in the area.',
    "Prices are on the high side and the quality doesn't justify them.",
    'Not great value. Would think twice before coming back.',
  ],
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Models leave typographic tells (non-breaking hyphens, curly quotes, dashes) that real phone reviews rarely have.
const clean = (text) =>
  String(text)
    .trim()
    .replace(/^["“]|["”]$/g, '')
    .replace(/[‐‑]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

export function getRestaurant(slug) {
  return Object.hasOwn(restaurants, slug ?? '') ? { slug, ...restaurants[slug] } : null;
}

export const reviewUrl = (restaurant) =>
  `https://search.google.com/local/writereview?placeid=${restaurant.placeId}`;

function pickTopics(highlights, complaint) {
  if (complaint) {
    // Complaints stay inside the chosen area. For the food area, one angle is about the signature dish.
    const angles = shuffle(complaint.angles).slice(0, highlights.length ? COUNT - 1 : COUNT);
    if (highlights.length) angles.push(`the ${pick(highlights)} were disappointing`);
    return shuffle(angles);
  }
  // Otherwise: the food, the signature dish (if any), and a random spread of other topics.
  const featured = highlights.length ? [`the ${pick(highlights)}`] : [];
  const others = shuffle(OTHER_TOPICS).slice(0, COUNT - 1 - featured.length);
  return shuffle([MAIN_TOPIC, ...featured, ...others]);
}

function buildPrompt(restaurant, rating, complaint) {
  // A complaint about staff, noise, etc. must not drag the signature dish into it.
  const highlights = complaint && complaint !== COMPLAINT_TOPICS.food ? [] : restaurant.highlights ?? [];
  const specs = pickTopics(highlights, complaint)
    .map((topic, i) => `${i + 1}. topic: ${topic}; length: ${pick(LENGTHS)}; voice: ${pick(VOICES)}`)
    .join('\n');

  return `Restaurant: ${restaurant.name}${restaurant.area ? ` (${restaurant.area})` : ''}
Famous for (the only dishes you may name): ${highlights.length ? highlights.join(', ') : 'nothing specific, so do not name any dish'}
Customer's feeling: ${RATING_GUIDE[rating]}
${complaint ? `The customer was unhappy with: ${complaint.label}. Every review is about this area only; say nothing about other parts of the visit.\n` : ''}Language: ${restaurant.language || 'English'}

Write ${COUNT} reviews, one per line of this spec:
${specs}`;
}

async function askGroq(model, restaurant, rating, complaint) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 1,
      max_completion_tokens: 2500,
      response_format: { type: 'json_object' },
      ...(model.startsWith('openai/gpt-oss') && { reasoning_effort: 'low' }),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(restaurant, rating, complaint) },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Groq returned ${response.status}: ${await response.text()}`);

  const data = await response.json();
  const { reviews } = JSON.parse(data.choices[0].message.content);
  const seen = new Set();
  return reviews
    .map(clean)
    .filter((text) => text.length >= 15 && text.length <= 400)
    .filter((text) => !seen.has(text.toLowerCase()) && seen.add(text.toLowerCase()));
}

// Recently generated comments per restaurant/rating/topic. When Groq is rate limited, visitors get a fresh
// mix from here instead of the same few canned lines. Lives per server instance, which is fine for a cache.
const POOL_MAX = 60;
const pool = new Map();

function remember(key, comments) {
  pool.set(key, [...new Set([...(pool.get(key) ?? []), ...comments])].slice(-POOL_MAX));
}

// `topic` is a COMPLAINT_TOPICS key and only applies to 1-2 star ratings.
export async function generateComments(restaurant, rating, { useAI = true, topic = null } = {}) {
  const complaintId = rating <= 2 && Object.hasOwn(COMPLAINT_TOPICS, topic ?? '') ? topic : null;
  const poolKey = `${restaurant.slug}:${rating}:${complaintId ?? ''}`;

  if (useAI && process.env.GROQ_API_KEY) {
    // Each Groq model has its own rate limit, so a second model doubles the headroom.
    const models = new Set([process.env.GROQ_MODEL || 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
    for (const model of models) {
      try {
        const comments = await askGroq(model, restaurant, rating, complaintId && COMPLAINT_TOPICS[complaintId]);
        if (comments.length >= 3) {
          remember(poolKey, comments);
          return { comments, source: 'ai' };
        }
      } catch (err) {
        console.error(`Comment generation failed (${model}):`, err.message.slice(0, 200));
      }
    }
  }

  const pooled = pool.get(poolKey) ?? [];
  if (pooled.length >= COUNT) return { comments: shuffle(pooled).slice(0, COUNT), source: 'cache' };

  const bank = complaintId ? COMPLAINT_FALLBACK[complaintId] : FALLBACK[rating];
  return { comments: shuffle(bank).slice(0, COUNT), source: 'fallback' };
}
