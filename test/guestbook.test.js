import assert from 'node:assert';
import { analyzeSentiment, getBabuReaction, getReturningGreeting } from '../server/sentiment.js';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runGuestbookTests() {
  console.log('🧪 Starting Guestbook, Sentiment & Visitor Memory Test Suite...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}:`, err.message);
      throw err;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: SENTIMENT DETECTION UNIT TESTS
    // ------------------------------------------------------------------------
    console.log('--- 1. Sentiment Detection Unit Tests ---');

    await test('Classifies clear positive sentiment', () => {
      const res = analyzeSentiment('I love this website! The pacifiers are fantastic and awesome.');
      assert.strictEqual(res, 'positive');
    });

    await test('Classifies clear negative sentiment', () => {
      const res = analyzeSentiment('This website is terrible, awful and completely horrible.');
      assert.strictEqual(res, 'negative');
    });

    await test('Classifies neutral feedback when sentiment is mild or ambiguous', () => {
      const res = analyzeSentiment('The pacifier arrived on Tuesday morning in a box.');
      assert.strictEqual(res, 'neutral');
    });

    await test('Handles basic negation correctly: "not bad" -> positive', () => {
      const res = analyzeSentiment('Honestly, this is not bad at all!');
      assert.strictEqual(res, 'positive');
    });

    await test('Handles negation of positive words: "not good" -> negative', () => {
      const res = analyzeSentiment('The pacifier is not good, it feels cheap.');
      assert.strictEqual(res, 'negative');
    });

    await test('Handles contractions: "wasn\'t great" -> negative', () => {
      const res = analyzeSentiment('The packaging wasn\'t great at all.');
      assert.strictEqual(res, 'negative');
    });

    await test('Identifies genuine technical issues', () => {
      const res1 = analyzeSentiment('The website doesn\'t work on my phone.');
      assert.strictEqual(res1, 'issue');

      const res2 = analyzeSentiment('The button is broken and the page crashed with error 500.');
      assert.strictEqual(res2, 'issue');
    });

    await test('Protects brand name "THIS SUCKS.™" from falsely triggering negative sentiment', () => {
      const res = analyzeSentiment('I really think THIS SUCKS.™ is the best pacifier company ever!');
      assert.strictEqual(res, 'positive');
    });

    // ------------------------------------------------------------------------
    // SECTION 2: BABU REACTIONS & GREETING UNIT TESTS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Babu Character Reactions & Greeting Tests ---');

    await test('Returns playful Babu reaction for all sentiments with deterministic fallbacks', () => {
      const posReaction = getBabuReaction('positive');
      assert.ok(typeof posReaction === 'string' && posReaction.length > 0);

      const negReaction = getBabuReaction('negative');
      assert.ok(typeof negReaction === 'string' && negReaction.length > 0);

      const issueReaction = getBabuReaction('issue');
      assert.ok(typeof issueReaction === 'string' && issueReaction.length > 0);

      const neutralReaction = getBabuReaction('neutral');
      assert.ok(typeof neutralReaction === 'string' && neutralReaction.length > 0);

      // Unknown sentiment returns valid fallback
      const fallback = getBabuReaction('unknown_sentiment_xyz');
      assert.ok(typeof fallback === 'string' && fallback.length > 0);
    });

    await test('Generates contextual greetings for returning visitors', () => {
      const posGreeting = getReturningGreeting('positive');
      assert.ok(posGreeting.headline);
      assert.ok(posGreeting.subtext);

      const negGreeting = getReturningGreeting('negative');
      assert.ok(negGreeting.headline);
      assert.ok(negGreeting.subtext);

      const issueGreeting = getReturningGreeting('issue');
      assert.ok(issueGreeting.headline);
      assert.ok(issueGreeting.subtext);
    });

    // ------------------------------------------------------------------------
    // SECTION 3: GUESTBOOK API INTEGRATION TESTS
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Guestbook API Integration Tests ---');

    const testVisitorId = `test-visitor-${Date.now()}`;

    await test('POST /api/guestbook rejects empty message (400)', async () => {
      const res = await fetch(`${BASE_URL}/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '   ', visitorId: testVisitorId })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'Review message is required. Babu cannot read blank parchment.');
    });

    await test('POST /api/guestbook rejects message shorter than 5 chars (400)', async () => {
      const res = await fetch(`${BASE_URL}/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hi', visitorId: testVisitorId })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('at least 5 characters'));
    });

    await test('POST /api/guestbook rejects overlong message > 500 chars (400)', async () => {
      const overlong = 'A'.repeat(501);
      const res = await fetch(`${BASE_URL}/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: overlong, visitorId: testVisitorId })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('500 character limit'));
    });

    await test('POST /api/guestbook successfully persists positive review', async () => {
      const reviewText = 'I respect the business hustle. Babu is a visionary CEO!';
      const res = await fetch(`${BASE_URL}/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reviewText, visitorId: testVisitorId })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.ok(data.messageId.startsWith('GB-'));
      assert.strictEqual(data.sentiment, 'positive');
      assert.strictEqual(data.status, 'RESOLVED BY BABU');
      assert.ok(data.babuResponse);
      assert.ok(data.createdAt);
      // Privacy check: NEVER leak visitorId back to client in response
      assert.strictEqual(data.visitorId, undefined);
    });

    await test('POST /api/guestbook successfully persists technical issue grievance', async () => {
      const issueText = 'The mobile cart button doesn\'t work and fails to open.';
      const res = await fetch(`${BASE_URL}/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: issueText, visitorId: `${testVisitorId}-issue` })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.sentiment, 'issue');
      assert.strictEqual(data.status, 'RESOLVED BY BABU');
      assert.ok(typeof data.babuResponse === 'string' && data.babuResponse.length > 0);
    });

    await test('GET /api/guestbook lists recent reviews and strips visitorId for privacy', async () => {
      const res = await fetch(`${BASE_URL}/guestbook`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.messages));
      assert.ok(data.messages.length > 0);

      // Verify privacy guarantee: No visitorId in any message
      for (const msg of data.messages) {
        assert.strictEqual(msg.visitorId, undefined, 'visitorId must be stripped from public feed');
        assert.ok(msg.message);
        assert.ok(msg.sentiment);
        assert.ok(msg.createdAt);
      }
    });

    await test('GET /api/guestbook/visitor-memory recognizes returning visitor without leaking other visitors', async () => {
      // 1. Valid visitor with past message
      const res = await fetch(`${BASE_URL}/guestbook/visitor-memory?visitorId=${encodeURIComponent(testVisitorId)}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.recognized, true);
      assert.strictEqual(data.sentiment, 'positive');
      assert.ok(data.greeting.headline);
      assert.ok(data.previousMessage.includes('business hustle'));
      // Confirm private visitorId is not echoed
      assert.strictEqual(data.visitorId, undefined);

      // 2. Unknown visitor (first time)
      const resUnknown = await fetch(`${BASE_URL}/guestbook/visitor-memory?visitorId=brand-new-visitor-xyz-123`);
      assert.strictEqual(resUnknown.status, 200);
      const dataUnknown = await resUnknown.json();
      assert.strictEqual(dataUnknown.recognized, false);
      assert.strictEqual(dataUnknown.previousMessage, undefined);
    });

    console.log(`\n🎉 All ${passed}/${total} Guestbook & Sentiment Tests Passed Successfully!`);
  } catch (err) {
    throw err;
  }
}

runGuestbookTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
