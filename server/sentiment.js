// ============================================================================
// LIGHTWEIGHT RULE-BASED SENTIMENT DETECTION (OPTION C)
// Classifies visitor reviews into: positive | neutral | negative | issue
// Includes negation handling ("not bad"), phrase matching, and technical issue detection.
// Ambiguous inputs fall back safely to neutral.
// ============================================================================

const NEGATION_WORDS = new Set([
  'not', 'no', 'never', 'hardly', 'barely', 'scarcely', 'isnt', "isn't",
  'arent', "aren't", 'wasnt', "wasn't", 'werent', "weren't",
  'cant', "can't", 'cannot', 'couldnt', "couldn't", 'wont', "won't",
  'dont', "don't", 'doesnt', "doesn't", 'didnt', "didn't", 'without'
]);

// Strong technical issue keywords and multi-word phrases
const ISSUE_PHRASES = [
  'does not work', "doesn't work", 'not working', 'wont work', "won't work",
  'cannot click', "can't click", 'broken on', 'cant buy', "can't buy",
  'page froze', 'screen froze', 'stuck on', 'crash', 'crashing',
  'failed to load', 'error on', 'bug on', 'glitch on', 'black screen',
  'white screen', 'button broken', 'links broken', 'audio broken',
  'sound broken', 'music broken', '404', '500 error', 'does not open',
  "doesn't open", 'nothing happens', 'infinite loop'
];

const ISSUE_WORDS = new Set([
  'bug', 'bugs', 'glitch', 'glitches', 'crashed', 'crashing',
  'broken', 'unresponsive', 'freeze', 'freezes', 'freezing'
]);

// Positive keywords and phrases
const POSITIVE_PHRASES = [
  'not bad', 'not terrible', 'not awful', 'love this', 'love it',
  'best company', 'best paci', 'best pacifier', 'great business',
  'big business', 'good job', 'so cute', 'hilarious website',
  'super cute', '10/10', '5/5', 'chef kiss', 'chef\'s kiss',
  'take my money', 'proud investor', 'mom approved', 'well done',
  'genius CEO', 'masterpiece', 'best website'
];

const POSITIVE_WORDS = new Set([
  'good', 'great', 'love', 'loved', 'loving', 'awesome', 'amazing',
  'best', 'fantastic', 'excellent', 'wonderful', 'cool', 'cute',
  'fun', 'funny', 'hilarious', 'brilliant', 'perfect', 'genius',
  'happy', 'legend', 'legendary', 'favorite', 'favourite', 'solid',
  'impressive', 'respect', 'hustle', 'adorable', 'sweet', 'super',
  'beautiful', 'clean', 'smooth', 'works', 'nice', 'nicely', 'win', 'winning'
]);

// Negative keywords and phrases
const NEGATIVE_PHRASES = [
  'not good', 'not great', 'not funny', 'waste of time', 'this sucks',
  'worst company', 'worst website', 'i hate', 'hate this', 'terrible job',
  'horrible experience', 'awful design', '0/10', '1/5', 'scam company',
  'want a refund', 'give refund', 'calling police', 'firing babu'
];

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'hate', 'hated', 'hating',
  'worst', 'suck', 'sucks', 'sucked', 'stupid', 'ugly', 'boring',
  'annoying', 'angry', 'trash', 'garbage', 'useless', 'crying',
  'scam', 'fraud', 'fire', 'fired', 'poor', 'slow', 'pathetic',
  'overpriced', 'disappointed', 'disappointing', 'mess', 'gross'
]);

/**
 * Clean and tokenize text into words
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Determine the sentiment of a review message.
 * @param {string} text
 * @returns {'positive' | 'neutral' | 'negative' | 'issue'}
 */
