# Firebase Cloud Firestore & Backend Setup Guide — THIS SUCKS.™
## Visitor Odometer, Live Interactive Guestbook & Returning-Visitor Memory

**Project:** THIS SUCKS.™ (*Small mouth. BIG business.*)  
**Database:** Cloud Firestore (`baby-46ada`)  
**Backend:** Node.js Express API (`server/`) and Cloud Functions (`functions/`)

---

## 1. Architecture Overview & Reused Configuration

This project connects two persistent features to Firebase Cloud Firestore without duplicating apps or breaking existing features:

1. **Visitor Odometer (`siteStats/visitorCounter`)**: Realtime persistent visitor count incremented atomically and rendered on the 6-wheel mechanical odometer in the hero header.
2. **Interactive Guestbook (`guestbook/{messageId}`)**: Persistent visitor reviews and complaints desk. Computes lightweight server-side sentiment, generates Babu's character reactions, safely archives messages with server timestamps, and remembers returning browsers.

The frontend initializes Firebase via `src/firebase.js` using the web client SDK for real-time document streams (`onSnapshot`), while all untrusted writes, validation, and sentiment analysis occur strictly through the backend via the Firebase Admin SDK.

---

## 2. Firestore Collections & Document Schemas

### A. Visitor Counter Document
- **Path**: `siteStats/visitorCounter`
- **Schema**:
```json
{
  "count": 1337,
  "updatedAt": "2026-10-18T14:30:00.000Z"
}
```

### B. Guestbook Messages Collection
- **Path**: `guestbook/{messageId}`
- **Document ID Format**: `GB-{timestamp36}-{randomSuffix}` (e.g. `GB-MG4B91Z-X8K2Q`)
- **Schema**:
```json
{
  "message": "I respect the business hustle. Babu is a visionary CEO!",
  "visitorId": "anon-m8q9p2-k3j4l5m",
  "sentiment": "positive",
  "babuResponse": "GOO GOO GA GA! YOU GET IT! YOU HAVE EXECUTIVE TASTE.",
  "status": "RESOLVED BY BABU",
  "createdAt": "server timestamp"
}
```

### C. Pacifier Orders Collection
- **Path**: `orders/{orderId}`
- **Document ID Format**: `ORD-{timestamp36}-{randomSuffix}` (e.g. `ORD-MG5ABC-XYZ12`)
- **Schema**:
```json
{
  "orderId": "ORD-MG5ABC-XYZ12",
  "product": "Pacifier my aunt gifted",
  "status": "AWAITING_CEO_APPROVAL",
  "createdAt": "server timestamp",
  "createdAtIso": "2026-10-18T16:00:00.000Z",
  "confirmation": {
    "headline": "ORDER PLACED!",
    "message": "Delivery after sucked and approved by CEO."
  }
}
```

---

## 3. Backend Endpoints & Cloud Functions

The backend exposes the following endpoints (available via Express on port 3001, Vercel Serverless Functions in `api/`, or Cloud Functions via Firebase rewrites):

| Method | Endpoint | Description | Validation / Safeguards |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Places a persistent order for one of the 3 approved pacifier products. | Validates against `APPROVED_PRODUCTS`. Resilient fallback to direct Firestore on static Vercel hosts. |
| `GET` | `/api/visitors` | Retrieves the current verified visitor count. | Returns `{ count: number }`. |
| `POST` | `/api/visitors/hit` | Atomically increments the visitor counter by 1. | Rate-limited, atomic `FieldValue.increment(1)`. |
| `POST` | `/api/guestbook` | Validates, classifies, and persists a new review/grievance. | Enforces 5–500 chars, server-side sentiment analysis, sanitized HTML escaping. |
| `GET` | `/api/guestbook` | Returns the latest 20 public guestbook entries. | Strips `visitorId` to preserve privacy. Ordered by `createdAt DESC`. |
| `GET` | `/api/guestbook/visitor-memory` | Looks up prior visit sentiment and message for a visitor ID. | Accepts `?visitorId=...`. Returns excerpt and greeting without enumerating other entries. |

---

## 4. Lightweight Sentiment Detection (Option C)

Sentiment is computed server-side in `server/sentiment.js` before persistence:
- **Positive**: Recognizes praises and affirmations (`"love"`, `"great"`, `"genius"`).
- **Negative**: Recognizes complaints and critiques (`"terrible"`, `"awful"`, `"bad"`).
- **Technical Issue**: Recognizes bugs and broken features (`"doesn't work"`, `"broken on mobile"`, `"crashed"`).
- **Neutral / Ambiguous**: Fallback for mild, factual, or mixed reviews.
- **Negation Handling**: Inspects 1–2 words prior to sentiment tokens (e.g. `"not bad"` -> positive; `"not good"` -> negative).
- **Brand Protection**: The brand name phrase `"THIS SUCKS.™"` is guarded from false negative classification when used as the brand title.

---

## 5. Returning-Visitor Memory Architecture

1. **First Visit**: An anonymous ID (`paci_visitor_id`) is created and saved in `localStorage`.
2. **Submission**: When the visitor submits a message, the server associates the message with their anonymous ID.
3. **Return Visit**:
   - On page load, `initVisitorMemory()` calls `GET /api/guestbook/visitor-memory?visitorId=...`.
   - If a previous message is found, Babu's hero speech bubble displays a contextual greeting (`"YOU'RE BACK! I REMEMBER YOU!"`).
   - A sticky note memo banner appears above the Guestbook desk with their past sentiment badge and message snippet.
   - Session storage (`paci_greeted`) gates the greeting to trigger exactly once per session, preventing annoying repetitive loops on re-renders.
4. **Limitations**: Memory is browser-bound (`localStorage`). Clearing site data or opening an incognito window resets the visitor to first-time status. No invasive device tracking, fingerprints, or accounts are used.

---

## 6. Firestore Security Rules

Deploy the included `firestore.rules` to Cloud Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Visitor Odometer: Public read, all writes must go through server
    match /siteStats/{docId} {
      allow read: if true;
      allow write: if false;
    }

    // 2. Guestbook Messages: Public read for real-time feed, writes via backend Admin SDK
    match /guestbook/{messageId} {
      allow read: if true;
      allow write: if false;
    }

    // 3. Orders Collection: Direct client creation allowed for approved products
    match /orders/{orderId} {
      allow create: if request.resource.data.product in [
        "Pacifier my aunt gifted",
        "Found at Suzie’s house",
        "It just spawned on my bedroom"
      ];
      allow read, update, delete: if false;
    }

    // 4. Deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 7. Environment Variables & Credentials

Create or configure `.env` in the project root:

```env
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Firebase Admin SDK Credentials (Optional for local dev, used in production)
# Option A: Local service account file path
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json

# Option B: Individual environment variables
# FIREBASE_PROJECT_ID=baby-46ada
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@baby-46ada.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> 💡 **Resilient Local Fallback**: When `serviceAccountKey.json` is not provided, the backend seamlessly mirrors persistence into SQLite (`./data/paci_boss.db`). Development and testing will never crash even when working offline.

---

## 8. Deployment Instructions

### Deploy Cloud Functions & Firestore Rules:
```bash
firebase deploy --only firestore:rules,functions
```

### Run Locally (Concurrently Frontend + Backend):
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

---

## 9. Verification & Automated Testing

Run the full automated test suite:
```bash
# Test guestbook validation, sentiment engine, and visitor memory
node test/guestbook.test.js

# Test overall backend API suite
node test/api.test.js
```
Both suites run with zero external mock dependencies and test all edge cases.
