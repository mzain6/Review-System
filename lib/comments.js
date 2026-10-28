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

// A complaint needs room for the problem, the reason it mattered and its effect, so 1-2 stars never get the
// one-liners or the cheerful voices above.
const COMPLAINT_LENGTHS = [
  'one clear sentence (15-25 words)',
  'two sentences (20-30 words)',
  'two sentences (20-30 words)',
  'two to three sentences (30-40 words)',
];

const COMPLAINT_VOICES = [
  'calm and professional',
  'polite but firm',
  'plain and matter-of-fact',
  'constructive, like feedback for the owner',
  'measured and fair',
  'brief and specific',
];

const RATING_GUIDE = {
  1: 'VERY DISAPPOINTED. A serious but fair complaint: a clear problem, why it mattered and what it cost the visit. Firm and professional, never angry. Some reviews may say they would not return unless things improve. No praise at all.',
  2: 'LET DOWN. Below what they expected. One or two specific problems, each with the reason it mattered, in a measured and constructive tone. May acknowledge one small positive before explaining what fell short. Some reviews may say they would give it another chance if it improves.',
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
    signature: (dish) => `the ${dish} did not live up to the restaurant's reputation for them, and the taste or texture was underwhelming`,
    angles: [
      'the food arrived lukewarm, so the flavour and texture suffered',
      'the seasoning was flat, so the dish needed extra salt or sauce just to taste of something',
      'the main item was dry or overcooked, which made it hard to enjoy',
      'the dish looked carelessly put together, which made it feel like little care went into it',
      'the quality was inconsistent, with one dish decent and another clearly below standard',
      'the ingredients did not taste fresh, which let down the whole dish',
    ],
  },
  staff: {
    label: 'Staff & service',
    hint: 'Attitude, attention, order mix-ups',
    angles: [
      'part of the order was wrong and fixing it took a long time, with little apology',
      'had to call a staff member over more than once for something basic because nobody was watching the tables',
      'when a problem was raised, the response was dismissive instead of helpful',
      'nobody explained the delay or checked on the table, so they felt ignored',
      'the staff could not answer simple questions about the menu, which made ordering harder than it should be',
      'service felt rushed and impersonal, as if clearing the table mattered more than looking after the customers',
    ],
  },
  environment: {
    label: 'Environment',
    hint: 'Noise, seating, comfort',
    angles: [
      'the noise made conversation difficult, which spoiled a meal meant to be relaxed',
      'tables were packed so close together that there was no privacy and little room to move',
      'poor ventilation made the room uncomfortably warm, which made it hard to enjoy the food',
      'the seating was uncomfortable for a longer meal',
      'there was no clear system for seating people, so customers stood around while tables sat empty',
      'the music was loud for a dining room, which made the place feel stressful rather than relaxing',
    ],
  },
  wait: {
    label: 'Waiting time',
    hint: 'Slow orders or seating',
    angles: [
      'the food took a very long time to arrive and nobody gave an update, so there was no idea how much longer it would be',
      'a long wait to be seated even though some tables looked free, which was a poor start to the visit',
      'dishes arrived at very different times, so some people finished before others had started',
      'the bill took a long time to arrive, which dragged out the end of an already slow meal',
      'it took a long time for anyone to come and take the order, so the meal got off to a slow start',
      'by the time the food came out it had cooled, so the long wait did not even pay off',
    ],
  },
  value: {
    label: 'Value for money',
    hint: 'Prices and portions',
    angles: [
      'the prices felt high for the portion size, so the meal did not feel like good value',
      'the quality did not match the price, and cheaper places nearby serve food that is just as good',
      'left still hungry after paying full price, which is hard to justify',
      'drinks and sides were expensive compared with the main dish, which pushed the bill up',
      'the food was only average, and at this price they expected something clearly better',
      'the price did not match the service or the setting, so it did not feel worth it',
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
- Name a famous dish in at most two of the reviews. The rest say "the food" or "the main dish".
- Every review must say how the visit went, not just state a fact like who came along.
- Never make claims about cleanliness, hygiene, food poisoning, safety, legality or discrimination, and never insult anyone.

Complaint rules (only when the customer's feeling is 1 or 2 stars):
- Sound like a polite, sensible customer typing a fair review on their phone: calm, firm and respectful. Not venting, and not a consultant or a company report.
- Write in first person and past tense, as someone who was there ("we waited", "my order came"), never as an outside observer and never in present tense.
- Plain everyday words. No business-speak such as "implement", "standardize", "discrepancy", "ambient", "perception", "insufficient", "diminished", "ensure" or "improve the experience".
- Every review names one specific problem, the reason it mattered and how it affected the visit. Example: "Our food came out lukewarm, so the cheese had set and the meal lost most of its taste." Never just say "bad", "disappointing", "not good" or "didn't like it" without saying what went wrong and why it mattered.
- Speak only for yourself ("we", "I", "our"). Never talk about "customers", "guests" or "diners" in general.
- Stay with the problem the topic gives. Don't add incidents or details of your own: no menu items, ingredients, toppings, substitutions, sides or drinks, no claims about what the menu promised, and no mention of a manager, host or owner.
- The problem must be something the restaurant controls and a fair person would care about. Nothing petty or silly, and nothing outside the restaurant's control such as weather, parking or the customer's own mood.
- No exaggeration, sarcasm, shouting, exclamation marks or insults. Never use "worst", "terrible", "horrible", "disgusting" or "awful".
- Each review raises a different problem. Don't repeat the same complaint in different words.
- Most reviews end with how it affected the visit, and that is the last sentence. At most two reviews add a wish, under eight words, like "Hopefully they sort that out." Never advice about training, management, processes or improving the experience.
- Never threaten to report the restaurant or warn other people away.

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
    'The food was lukewarm and the service was slow, which took away from what could have been a decent meal.',
    'The wait was longer than it should have been and the food did not make up for it.',
    'Staff were busy and our order took a while, though the team was polite. More attention to the tables would help.',
    'The food was only average for the price. A bit more consistency would make a real difference.',
    'A couple of things went wrong with our order and took time to sort out. Better coordination would help.',
    'Underwhelming for the price. The food was okay, but the service needs more attention.',
  ],
  1: [
    'The food arrived cold after a long wait, which made the whole meal disappointing. I expected better.',
    'Our order was wrong and it took too long to fix, with no real effort from the staff to make up for it.',
    'We were left waiting with no explanation, and the food that finally came was not up to standard. I would not return unless things improve.',
    'Quality and service both fell short of what the prices suggest. It was not a good visit.',
    'The meal did not live up to the price, and when I raised an issue it was not handled well.',
    'The wait was long and nobody updated us, so we felt ignored. I hope the team takes this on board.',
  ],
};

// Used only if Groq is unreachable, so a 1-2 star customer still gets comments about the area they chose.
// Each one names the problem and why it mattered, and works for both 1 and 2 stars.
const COMPLAINT_FALLBACK = {
  food: [
    'The food arrived lukewarm, which flattened the flavour and made the whole meal less enjoyable.',
    'The seasoning was bland, and I needed extra sauce just to make the dish taste of something.',
    'The main dish was dry and overcooked, so it was hard to finish. I expected better.',
    'The dish looked carelessly put together, which made it feel like little care went into it.',
    'Quality was inconsistent across the table. One dish was decent while another was clearly below standard.',
    'The ingredients did not taste fresh, which let down the dish and left me unlikely to order it again.',
  ],
  staff: [
    'Part of our order was wrong, and fixing it took a long time without much of an apology from the staff.',
    'We had to call a staff member over more than once for something basic because nobody was watching the tables.',
    'When I mentioned a problem, the response was dismissive instead of helpful, which made the issue feel worse.',
    'Nobody explained the delay or checked on our table, so we felt ignored for most of the meal.',
    'The staff could not answer simple questions about the menu, which made ordering harder than it should be.',
    'Service felt rushed and impersonal, as if the priority was clearing the table rather than looking after us.',
  ],
  environment: [
    'The noise level made it hard to hold a conversation, which spoiled a meal that was meant to be relaxed.',
    'Tables were packed so close together that there was no privacy and barely room to move.',
    'Ventilation was poor and the room felt uncomfortably warm, which made it hard to enjoy the food.',
    'The seating was uncomfortable for a longer meal, which cut our visit shorter than we wanted.',
    'There was no clear system for seating people, so we stood around while tables sat empty.',
    'The music was loud for a dining room, and it made the place feel more stressful than relaxing.',
  ],
  wait: [
    'The food took a very long time to arrive and nobody gave us an update, so we had no idea how much longer to expect.',
    'We waited a long time to be seated even though some tables looked free, which was a poor start to the visit.',
    'Dishes arrived at very different times, so some of us finished eating before others had started.',
    'The bill took a long time to arrive, which dragged out the end of an already slow meal.',
    'It took a long time for anyone to come and take our order, so the meal got off to a slow start.',
    'By the time the food finally came out it had cooled, so the long wait did not even pay off.',
  ],
  value: [
    'The prices felt high for the portion size, so the meal did not feel like good value.',
    'For what we paid, I expected better quality. Cheaper places nearby serve food that is just as good.',
    'I left still hungry after paying full price, which is hard to justify.',
    'Drinks and sides were expensive compared with the main dish, which pushed the bill up.',
    'The food was average, and at these prices I expected something clearly better.',
    'The price did not match the service or the setting, so I would not say it was worth it.',
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

// The prompt forbids inventing when the visit happened or how long anything took, but models slip. A customer who
// ate lunch can't post "for dinner", and "about an hour" or "20 minutes" is a number we made up.
const TIME_OF_VISIT = /\b(breakfast|lunch|dinner|tonight|today|yesterday|morning|evening|weekend|all night|(mon|tues|wednes|thurs|fri|satur|sun)day|hours?|minutes?)\b|\d/i;

// A complaint that shouts or exaggerates reads as venting, not feedback. Drop those so only measured ones remain.
const OVER_THE_TOP = /\b(worst|terrible|horrible|disgusting|awful|pathetic|garbage|trash|scam|ridiculous)\b|!/i;

// The prompt asks for plain customer words, but models drift into consultant talk ("lack of attentiveness",
// "should be addressed", "better coordination") that no one types after dinner.
const BUSINESS_SPEAK =
  /\b(implement\w*|standardi[sz]\w*|discrepanc\w*|ambient|perception|insufficient\w*|diminish\w*|undermin\w*|ensur(?:e|ed|ing)|disjointed|attentiveness|coordination|management|training|unreliable|addressed|satisfaction|structure|customers|guests?|diners|suggest\w*|reconsider\w*|revis(?:e|ing)|adjust\w*|would improve|managers?|hosts?|owner|reheated|leftovers?|stale)\b/i;

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

function pickTopics(highlights, topic, complaint) {
  if (topic) {
    // Stay inside the chosen area. If it allows the signature dish, one angle is about it.
    const withDish = highlights.length > 0 && topic.signature;
    const angles = shuffle(topic.angles).slice(0, withDish ? COUNT - 1 : COUNT);
    if (withDish) angles.push(topic.signature(pick(highlights)));
    return shuffle(angles);
  }
  // A complaint with no area chosen still needs real problems, not topics like who the customer came with.
  if (complaint) {
    return shuffle(Object.values(COMPLAINT_TOPICS).flatMap((area) => area.angles)).slice(0, COUNT);
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
  const complaint = rating <= 2;
  const lengths = complaint ? COMPLAINT_LENGTHS : LENGTHS;
  const voices = complaint ? COMPLAINT_VOICES : VOICES;
  const specs = pickTopics(highlights, topic, complaint)
    .map((topic, i) => `${i + 1}. topic: ${topic}; length: ${pick(lengths)}; voice: ${pick(voices)}`)
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
  const complaint = rating <= 2;
  const seen = new Set();
  return reviews
    .map(clean)
    .filter((text) => text.length >= (complaint ? 40 : 15) && text.length <= 400 && !TIME_OF_VISIT.test(text))
    .filter((text) => !complaint || !(OVER_THE_TOP.test(text) || BUSINESS_SPEAK.test(text)))
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