export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') return 'neutral';

  const lower = text.toLowerCase().trim();

  // 1. Check for genuine technical issues first
  for (const phrase of ISSUE_PHRASES) {
    if (lower.includes(phrase)) {
      return 'issue';
    }
  }

  const tokens = tokenize(lower);
  let issueWordCount = 0;
  for (const token of tokens) {
    if (ISSUE_WORDS.has(token)) {
      issueWordCount++;
    }
  }
  if (issueWordCount >= 2 || (issueWordCount === 1 && (lower.includes('phone') || lower.includes('browser') || lower.includes('mobile') || lower.includes('screen')))) {
    return 'issue';
  }

  // 2. Check for explicit multi-word positive/negative phrases
  for (const phrase of POSITIVE_PHRASES) {
    if (lower.includes(phrase)) {
      // Check if the positive phrase is directly negated (e.g. "definitely not good job")
      const idx = lower.indexOf(phrase);
      const prefix = lower.substring(Math.max(0, idx - 15), idx);
      const isNegated = Array.from(NEGATION_WORDS).some(neg => prefix.includes(neg));
      if (!isNegated) {
        return 'positive';
      }
    }
  }

  for (const phrase of NEGATIVE_PHRASES) {
    // Note: "this sucks" is the brand name tagline ("THIS SUCKS.™")!
    // If they say "this sucks" in reference to the brand, treat carefully
    if (lower.includes(phrase)) {
      if (phrase === 'this sucks' && (lower.includes('™') || lower.includes('brand') || lower.includes('pacifier') || lower.includes('official'))) {
        // Brand mention, don't trigger automatic negative
        continue;
      }
      return 'negative';
    }
  }

  // 3. Token-level scoring with negation window
  let positiveScore = 0;
  let negativeScore = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check if preceded by a negation word within 1-2 words
    let isNegated = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      if (NEGATION_WORDS.has(tokens[j])) {
        isNegated = true;
        break;
      }
    }

    if (POSITIVE_WORDS.has(token)) {
      if (isNegated) {
        negativeScore += 1.2; // "not good" -> negative
      } else {
        positiveScore += 1;
      }
    } else if (NEGATIVE_WORDS.has(token)) {
      if (isNegated) {
        positiveScore += 0.8; // "not bad" -> mildly positive
      } else {
        negativeScore += 1;
      }
    }
  }

  // 4. Score evaluation with confidence threshold
  const diff = positiveScore - negativeScore;

  if (positiveScore > 0 && negativeScore === 0) {
    return 'positive';
  }
  if (negativeScore > 0 && positiveScore === 0) {
    return 'negative';
  }

  // Mixed or ambiguous review:
  if (diff >= 1.5) {
    return 'positive';
  }
  if (diff <= -1.5) {
    return 'negative';
  }

  // If score is equal, close, or zero, classify as neutral
  return 'neutral';
}

/**
 * Predefined Babu response libraries tailored to sentiment.
 * Mischievous, funny, pacifier-obsessed, toddler corporate CEO tone.
 */
export const BABU_REACTIONS = {
  positive: [
    "YOU'RE MY FAVOURITE HUMAN! I AM PROMOTING YOU TO SENIOR SUCKER.",
    "GOO GOO GA GA! YOU GET IT! YOU HAVE EXECUTIVE TASTE.",
    "I WOULD GIVE YOU A PACIFIER, BUT I NEED ALL OF THEM FOR MY NAP.",
    "Babu clapped excitedly, drooled on his desk, and approved your bonus!",
    "HIGH FIVE! (Babu misses your hand completely and slaps his own knee).",
    "You just earned 500 imaginary shares of THIS SUCKS™ Corp!",
    "Babu signed an executive decree granting you unlimited imaginary cookies.",
    "EXCELLENT FEEDBACK. I am scheduling you for a 3-hour boardroom giggle session.",
    "Your review gave me the energy to crawl across the entire living room rug!",
    "Mom printed your review and stuck it on the fridge with a magnet!"
  ],
  neutral: [
    "HMM. I WILL THINK ABOUT THIS DURING NAP TIME.",
    "OKAY. FAIR ENOUGH. AS LONG AS REVENUE STAYS UP.",
    "I HEARD YOU. NOW WHERE IS MY WARM MILK?",
    "Babu stared intently, blinked twice, and reached for a pacifier.",
    "Duly noted in the Official Cardboard Ledger.",
    "Babu yawned, signed the receipt with a purple crayon, and took a nap.",
    "Interesting proposal. Submit it in writing with attached animal crackers.",
    "The CEO nodded thoughtfully while balancing a block on his head.",
    "Under review by the Toddler Board of Directors."
  ],
  negative: [
    "WOW. OKAY. I AM GOING TO CRY ABOUT THIS IN BOARDROOM A.",
    "THIS IS A BUSINESS, NOT A DAYCARE! RESPECT THE HUSTLE.",
    "Babu stared silently for 5 seconds, then started clapping sarcastically.",
    "Your grievance has been filed directly under my nap pillow.",
    "I HAVE SOILED MY EXECUTIVE DIAPER WITH RAGE.",
    "Refund denied. That munny has already been invested into apple puree.",
    "Babu threw his rattle across the nursery in protest of this memo.",
    "My lawyers (Mom & Teddy Bear) will be contacting you shortly.",
    "I will address this immediately after my scheduled 2:00 PM tantrum.",
    "Noted. I chewed on a plastic block until I forgot what you said."
  ],
  issue: [
    "OH NO. MOM! WE HAVE A TECHNICAL GLITCH! CODE RED IN NURSERY!",
    "Babu looked extremely concerned and shook his rattle at the server rack.",
    "WE ARE DISPATCHING TOMMY THE DOG TO SNIFF OUT THE BUG IMMEDIATELY.",
    "Hold on! Mom is looking at the computer right now while I watch.",
    "I pressed 47 random buttons on the keyboard to fix it. Did it work?",
    "Dev team (me with a plastic wrench) is investigating this breakdown.",
    "Unplugging the pacifier and plugging it back in...",
    "Server error 404: Pacifier dropped under the sofa."
  ]
};

