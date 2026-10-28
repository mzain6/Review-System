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
  'one or two short sentences (15-25 words)',
  'one or two short sentences (15-25 words)',
  'two or three short sentences (25-40 words)',
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
  'one short sentence (10-18 words)',
  'two short sentences (18-26 words)',
  'two short sentences (18-26 words)',
  'three short sentences (25-35 words)',
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
    signature: (dish) => `the ${dish} were not as good as the restaurant is known for, and the taste or texture was poor`,
    angles: [
      'the food was lukewarm, so it did not taste as good as it should',
      'the food had little flavour, so they had to add salt or sauce to enjoy it',
      'the main item was dry or overcooked, so it was hard to enjoy',
      'the dish looked messy, as if nobody cared how it was made',
      'one dish was fine but another was clearly worse',
      'the ingredients did not taste fresh',
    ],
  },
  staff: {
    label: 'Staff & service',
    hint: 'Attitude, attention, order mix-ups',
    angles: [
      'part of the order was wrong and took a long time to fix, with hardly any apology',
      'had to call a staff member more than once for something basic because nobody was watching the tables',
      'when they raised a problem, the staff did not seem to care',
      'nobody explained the delay or checked on the table, so they felt ignored',
      'the staff could not answer simple questions about the menu',
      'service felt rushed, as if clearing the table mattered more than the customers',
    ],
  },
  environment: {
    label: 'Environment',
    hint: 'Noise, seating, comfort',
    angles: [
      'it was so loud that they could not talk, which spoiled the meal',
      'tables were so close together that there was no privacy and little room to move',
      'it was too hot inside and the air was not moving, so it was hard to enjoy the food',
      'the chairs were uncomfortable for a long meal',
      'nobody told people where to sit, so people stood around while tables sat empty',
      'the music was too loud for a restaurant, so the place felt stressful instead of relaxing',
    ],
  },
  wait: {
    label: 'Waiting time',
    hint: 'Slow orders or seating',
    angles: [
      'the food took a very long time and nobody said why, so they did not know how much longer it would be',
      'a long wait for a table even though some looked empty, which was a bad start',
      'dishes came at very different times, so some people finished before others started',
      'the bill took a long time, which made the end of the meal drag',
      'it took a long time for anyone to take the order, so the meal started slowly',
      'the food was cold by the time it came, so the long wait was not worth it',
    ],
  },
  value: {
    label: 'Value for money',
    hint: 'Prices and portions',
    angles: [
      'the prices felt high for the small portions, so it was not good value',
      'the food was not as good as the price, and cheaper places nearby are just as good',
      'they were still hungry after paying full price',
      'drinks and sides cost a lot compared with the main dish',
      'the food was only average, and at this price they expected much better',
      'the price was too high for the service and the place',
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
      'how fast the staff were',
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

Easy to read (every review, every rating):
- Write so that anyone can understand it at once, including people who read English as a second language. Use simple, common words a 12-year-old knows, and short sentences with one idea each. Keep every sentence under 15 words.
- Say things directly. "The food was cold" beats "the food arrived at a suboptimal temperature". "Too loud" beats "the noise level was high". "Slow" beats "prolonged". "Fresh" beats "of a high standard".
- No semicolons, no long chains of commas, no fancy or formal words.
- No idioms or slang that a second-language reader could misread, like "hit and miss", "spot on", "did the job" or "went the extra mile". Say what you mean plainly.

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
    'Tasty food, polite staff and fair prices. Very happy with it.',
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
    'Average visit. Service was fine. The food was good in some ways and plain in others.',
    'Not bad, not great. Some dishes were good, others were just okay.',
    'Decent place for a quick meal, though I expected a bit more for the price.',
    'Mixed experience. Friendly staff but the food took a while to arrive.',
    'Alright overall. Might give it another try.',
  ],
  2: [
    'The food was lukewarm and the service was slow. It spoiled what could have been a good meal.',
    'The wait was longer than it should be. The food was not good enough to make up for it.',
    'The staff were busy and our order took a while. They were polite, but the tables need more attention.',
    'The food was only average for the price. I expected better.',
    'A few things went wrong with our order and it took time to fix. Hopefully they sort that out.',
    'Not worth the price. The food was okay, but the service was weak.',
  ],
  1: [
    'The food came cold after a long wait. It ruined the whole meal for us.',
    'Our order was wrong and it took too long to fix. The staff did not try to make up for it.',
    'We waited a long time and nobody told us why. The food was poor when it finally came. I would not come back unless things change.',
    'The food and the service were both bad for what we paid. It was not a good visit.',
    'The meal was not worth the price. When I raised a problem, it was not handled well.',
    'The wait was long and nobody updated us, so we felt ignored.',
  ],
};

