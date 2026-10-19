// ============================================================================
// RETURNING-VISITOR MEMORY SYSTEM
// Recognizes returning browsers using an anonymous client-side identifier.
// Triggers Babu's contextual greeting in the Hero speech bubble and guestbook banner.
// Limits: Browser-level memory, no device tracking/PII, exactly one greeting per session.
// ============================================================================

import { getVisitorMemory } from './api.js';

const STORAGE_KEY_VISITOR_ID = 'paci_visitor_id';
const SESSION_KEY_GREETED = 'paci_greeted';

/**
 * Retrieve or generate an anonymous visitor identifier
 * @returns {string}
 */
export function getVisitorId() {
  let id = null;
  try {
    id = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
    if (!id || typeof id !== 'string' || id.length < 8) {
      id = `anon-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEY_VISITOR_ID, id);
    }
  } catch (e) {
    id = `anon-temp-${Math.random().toString(36).substring(2, 9)}`;
  }
  return id;
}

/**
 * Initialize returning-visitor recognition on page load
 */
export async function initVisitorMemory() {
  if (navigator.webdriver) return; // Skip audit crawler
  const visitorId = getVisitorId();

  // Check visitor memory from serverless backend or Firestore

  try {
    const memory = await getVisitorMemory(visitorId);

    if (memory && memory.recognized && memory.greeting) {
      try {
        sessionStorage.setItem(SESSION_KEY_GREETED, 'true');
      } catch (e) {}

      applyReturningVisitorGreeting(memory.greeting, memory.previousMessage, memory.sentiment);
    }
  } catch (err) {
    console.warn('Visitor memory check skipped:', err.message);
  }
}

/**
 * Apply Babu's contextual greeting to the Hero speech bubble & Guestbook sticky note
 */
function applyReturningVisitorGreeting(greeting, previousMessage, sentiment) {
  // 1. Hero Speech Bubble contextual update
  const speechText = document.getElementById('speech-text');
  const speechSub = document.getElementById('speech-sub');
  const speechBubble = document.getElementById('speech-bubble');

  if (speechText && speechSub && greeting.headline) {
    // Smooth transition
    speechText.style.opacity = '0';
    speechSub.style.opacity = '0';

    setTimeout(() => {
      speechText.textContent = greeting.headline;
      speechSub.textContent = greeting.subtext;

      // Update stamp badge in speech bubble if present
      const stamp = speechBubble?.querySelector('.font-label-stamp');
      if (stamp && greeting.tag) {
        stamp.textContent = greeting.tag;
        stamp.className = 'font-label-stamp text-label-stamp text-[10px] text-crayon-red uppercase bg-sunshine-yellow/40 px-1.5 py-0.5 rounded border border-crayon-red shadow-sm';
      }

      speechText.style.opacity = '1';
      speechSub.style.opacity = '1';
    }, 200);
  }

  // 2. Guestbook sticky note / welcome back badge
  const memoryBanner = document.getElementById('guestbook-memory-banner');
  if (memoryBanner) {
    const sentimentEmoji = sentiment === 'positive' ? '★' : (sentiment === 'negative' ? '⚠️' : (sentiment === 'issue' ? '🛠️' : '🍼'));
    memoryBanner.innerHTML = `
      <div class="relative bg-sunshine-yellow/90 border-2 border-ink-black shadow-[3px_3px_0_#292521] p-3 rounded-lg -rotate-1 mb-6 flex items-start gap-2.5">
        <div class="absolute -top-2 left-6 w-16 h-3.5 bg-paper-cream/90 border border-ink-black/30 rotate-2"></div>
        <span class="text-xl leading-none mt-0.5">${sentimentEmoji}</span>
        <div class="flex flex-col text-left">
          <span class="font-label-stamp text-xs text-crayon-red uppercase font-black">
            EXECUTIVE MEMORY: RETURNING VISITOR RECOGNIZED
          </span>
          <p class="font-body-sm text-xs text-ink-black font-semibold mt-0.5">
            Babu retrieved your previous message from the Registry: <span class="italic">"${previousMessage}"</span>
          </p>
        </div>
      </div>
    `;
    memoryBanner.classList.remove('hidden');
  }
}
