// Vercel Serverless Function for THIS SUCKS.™ Guestbook & Visitor Memory
// Provides serverless API parity for deployed Vercel environments

// In-memory / temporary store for guestbook submissions on serverless runtime
// (backed by client-side Firestore in production)
const globalGuestbook = globalThis.__paciGuestbook || [];
globalThis.__paciGuestbook = globalGuestbook;

function analyzeSentiment(text) {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();
  if (lower.includes("doesn't work") || lower.includes("not working") || lower.includes("broken") || lower.includes("glitch") || lower.includes("bug") || lower.includes("crashed")) {
    return 'issue';
  }
  if (lower.includes("not bad") || lower.includes("love") || lower.includes("great") || lower.includes("best") || lower.includes("awesome") || lower.includes("cute") || lower.includes("good")) {
    return 'positive';
  }
  if (lower.includes("terrible") || lower.includes("worst") || lower.includes("awful") || lower.includes("hate") || lower.includes("trash") || lower.includes("bad")) {
    return 'negative';
  }
  return 'neutral';
}

const BABU_RESPONSES = {
  positive: [
    "YOU'RE MY FAVOURITE HUMAN! I AM PROMOTING YOU TO SENIOR SUCKER.",
    "GOO GOO GA GA! YOU GET IT! YOU HAVE EXECUTIVE TASTE.",
    "I WOULD GIVE YOU A PACIFIER, BUT I NEED ALL OF THEM FOR MY NAP.",
    "Babu clapped excitedly, drooled on his desk, and approved your bonus!",
    "HIGH FIVE! (Babu misses your hand completely and slaps his own knee)."
  ],
  negative: [
    "WOW. OKAY. I AM GOING TO CRY ABOUT THIS IN BOARDROOM A.",
    "THIS IS A BUSINESS, NOT A DAYCARE! RESPECT THE HUSTLE.",
    "Babu stared silently for 5 seconds, then started clapping sarcastically.",
    "Your grievance has been filed directly under my nap pillow.",
    "I HAVE SOILED MY EXECUTIVE DIAPER WITH RAGE."
  ],
  issue: [
    "OH NO. MOM! WE HAVE A TECHNICAL GLITCH! CODE RED IN NURSERY!",
    "Babu looked extremely concerned and shook his rattle at the server rack.",
    "WE ARE DISPATCHING TOMMY THE DOG TO SNIFF OUT THE BUG IMMEDIATELY.",
    "Hold on! Mom is looking at the computer right now while I watch.",
    "Server error 404: Pacifier dropped under the sofa."
  ],
  neutral: [
    "HMM. I WILL THINK ABOUT THIS DURING NAP TIME.",
    "OKAY. FAIR ENOUGH. AS LONG AS REVENUE STAYS UP.",
    "I HEARD YOU. NOW WHERE IS MY WARM MILK?",
    "Babu stared intently, blinked twice, and reached for a pacifier.",
    "Duly noted in the Official Cardboard Ledger."
  ]
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const isMemoryEndpoint = url.pathname.includes('/visitor-memory') || req.query.action === 'visitor-memory';

  // 1. Visitor memory lookup
  if (isMemoryEndpoint || req.query.visitorId) {
    const visitorId = (req.query.visitorId || '').trim();
    if (!visitorId) {
      return res.status(200).json({ success: true, recognized: false });
    }

    const pastMsg = globalGuestbook.slice().reverse().find(m => m.visitorId === visitorId);
    if (pastMsg) {
      const excerpt = pastMsg.message.length > 60 ? `${pastMsg.message.substring(0, 57)}...` : pastMsg.message;
      let headline = '"YOU AGAIN?! DID YOU BRING A PACIFIER?"';
      let tag = 'RETURNING SHAREHOLDER DETECTED 🍼';
      let subtext = `Babu retrieved your previous memo: "${excerpt}". Still awaiting his milk break.`;

      if (pastMsg.sentiment === 'positive') {
        headline = '"YOU\'RE BACK! I REMEMBER YOU!"';
        tag = 'RETURNING INVESTOR DETECTED ★';
        subtext = `Babu remembers: You said "${excerpt}" and you're officially his favorite investor.`;
      } else if (pastMsg.sentiment === 'negative') {
        headline = '"OH. IT\'S YOU AGAIN. I HAVE BEEN THINKING ABOUT YOUR FEEDBACK."';
        tag = 'RETURNING CRITIC DETECTED ⚠️';
        subtext = `Babu recalls: "${excerpt}". He cried a little, but business goes on.`;
      } else if (pastMsg.sentiment === 'issue') {
        headline = '"YOU\'RE BACK! IS THE WEBSITE WORKING NOW?"';
        tag = 'SYSTEM DIAGNOSTIC FOLLOW-UP 🛠️';
        subtext = `Mom investigated after you reported: "${excerpt}". Tommy checked the wires!`;
      }

      return res.status(200).json({
        success: true,
        recognized: true,
        sentiment: pastMsg.sentiment,
        previousMessage: excerpt,
        greeting: { headline, subtext, tag },
        lastVisitAt: pastMsg.createdAt
      });
    }

    return res.status(200).json({ success: true, recognized: false });
  }

  // 2. POST review / complaint
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const text = (body.message || body.complaint || body.text || '').trim();

      if (!text || text.length < 5 || text.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Review message between 5 and 500 characters is required.'
        });
      }

      const visitorId = (body.visitorId || `anon-${Math.random().toString(36).substring(2, 9)}`).trim();
      const sentiment = analyzeSentiment(text);
      const pool = BABU_RESPONSES[sentiment] || BABU_RESPONSES.neutral;
      const babuResponse = pool[Math.floor(Math.random() * pool.length)];

      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const messageId = `GB-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
      const createdAt = new Date().toISOString();

      const entry = {
        id: messageId,
        message: text,
        visitorId,
        sentiment,
        babuResponse,
        status: 'RESOLVED BY BABU',
        createdAt
      };

      globalGuestbook.push(entry);

      return res.status(201).json({
        success: true,
        messageId,
        message: text,
        sentiment,
        babuResponse,
        status: 'RESOLVED BY BABU',
        createdAt
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Babu spilled his milk processing your review.'
      });
    }
  }

  // 3. GET public feed
  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const messages = globalGuestbook.slice(-limit).reverse().map(m => ({
      id: m.id,
      message: m.message,
      sentiment: m.sentiment,
      babuResponse: m.babuResponse,
      status: m.status,
      createdAt: m.createdAt
    }));

    return res.status(200).json({
      success: true,
      messages
    });
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