// Used only if Groq is unreachable, so a 1-2 star customer still gets comments about the area they chose.
// Each one names the problem and why it mattered, and works for both 1 and 2 stars.
const COMPLAINT_FALLBACK = {
  food: [
    'The food was lukewarm, so it did not taste as good as it should. It spoiled the meal.',
    'The food had little flavour. I had to add sauce just to enjoy it.',
    'The main dish was dry and overcooked, so it was hard to finish. I expected better.',
    'The dish looked messy, as if nobody cared how it was made.',
    'One dish was fine but another was clearly worse. The food was not the same quality across the table.',
    'The ingredients did not taste fresh. That let the whole dish down.',
  ],
  staff: [
    'Part of our order was wrong. It took a long time to fix and the staff barely said sorry.',
    'We had to call a staff member over more than once for something basic. Nobody was watching the tables.',
    'When I raised a problem, the staff did not seem to care. That made it feel worse.',
    'Nobody explained the delay or checked on our table. We felt ignored for most of the meal.',
    'The staff could not answer simple questions about the menu. That made ordering harder than it should be.',
    'Service felt rushed, as if clearing the table mattered more than looking after us.',
  ],
  environment: [
    'It was so loud that we could not talk. That spoiled a meal that should have been relaxed.',
    'The tables were so close together that there was no privacy and hardly any room to move.',
    'It was too hot inside and the air was not moving. It was hard to enjoy the food.',
    'The chairs were uncomfortable for a long meal. We left sooner than we wanted to.',
    'Nobody told us where to sit, so we stood around while tables sat empty.',
    'The music was too loud for a restaurant. The place felt stressful instead of relaxing.',
  ],
  wait: [
    'The food took a very long time and nobody told us why. We did not know how much longer it would be.',
    'We waited a long time for a table even though some looked empty. It was a bad start to the visit.',
    'Our dishes came at very different times. Some of us finished before others had started.',
    'The bill took a long time to come. It made the end of an already slow meal drag.',
    'It took a long time for anyone to take our order, so the meal started slowly.',
    'The food was cold by the time it came. The long wait was not worth it.',
  ],
  value: [
    'The prices felt high for the small portions. It was not good value.',
    'The food was not as good as the price. Cheaper places nearby are just as good.',
    'I was still hungry after paying full price. That is hard to accept.',
    'Drinks and sides cost a lot compared with the main dish. It pushed the bill up.',
    'The food was only average, and at this price I expected much better.',
    'The price was too high for the service and the place. It did not feel worth it.',
  ],
};

