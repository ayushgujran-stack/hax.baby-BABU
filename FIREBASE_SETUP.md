# Firebase Cloud Firestore Setup Guide — THIS SUCKS.™
## Visitor Odometer Backend Architecture & Deployment

> **Scope Restriction**: Per project requirements, the Visitor Odometer (`#odometer-container`) is the **ONLY** feature connected to Firebase Cloud Firestore. Products, complaints, the origin story, the Secret Vinyl Room Easter egg, and the Pacifier Chase interaction run purely on the frontend.

---

## 1. Create or Select a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"** (or select an existing project).
3. Name your project (e.g. `this-sucks-paci-boss` or `hax-baby-babu`).
4. You may enable or disable Google Analytics (it is not needed for the visitor counter).
5. Click **"Create project"** and wait for it to provision.

---

## 2. Enable Cloud Firestore

1. In the left-hand navigation of the Firebase Console, go to **Build** → **Firestore Database**.
2. Click **"Create database"**.
3. Choose a location closest to your audience (e.g., `nam5 (us-central)` or `asia-south1`).
4. In the security rules step, choose **"Start in production mode"**. (We will apply custom locked-down security rules in Step 6).
5. Click **"Enable"**.

---

## 3. Configure Environment Variables

The server accesses Firestore using the official **Firebase Admin SDK** to guarantee safe atomic increments and protect your credentials from public exposure.

### Step 3.1: Generate a Service Account Private Key
1. In the Firebase Console, click the **Gear icon (Project settings)** in the top left.
2. Select the **"Service accounts"** tab.
3. Under **Firebase Admin SDK**, ensure **Node.js** is selected.
4. Click **"Generate new private key"**, then confirm **"Generate key"**.
5. Save the downloaded `.json` file securely (e.g., as `serviceAccountKey.json` in your local project root).
   > ⚠️ **Security Warning**: `serviceAccountKey.json` and `.env` are listed in `.gitignore` and must **NEVER** be committed to GitHub.

### Step 3.2: Configure `.env`
You can provide the credentials in one of two ways:

#### Option A: Reference the local JSON key file path (Recommended for local dev)
In `/Users/ayushrajeshpoojary/PROJECTS/Hax baby/.env`:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
```

#### Option B: Set individual environment variables (Recommended for production/Vercel/Render)
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

*Note: If no Firebase credentials are provided in `.env`, the server automatically operates in a resilient local fallback mode using SQLite so development and tests never crash.*

---

## 4. Firestore Document Structure

The database maintains a single minimal document for aggregate visits:

- **Collection**: `siteStats`
- **Document ID**: `visitorCounter`

### Document Schema
```json
{
  "count": 1337,
  "updatedAt": "2026-10-18T13:00:00.000Z"
}
```

### Initializing the Document
The backend code automatically initializes this document with `{ count: 1337, updatedAt: FieldValue.serverTimestamp() }` on the very first read if it does not yet exist.

To manually initialize it via Firebase Console:
1. Navigate to **Firestore Database** → **Start collection**.
2. Collection ID: `siteStats` → Next.
3. Document ID: `visitorCounter`.
4. Add fields:
   - `count` (number): `1337`
   - `updatedAt` (timestamp): current time
5. Click **Save**.

---

## 5. Deploying the Backend Endpoint

You can deploy the visitor counter backend using either of two architectures:

### Architecture 1: Node.js Express Server (Existing Setup)
Run the project's existing server:
```bash
npm run server
```
The server routes:
- `GET /api/visitors`: Fetches the current persistent count from Firestore.
- `POST /api/visitors/hit`: Atomically increments the count using `FieldValue.increment(1)` and returns the updated count.

### Architecture 2: Firebase Cloud Functions (Serverless Setup)
A pre-configured Cloud Function is provided in `functions/index.js` and `firebase.json`:
1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and select your project:
   ```bash
   firebase login
   firebase use your-project-id
   ```
3. Deploy functions and rules:
   ```bash
   firebase deploy --only functions,firestore:rules
   ```
4. Cloud Functions will expose the endpoint at:
   `https://<region>-<project-id>.cloudfunctions.net/visitors`

---

## 6. Firestore Security Rules

To ensure public visitors cannot arbitrarily overwrite or falsify the aggregate count, the security rules in [`firestore.rules`](file:///Users/ayushrajeshpoojary/PROJECTS/Hax%20baby/firestore.rules) allow **read-only** access to the public while strictly restricting writes to the server:

```cel
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Aggregate Visitor Counter Document: Publicly readable, server-only writable
    match /siteStats/visitorCounter {
      allow read: if true;
      allow write: if false; // Mutated ONLY by secure server-side endpoint / Cloud Functions via Admin SDK
    }

    // Default deny for all other collections and documents
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
Or paste the contents into **Firebase Console** → **Firestore Database** → **Rules** → **Publish**.

---

## 7. Connecting the Existing Frontend

The frontend module [`src/odometer.js`](file:///Users/ayushrajeshpoojary/PROJECTS/Hax%20baby/src/odometer.js) is already wired into the application lifecycle:

1. **Session Deduplication**: Checks `sessionStorage.getItem('paci_boss_visit_session_active')`.
   - If **new session**: Triggers `POST /api/visitors/hit` to atomically increment the counter, then sets the session flag.
   - If **existing session**: Triggers `GET /api/visitors` to retrieve the current count without re-incrementing on refresh.
2. **Smooth Rolling Digit Animation**: Dynamically constructs rolling drum windows that roll each digit smoothly into position with authentic mechanical stagger and sound tick.
3. **Resilience & Fallback**: Caches the last known count in `localStorage` so the counter never flashes `NaN`, `undefined`, or empty space during network latency or offline states.

---

## 8. How to Test the Counter

1. **Local Test Suite**:
   Run the backend integration test:
   ```bash
   npm run test
   ```
   Verifies:
   - `GET /api/visitors` returns 200 with integer count.
   - `POST /api/visitors/hit` atomically increments count.
   - Rate limiting and session integrity.

2. **Browser Validation**:
   - Start the development servers: `npm run dev`.
   - Open `http://localhost:3000/`.
   - Scroll to `#odometer-container` ("HEADQUARTERS LIVE ODOMETER").
   - Observe the digits rolling into place.
   - Refresh the page: Observe that the count does **not** double-increment in the same session.
   - Open a private/incognito window to `http://localhost:3000/`: Observe that a new session is recorded and the counter increments by 1.

---

## 9. Billing, Limits & Free-Tier Considerations

- **Firebase Spark Plan (Free Tier)**:
  - Firestore allows **50,000 document reads/day** and **20,000 document writes/day**.
  - Since the odometer uses session deduplication and a single document, a website receiving thousands of visits per day stays well within the 100% free Spark plan.
- **Cloud Functions**:
  - Cloud Functions (v2) requires the **Blaze (Pay as you go)** plan, but includes a generous free tier (2 million invocations/month).
  - If you prefer to stay on the 100% free Spark plan, use **Architecture 1** (Node.js Express server) with the Firestore Admin SDK.