/**
 * Select a suitable Babu reaction string for a given sentiment.
 * Deterministic fallback ensures it never fails.
 * @param {'positive' | 'neutral' | 'negative' | 'issue'} sentiment
 * @returns {string}
 */
export function getBabuReaction(sentiment) {
  const options = BABU_REACTIONS[sentiment] || BABU_REACTIONS.neutral;
  const idx = Math.floor(Math.random() * options.length);
  return options[idx] || "Babu smiled and started clapping enthusiastically.";
}

/**
 * Predefined returning-visitor greeting library based on their previous sentiment.
 * @param {'positive' | 'neutral' | 'negative' | 'issue'} previousSentiment
 * @param {string} previousMessageExcerpt
 * @returns {{ headline: string, subtext: string, tag: string }}
 */
export function getReturningGreeting(previousSentiment, previousMessageExcerpt = '') {
  const excerpt = previousMessageExcerpt ? `"${previousMessageExcerpt}"` : '';

  switch (previousSentiment) {
    case 'positive':
      return {
        headline: '"YOU\'RE BACK! I REMEMBER YOU!"',
        subtext: excerpt 
          ? `Babu remembers: You said ${excerpt} and you're officially his favorite investor.`
          : "Babu remembers your glowing feedback and saved you an imaginary pacifier.",
        tag: "RETURNING INVESTOR DETECTED ★"
      };

    case 'negative':
      return {
        headline: '"OH. IT\'S YOU AGAIN. I HAVE BEEN THINKING ABOUT YOUR FEEDBACK."',
        subtext: excerpt
          ? `Babu recalls: ${excerpt}. He cried a little, but business goes on.`
          : "Babu is still recovering from your previous review, but is willing to negotiate.",
        tag: "RETURNING CRITIC DETECTED ⚠️"
      };

    case 'issue':
      return {
        headline: '"YOU\'RE BACK! IS THE WEBSITE WORKING NOW?"',
        subtext: excerpt
          ? `Mom investigated after you reported: ${excerpt}. Tommy checked the wires!`
          : "Mom inspected the tech glitch you reported. Tommy sniffed the server rack.",
        tag: "SYSTEM DIAGNOSTIC FOLLOW-UP 🛠️"
      };

    case 'neutral':
    default:
      return {
        headline: '"YOU AGAIN?! DID YOU BRING A PACIFIER?"',
        subtext: excerpt
          ? `Babu retrieved your previous memo: ${excerpt}. Still awaiting his milk break.`
          : "The CEO has recognized your browser credentials in the executive log.",
        tag: "RETURNING SHAREHOLDER DETECTED 🍼"
      };
  }
}