// Used only if Groq is unreachable, so the tone still matches the rating: average at 3, good at 4, excellent at 5.
const FEEDBACK_FALLBACK = {
  3: {
    food: [
      'Food was okay. Nothing special, but it was fine to eat.',
      'The taste was decent overall, but a bit average for the price.',
      'Some of the food was fine and some was plain. It could be better.',
      'Portions were okay and the food was alright. Nothing special.',
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
      'Fine for a quick meal. Not a very lively place, though.',
      'Average setting. It could be a bit nicer.',
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
      'Good food overall. Only one or two small things I would change.',
    ],
    speed: [
      'Good service speed. Our order came out in decent time.',
      'Quick enough and nice and smooth.',
      'No long wait for a table and the food came in good time.',
      'Service was fast. The staff kept things moving.',
      'Pretty quick overall. Just a tiny delay with the bill.',
    ],
    environment: [
      'Nice atmosphere and comfortable seating. Enjoyed sitting here.',
      'Good place to relax. It feels calm and pleasant.',
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
      'The flavours were great and it all tasted fresh.',
      'Food came out hot and tasted amazing. I will order the same again.',
      'Excellent food. Nothing we ordered let us down.',
    ],
    speed: [
      'Super quick service. Our food came out fast and still hot.',
      'No long waiting at all. The staff were fast and helpful.',
      'Got seated right away and the order arrived quickly. Really smooth.',
      'Fast service without feeling rushed. Perfect when you are hungry.',
      'Everything was smooth and quick, even the bill.',
      'Impressed by how quick the whole thing was.',
    ],
    environment: [
      'Lovely, relaxed atmosphere. Perfect for sitting down and talking.',
      'Comfortable seating and plenty of space. Felt very welcoming.',
      'A great spot for family and friends. Nice and friendly feel all around.',
      'The music and lighting were just right. Really calm place to eat.',
      'Cozy, comfortable and easy to relax in. Would happily sit here again.',
      'Wonderful place with a warm feel. We stayed longer than planned.',
    ],
    overall: [
      'Excellent experience from start to finish. Food, service and place were all great.',
      'Really enjoyed our visit. Will definitely be coming back.',
      'Everything was great from start to finish. Happy with it all round.',
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
const TIME_OF_VISIT = /\b(breakfast|lunch|dinner|tonight|today|yesterday|morning|evening|night|weekend|(mon|tues|wednes|thurs|fri|satur|sun)day|hours?|minutes?)\b|\d/i;

// A complaint that shouts or exaggerates reads as venting, not feedback. Drop those so only measured ones remain.
const OVER_THE_TOP = /\b(worst|terrible|horrible|disgusting|awful|pathetic|garbage|trash|scam|ridiculous)\b|!/i;

// The prompt asks for plain customer words, but models drift into consultant talk ("lack of attentiveness",
// "should be addressed", "better coordination") that no one types after dinner.
const BUSINESS_SPEAK =
  /\b(implement\w*|standardi[sz]\w*|discrepanc\w*|ambient|perception|insufficient\w*|diminish\w*|undermin\w*|ensur(?:e|ed|ing)|disjointed|attentiveness|coordination|management|training|unreliable|addressed|satisfaction|structure|customers|guests?|diners|suggest\w*|reconsider\w*|revis(?:e|ing)|adjust\w*|would improve|managers?|hosts?|owner|reheated|leftovers?|stale)\b/i;

// Reviews are read by all sorts of people, some in a second language. Keep them easy: short sentences, no
// semicolons, none of the fancy words models reach for.
const FANCY_WORDS =
  /\b(inconsisten\w*|noticeabl\w*|considerabl\w*|impersonal|ventilation|unappealing|unsatisfying|underwhelming|prolonged|staggered|disrupt\w*|detract\w*|palate|vivid|vibran\w*|exquisite|impeccabl\w*|unforgettable|indifferent|subpar|mediocre|adequate|nevertheless|furthermore|moreover|utili[sz]\w*|efficient\w*|swift\w*|rapid\w*|overwhelming|vibes?|hit and miss|spot on|went the extra mile)\b/i;
const MAX_SENTENCE_WORDS = 22;

const isEasyToRead = (text) =>
  !text.includes(';') &&
  !FANCY_WORDS.test(text) &&
  text.split(/[.!?]+\s*/).every((sentence) => sentence.split(/\s+/).filter(Boolean).length <= MAX_SENTENCE_WORDS);

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
    .filter(isEasyToRead)
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
