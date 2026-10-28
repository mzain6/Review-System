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
  3: 'AVERAGE. Okay, nothing special. Balanced and honest: one thing fine, one thing that could be better. Use words like "okay", "decent", "fine", "average", "could be better". No excitement and no serious complaints.',
  4: 'GOOD. Clearly enjoyed it and would come back, but measured, not gushing. Use words like "good", "nice", "solid", "enjoyed". At most one tiny nitpick. No superlatives like "best", "amazing", "perfect" or "incredible".',
  5: 'EXCELLENT. Very enthusiastic, as happy as a customer gets. Use words like "excellent", "amazing", "outstanding", "perfect", "best". No complaints at all. Natural, not ad copy.',
};

// At 1-2 stars the customer picks which part of the visit fell short, at 4-5 stars what they liked most.
// Either way every comment sticks to that area.
// Each list needs at least COUNT angles so a batch never repeats one. `signature` marks the topics where the
// restaurant's signature dish may come up, and how.
export const COMPLAINT_TOPICS = {
  food: {
    label: 'Food',
    hint: 'Taste, freshness, how hot it was',
    signature: (dish) => `the ${dish} were disappointing`,
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

// Used for 3, 4 and 5 stars. The angles only name the subject; how positive the comment sounds comes from the
// rating (see RATING_GUIDE), so the same category reads average at 3 stars, good at 4 and excellent at 5.
export const FEEDBACK_TOPICS = {
  food: {
    label: 'Food',
    hint: 'Taste, freshness, portions',
    signature: (dish) => `the ${dish}`,
    angles: [
      'the taste',
      'how fresh it was',
      'how hot it arrived',
      'the portion size',
      'how consistent the food is',
      'the flavours',
    ],
  },
  speed: {
    label: 'Speed of service',
    hint: 'How quick orders and seating were',
    angles: [
      'how fast the order came',
      'the wait to get a table',
      'how quick and efficient the staff were',
      'the pace of the meal from start to finish',
      'how long the bill took',
      'how quickly drinks and starters arrived',
    ],
  },
  environment: {
    label: 'Environment',
    hint: 'Atmosphere, seating, comfort',
    angles: [
      'the atmosphere',
      'the seating and space',
      'the noise level',
      'the music and lighting',
      'how comfortable it is for family and friends',
      'the overall feel of the place',
    ],
  },
  overall: {
    label: 'Overall experience',
    hint: 'Everything together',
    scope: 'Every review is about the visit as a whole, not one single area.',
    signature: (dish) => `the ${dish} and the visit overall`,
    angles: [
      'how the whole visit felt',
      'whether they would come back',
      'whether it suits family and friends',
      'a bit of everything: food, service and the place',
      'how looked after they felt from start to finish',
      'how the visit went from start to finish',
    ],
  },
};

// Every rating has categories: complaints for 1-2 stars, everything else for 3-5.
export const topicsFor = (rating) => (rating <= 2 ? COMPLAINT_TOPICS : FEEDBACK_TOPICS);

const SYSTEM_PROMPT = `You write Google Maps restaurant reviews the way real people type them on their phone right after a meal.

Every review must read like a different person wrote it: different openings, sentence shapes and vocabulary. Never start two reviews the same way.

Every review must clearly match the customer's feeling, whatever its topic. A 1 or 2 star feeling means no real praise anywhere; a 3 star feeling is average and lukewarm; a 4 star feeling is good; a 5 star feeling is excellent. Let word choice show the level: 3 stars sounds like "okay, decent, average", 4 stars like "good, nice, solid", 5 stars like "excellent, amazing, outstanding". Never let a 4 star review sound as excited as a 5 star one.

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

// Used only if Groq is unreachable, so the tone still matches the rating: average at 3, good at 4, excellent at 5.
const FEEDBACK_FALLBACK = {
  3: {
    food: [
      'Food was okay. Nothing special, but it did the job.',
      'Decent taste overall, though it felt a bit average for what you get.',
      'Some of the food was fine, some a bit ordinary. Could be better.',
      'Portions were okay and the food was alright, just not memorable.',
      'Average food. Not bad, not great.',
    ],
    speed: [
      'Service speed was okay. Not slow, but not especially quick either.',
      'Our food took a little while, but nothing too bad. Average overall.',
      'Got a table without too much waiting. The rest of the service was just fine.',
      'Decent pace overall, though things could be a bit quicker.',
      'Service was fine. Could be a bit faster at times.',
    ],
    environment: [
      'The place is okay. Comfortable enough, nothing special.',
      'Decent atmosphere but a bit average. Seating was fine.',
      'It was a bit noisy at times, but overall an okay place to sit.',
      'Fine for a quick meal. Not much of a vibe, though.',
      'Average setting. Could use a little more charm.',
    ],
    overall: [
      'An okay visit overall. Nothing bad, nothing that really stood out.',
      'Average experience. Some good, some could be better.',
      'It was fine. Might come back, might not.',
      'Decent all round, but I expected a bit more.',
      'Alright place. A few things could be improved.',
    ],
  },
  4: {
    food: [
      'Good food. Tasty and fresh, and I enjoyed it.',
      'Nice flavors and decent portions. Solid meal overall.',
      'The food was good and came out hot. Would eat here again.',
      'Enjoyed the food. Good quality and a good amount on the plate.',
      'Solid food, consistently good. Only a small thing or two I would change.',
    ],
    speed: [
      'Good service speed. Our order came out in decent time.',
      'Quick enough and well organized. Nice and smooth.',
      'No long wait for a table and the food arrived in good time.',
      'Service was efficient. Staff kept things moving nicely.',
      'Pretty quick overall. Just a tiny delay with the bill.',
    ],
    environment: [
      'Nice atmosphere and comfortable seating. Enjoyed sitting here.',
      'Good place to relax. The vibe is pleasant and calm.',
      'A nice spot for family and friends. Comfortable and welcoming.',
      'Good setting. The music and lighting were nice.',
      'Pleasant place overall. Gets a little noisy, but still good.',
    ],
    overall: [
      'Good experience overall. Enjoyed the food and the service.',
      'A solid visit. Would happily come back.',
      'Nice place with good food and friendly staff.',
      'Enjoyed our visit. Good all round.',
      'Good experience from start to finish. Only minor things to improve.',
    ],
  },
  5: {
    food: [
      'The food was really tasty. Fresh, hot and full of flavor.',
      'Great food and generous portions. Left completely satisfied.',
      'Everything we ordered was delicious. Easily some of the best food around here.',
      'The flavors were spot on and it all tasted fresh.',
      'Food came out hot and tasted amazing. Will be ordering the same again.',
      'Consistently excellent food. Never been disappointed.',
    ],
    speed: [
      'Super quick service. Our food came out fast and still hot.',
      'No long waiting at all. The staff were fast and efficient.',
      'Got seated right away and the order arrived quickly. Really smooth.',
      'Fast service without feeling rushed. Perfect when you are hungry.',
      'Everything ran smoothly and on time, even the bill.',
      'Impressed by how quick the whole thing was.',
    ],
    environment: [
      'Lovely, relaxed atmosphere. Perfect for sitting down and talking.',
      'Comfortable seating and plenty of space. Felt very welcoming.',
      'A great spot for family and friends. Nice vibe all around.',
      'The music and lighting were just right. Really calm place to eat.',
      'Cozy, comfortable and easy to relax in. Would happily sit here again.',
      'Wonderful place with a warm feel. We stayed longer than planned.',
    ],
    overall: [
      'Excellent experience from start to finish. Food, service and place were all great.',
      'Really enjoyed our visit. Will definitely be coming back.',
      'Everything came together perfectly. Happy with it all round.',
      'Amazing food, friendly staff and a lovely place to sit. Can recommend.',
      'Felt well looked after the whole time. An outstanding visit.',
      'Great all round. Perfect for family and friends.',
    ],
  },
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

// The prompt forbids inventing when the visit happened, but models slip. A customer who ate lunch can't post "for dinner".
const TIME_OF_VISIT = /\b(breakfast|lunch|dinner|tonight|today|yesterday|morning|evening|weekend|all night|(mon|tues|wednes|thurs|fri|satur|sun)day)\b/i;

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

function pickTopics(highlights, topic) {
  if (topic) {
    // Stay inside the chosen area. If it allows the signature dish, one angle is about it.
    const withDish = highlights.length > 0 && topic.signature;
    const angles = shuffle(topic.angles).slice(0, withDish ? COUNT - 1 : COUNT);
    if (withDish) angles.push(topic.signature(pick(highlights)));
    return shuffle(angles);
  }
  // Otherwise: the food, the signature dish (if any), and a random spread of other topics.
  const featured = highlights.length ? [`the ${pick(highlights)}`] : [];
  const others = shuffle(OTHER_TOPICS).slice(0, COUNT - 1 - featured.length);
  return shuffle([MAIN_TOPIC, ...featured, ...others]);
}

function buildPrompt(restaurant, rating, topic) {
  // A topic like staff or noise must not drag the signature dish into it.
  const highlights = topic && !topic.signature ? [] : restaurant.highlights ?? [];
  const focus = topic
    ? `The customer ${rating <= 2 ? 'was unhappy with' : rating === 3 ? 'wants to comment on' : 'liked most'}: ${topic.label}. ${topic.scope ?? 'Every review is about this area only; say nothing about other parts of the visit.'}\n`
    : '';
  const specs = pickTopics(highlights, topic)
    .map((topic, i) => `${i + 1}. topic: ${topic}; length: ${pick(LENGTHS)}; voice: ${pick(VOICES)}`)
    .join('\n');

  return `Restaurant: ${restaurant.name}${restaurant.area ? ` (${restaurant.area})` : ''}
Famous for (the only dishes you may name): ${highlights.length ? highlights.join(', ') : 'nothing specific, so do not name any dish'}
Customer's feeling: ${RATING_GUIDE[rating]}
${focus}Language: ${restaurant.language || 'English'}

Write ${COUNT} reviews, one per line of this spec:
${specs}`;
}

async function askGroq(model, restaurant, rating, topic) {
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
        { role: 'user', content: buildPrompt(restaurant, rating, topic) },
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
    .filter((text) => text.length >= 15 && text.length <= 400 && !TIME_OF_VISIT.test(text))
    .filter((text) => !seen.has(text.toLowerCase()) && seen.add(text.toLowerCase()));
}

// Recently generated comments per restaurant/rating/topic. When Groq is rate limited, visitors get a fresh
// mix from here instead of the same few canned lines. Lives per server instance, which is fine for a cache.
const POOL_MAX = 60;
const pool = new Map();

function remember(key, comments) {
  pool.set(key, [...new Set([...(pool.get(key) ?? []), ...comments])].slice(-POOL_MAX));
}

// `topic` is a key of topicsFor(rating). Unknown or missing topics give general comments for that rating.
export async function generateComments(restaurant, rating, { useAI = true, topic = null } = {}) {
  const topics = topicsFor(rating);
  const topicId = Object.hasOwn(topics, topic ?? '') ? topic : null;
  const poolKey = `${restaurant.slug}:${rating}:${topicId ?? ''}`;

  if (useAI && process.env.GROQ_API_KEY) {
    // Each Groq model has its own rate limit, so a second model doubles the headroom.
    const models = new Set([process.env.GROQ_MODEL || 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
    for (const model of models) {
      try {
        const comments = await askGroq(model, restaurant, rating, topicId && topics[topicId]);
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

  const topicFallback = rating <= 2 ? COMPLAINT_FALLBACK : FEEDBACK_FALLBACK[rating];
  const bank = topicId ? topicFallback[topicId] : FALLBACK[rating];
  return { comments: shuffle(bank).slice(0, COUNT), source: 'fallback' };
}
