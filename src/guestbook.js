// ============================================================================
// GUESTBOOK & CUSTOMER REVIEWS LEDGER CONTROLLER
// - Manages review submission with character counter and duplicate prevention
// - Verifies server-side / Firestore persistence
// - Renders live guestbook feed with sentiment stamps and Babu's witty reactions
// - XSS-safe rendering of all user content
// ============================================================================

import { sound } from './audio.js';
import { submitGuestbookMessage, getGuestbookFeed } from './api.js';
import { getVisitorId } from './visitor-memory.js';
import { subscribeToGuestbook } from './firebase.js';

export function initGuestbook() {
  const form = document.getElementById('complaint-form');
  const input = document.getElementById('complaint-input');
  const submitBtn = document.getElementById('complaint-submit-btn');
  const responseBox = document.getElementById('complaint-response-box');
  const errorBox = document.getElementById('complaint-error-box');
  const charCounter = document.getElementById('complaint-char-counter');
  const feedList = document.getElementById('guestbook-feed-list');
  const feedEmptyState = document.getElementById('guestbook-feed-empty');
  const feedLoadingState = document.getElementById('guestbook-feed-loading');

  if (!form || !input || !submitBtn) return;

  // Track in-flight submission
  let isSubmitting = false;
  let currentMessages = [];

  // 1. Character counter
  input.addEventListener('input', () => {
    const len = input.value.length;
    if (charCounter) {
      charCounter.textContent = `${len}/500`;
      if (len > 500) {
        charCounter.classList.add('text-crayon-red', 'font-black');
      } else {
        charCounter.classList.remove('text-crayon-red', 'font-black');
      }
    }
  });

  // 2. Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const text = input.value.trim();

    if (!text) {
      showError('Please write your review or grievance before disturbing the CEO.');
      return;
    }

    if (text.length < 5) {
      showError('Message too brief. Babu needs at least 5 characters to understand.');
      return;
    }

    if (text.length > 500) {
      showError('Message exceeds 500 characters. Babu cannot read novels.');
      return;
    }

    // Clear previous feedback
    hideMessages();

    // Disable button & show loading state
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>⏳</span> <span>BABU IS PERSISTING TO REGISTRY...</span>';
    sound.playTick();

    try {
      const visitorId = getVisitorId();
      const result = await submitGuestbookMessage({
        message: text,
        visitorId: visitorId
      });

      sound.playStamp();

      // Display immediate verified confirmation
      if (responseBox) {
        const sentimentBadge = getSentimentBadge(result.sentiment);

        responseBox.innerHTML = `
          <div class="border-[3px] border-ink-black bg-lime-green/30 p-4 rounded-xl shadow-[3px_3px_0_#292521] rotate-[-1deg] animate-in fade-in select-none">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-1.5">
                <span class="font-label-stamp text-xs bg-lime-green text-ink-black border-2 border-ink-black px-2 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">
                  STATUS: ${escapeHtml(result.status || 'RESOLVED BY BABU')}
                </span>
                ${sentimentBadge}
              </div>
              <span class="font-mono text-xs text-on-surface-variant font-bold">${escapeHtml(result.messageId)}</span>
            </div>
            <p class="font-headline-sm text-sm text-ink-black font-bold">
              👏 Your message was verified and permanently logged in the Registry!
            </p>
            <p class="font-body-sm text-xs text-on-surface-variant mt-1.5 italic">
              Babu's Reaction: "${escapeHtml(result.babuResponse)}"
            </p>
          </div>
        `;
        responseBox.classList.remove('hidden');
      }

      // Reset form input
      input.value = '';
      if (charCounter) charCounter.textContent = '0/500';

      // Prepend newly submitted review to the live feed immediately
      prependReviewCard({
        id: result.messageId,
        message: result.message || text,
        sentiment: result.sentiment || 'neutral',
        babuResponse: result.babuResponse,
        status: result.status,
        createdAt: result.createdAt
      });

    } catch (err) {
      sound.playPop();
      showError(err.message || 'Failed to file grievance. Babu threw his bottle.');
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      submitBtn.innerHTML = originalText;
    }
  });

  // 3. Helper error/notice displays
  function showError(msg) {
    if (errorBox) {
      errorBox.innerHTML = `
        <div class="border-[2px] border-crayon-red bg-crayon-pink/20 p-3 rounded-lg text-ink-black text-xs font-bold flex items-center gap-2 select-none">
          <span>⚠️</span>
          <span>${escapeHtml(msg)}</span>
        </div>
      `;
      errorBox.classList.remove('hidden');
    }
  }

  function hideMessages() {
    if (errorBox) errorBox.classList.add('hidden');
    if (responseBox) responseBox.classList.add('hidden');
  }

  // 4. Sentiment Badge Formatter
  function getSentimentBadge(sentiment) {
    switch (sentiment) {
      case 'positive':
        return `<span class="font-label-stamp text-[10px] bg-sunshine-yellow text-ink-black border border-ink-black px-1.5 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">★ POSITIVE</span>`;
      case 'negative':
        return `<span class="font-label-stamp text-[10px] bg-crayon-pink text-ink-black border border-ink-black px-1.5 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">⚠️ CRITIQUE</span>`;
      case 'issue':
        return `<span class="font-label-stamp text-[10px] bg-crayon-red text-white border border-ink-black px-1.5 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">🛠️ TECH ISSUE</span>`;
      case 'neutral':
      default:
        return `<span class="font-label-stamp text-[10px] bg-marker-blue/80 text-ink-black border border-ink-black px-1.5 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">📋 OFFICIAL MEMO</span>`;
    }
  }

  // 5. Render list of guestbook messages
  function renderFeed(messages) {
    if (!feedList) return;
    if (feedLoadingState) feedLoadingState.classList.add('hidden');

    if (!messages || messages.length === 0) {
      if (feedEmptyState) feedEmptyState.classList.remove('hidden');
      feedList.innerHTML = '';
      return;
    }

    if (feedEmptyState) feedEmptyState.classList.add('hidden');
    currentMessages = messages;

    feedList.innerHTML = '';
    messages.forEach((msg, idx) => {
      const card = createCardElement(msg, idx);
      feedList.appendChild(card);
    });
  }

  function prependReviewCard(msg) {
    if (!feedList) return;
    if (feedEmptyState) feedEmptyState.classList.add('hidden');

    // Avoid duplicates if Firestore snapshot already pushed it
    if (currentMessages.some(m => m.id === msg.id)) {
      return;
    }

    currentMessages.unshift(msg);
    const card = createCardElement(msg, 0);
    card.classList.add('animate-in', 'fade-in', 'slide-in-from-top-2');
    feedList.insertBefore(card, feedList.firstChild);
  }

  function createCardElement(msg, idx) {
    const card = document.createElement('div');
    const rot = (idx % 2 === 0) ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]';
    card.className = `relative bg-paper-cream border-[3px] border-ink-black shadow-[4px_4px_0_#292521] p-4 rounded-xl transition-transform hover:scale-[1.01] duration-150 ${rot}`;

    const formattedDate = formatDate(msg.createdAt);
    const badge = getSentimentBadge(msg.sentiment);

    // Escape all user provided text to ensure 100% XSS safety
    const safeMessage = escapeHtml(msg.message);
    const safeResponse = escapeHtml(msg.babuResponse || 'Babu nodded and chewed a pacifier.');
    const safeStatus = escapeHtml(msg.status || 'RESOLVED BY BABU');

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 border-b-2 border-ink-black/20 pb-2 mb-2.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-label-stamp text-[11px] bg-lime-green text-ink-black border border-ink-black px-1.5 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">
            ${safeStatus}
          </span>
          ${badge}
        </div>
        <span class="font-body-sm text-[11px] text-on-surface-variant font-bold">${formattedDate}</span>
      </div>

      <p class="font-body-md text-sm text-ink-black leading-relaxed font-semibold break-words">
        "${safeMessage}"
      </p>

      <div class="mt-3 pt-2 border-t border-dashed border-ink-black/20 flex items-start gap-1.5">
        <span class="text-xs">🍼</span>
        <p class="font-body-sm text-xs text-on-surface-variant italic">
          <span class="font-bold text-ink-black">Babu:</span> "${safeResponse}"
        </p>
      </div>
    `;

    return card;
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'Just now';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Recently';
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 6. Initial fetch and live realtime subscription
  async function loadInitialFeed() {
    try {
      const messages = await getGuestbookFeed(20);
      renderFeed(messages);
    } catch (err) {
      console.warn('Initial feed fetch warning:', err.message);
      if (feedLoadingState) feedLoadingState.classList.add('hidden');
      if (feedEmptyState) feedEmptyState.classList.remove('hidden');
    }
  }

  loadInitialFeed();

  // Attach live Firestore listener for real-time synchronization
  const unsubscribe = subscribeToGuestbook((liveMessages) => {
    if (liveMessages && liveMessages.length > 0) {
      renderFeed(liveMessages);
    }
  }, 20);

  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}
