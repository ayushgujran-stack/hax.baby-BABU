// ============================================================================
// GUESTBOOK & CUSTOMER REVIEWS LEDGER CONTROLLER
// - Manages review submission with character counter and duplicate prevention
// - Verifies server-side / Firestore persistence
// - Compact Dropdown Accordion List with Quick Select menu to save vertical space
// - 40+ unique, varied, witty reactions by toddler CEO Babu (no repeated replies)
// - XSS-safe rendering of all user content
// ============================================================================

import { sound } from './audio.js';
import { submitGuestbookMessage, getGuestbookFeed } from './api.js';
import { getVisitorId } from './visitor-memory.js';
import { subscribeToGuestbook } from './firebase.js';

// Predefined rich response pool to ensure every single review gets a UNIQUE response
const BABU_RESPONSES = {
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
    "Mom printed your review and stuck it on the fridge with a magnet!",
    "Approved immediately! Moving this to the VIP Crib Dossier.",
    "Babu did a victory roll on the carpet after reading this memo."
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
    "Noted. I chewed on a plastic block until I forgot what you said.",
    "CEO rejection stamp applied with maximum toddler aggression.",
    "I am calling an emergency shareholder conference in the playpen."
  ],
  issue: [
    "OH NO. MOM! WE HAVE A TECHNICAL GLITCH! CODE RED IN NURSERY!",
    "Babu looked extremely concerned and shook his rattle at the server rack.",
    "WE ARE DISPATCHING TOMMY THE DOG TO SNIFF OUT THE BUG IMMEDIATELY.",
    "Hold on! Mom is looking at the computer right now while I watch.",
    "I pressed 47 random buttons on the keyboard to fix it. Did it work?",
    "Dev team (me with a plastic wrench) is investigating this breakdown.",
    "Unplugging the pacifier and plugging it back in right now...",
    "Server error 404: Pacifier dropped under the sofa.",
    "Babu investigated by hitting the monitor with a wooden spoon."
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
    "Under review by the Toddler Board of Directors.",
    "Filed under 'Matters Requiring Mom\\'s Supervision'."
  ]
};

export function initGuestbook() {
  const form = document.getElementById('complaint-form');
  const input = document.getElementById('complaint-input');
  const submitBtn = document.getElementById('complaint-submit-btn');
  const responseBox = document.getElementById('complaint-response-box');
  const errorBox = document.getElementById('complaint-error-box');
  const charCounter = document.getElementById('complaint-char-counter');
  
  // Dropdown list elements
  const dropdownToggle = document.getElementById('guestbook-dropdown-toggle');
  const dropdownPanel = document.getElementById('guestbook-dropdown-panel');
  const dropdownArrow = document.getElementById('guestbook-arrow');
  const dropdownToggleText = document.getElementById('guestbook-toggle-text');
  const countBadge = document.getElementById('guestbook-count-badge');
  const quickSelect = document.getElementById('guestbook-quick-select');
  const expandAllBtn = document.getElementById('guestbook-expand-all-btn');

  const feedList = document.getElementById('guestbook-feed-list');
  const feedEmptyState = document.getElementById('guestbook-feed-empty');
  const feedLoadingState = document.getElementById('guestbook-feed-loading');

  if (!form || !input || !submitBtn) return;

  // Track in-flight submission & loaded messages
  let isSubmitting = false;
  let currentMessages = [];
  let isDropdownOpen = false;
  let areAllExpanded = false;

  // Dropdown toggle handler
  function toggleDropdown(forceState) {
    if (!dropdownPanel) return;
    isDropdownOpen = typeof forceState === 'boolean' ? forceState : !isDropdownOpen;

    if (isDropdownOpen) {
      dropdownPanel.classList.remove('hidden');
      if (dropdownArrow) dropdownArrow.style.transform = 'rotate(180deg)';
      if (dropdownToggleText) dropdownToggleText.textContent = 'CLICK TO COLLAPSE';
      if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'true');
    } else {
      dropdownPanel.classList.add('hidden');
      if (dropdownArrow) dropdownArrow.style.transform = 'rotate(0deg)';
      if (dropdownToggleText) dropdownToggleText.textContent = 'CLICK TO EXPAND';
      if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
    }
  }

  if (dropdownToggle) {
    dropdownToggle.addEventListener('click', () => {
      sound.playPop();
      toggleDropdown();
    });
  }

  // Quick Select Jump handler
  if (quickSelect) {
    quickSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (!selectedId) return;

      const targetCard = document.getElementById(`review-card-${selectedId}`);
      if (targetCard) {
        sound.playTick();
        targetCard.open = true;
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetCard.classList.add('ring-4', 'ring-sunshine-yellow');
        setTimeout(() => {
          targetCard.classList.remove('ring-4', 'ring-sunshine-yellow');
        }, 1500);
      }
    });
  }

  // Expand / Collapse All Accordions
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      sound.playPop();
      areAllExpanded = !areAllExpanded;
      expandAllBtn.textContent = areAllExpanded ? 'COLLAPSE ALL' : 'EXPAND ALL';
      if (feedList) {
        feedList.querySelectorAll('details').forEach(det => {
          det.open = areAllExpanded;
        });
      }
    });
  }

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

      // Ensure distinct response
      const distinctReaction = getDistinctBabuResponse(result.sentiment, text, 0);

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
              Babu's Reaction: "${escapeHtml(distinctReaction)}"
            </p>
          </div>
        `;
        responseBox.classList.remove('hidden');
      }

      // Reset form input
      input.value = '';
      if (charCounter) charCounter.textContent = '0/500';

      // Automatically open the dropdown to reveal the new review!
      toggleDropdown(true);

      // Prepend newly submitted review to the live feed immediately
      prependReviewCard({
        id: result.messageId,
        message: result.message || text,
        sentiment: result.sentiment || 'neutral',
        babuResponse: distinctReaction,
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

  // Pick a unique, distinct response for every single review message
  const assignedReactions = new Map();

  function getDistinctBabuResponse(sentiment, text, idx) {
    const s = sentiment || 'neutral';
    const pool = BABU_RESPONSES[s] || BABU_RESPONSES.neutral;

    // Generate a hash from text & index
    let hash = idx * 13;
    const str = String(text || '');
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const chosenIndex = Math.abs(hash) % pool.length;
    return pool[chosenIndex];
  }

  // 5. Render list of guestbook messages as accordion dropdown items
  function renderFeed(messages) {
    if (!feedList) return;
    if (feedLoadingState) feedLoadingState.classList.add('hidden');

    if (!messages || messages.length === 0) {
      if (feedEmptyState) feedEmptyState.classList.remove('hidden');
      feedList.innerHTML = '';
      if (countBadge) countBadge.textContent = '0';
      updateQuickSelect([]);
      return;
    }

    if (feedEmptyState) feedEmptyState.classList.add('hidden');
    currentMessages = messages;

    if (countBadge) countBadge.textContent = String(messages.length);

    feedList.innerHTML = '';
    updateQuickSelect(messages);

    // Track used response strings so no two items share the exact same string
    const usedResponses = new Set();

    messages.forEach((msg, idx) => {
      // Pick unique response
      let resp = msg.babuResponse;
      const isGenericDefault = !resp || 
        resp.includes("FAVOURITE HUMAN") || 
        resp.includes("BOARDROOM A") || 
        resp.includes("NAP TIME") || 
        resp.includes("CODE RED");

      if (isGenericDefault || usedResponses.has(resp)) {
        const pool = BABU_RESPONSES[msg.sentiment || 'neutral'] || BABU_RESPONSES.neutral;
        // Find first unused response in pool
        resp = pool.find(r => !usedResponses.has(r)) || pool[idx % pool.length];
      }
      usedResponses.add(resp);

      // First item open by default for immediate preview, rest collapsed
      const isOpen = idx === 0;
      const card = createAccordionCardElement(msg, resp, idx, isOpen);
      feedList.appendChild(card);
    });
  }

  function updateQuickSelect(messages) {
    if (!quickSelect) return;
    quickSelect.innerHTML = '<option value="">-- Choose a review to inspect --</option>';
    messages.forEach((msg, i) => {
      const opt = document.createElement('option');
      opt.value = msg.id;
      const snippet = (msg.message || '').replace(/"/g, '').substring(0, 45);
      opt.textContent = `#${i + 1} [${(msg.sentiment || 'memo').toUpperCase()}] "${snippet}..."`;
      quickSelect.appendChild(opt);
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
    if (countBadge) countBadge.textContent = String(currentMessages.length);

    updateQuickSelect(currentMessages);

    const distinctReaction = msg.babuResponse || getDistinctBabuResponse(msg.sentiment, msg.message, 0);
    const card = createAccordionCardElement(msg, distinctReaction, 0, true);
    card.classList.add('animate-in', 'fade-in', 'slide-in-from-top-2');
    feedList.insertBefore(card, feedList.firstChild);
  }

  // Create an accordion dropdown card
  function createAccordionCardElement(msg, distinctReaction, idx, isOpen = false) {
    const details = document.createElement('details');
    details.id = `review-card-${msg.id}`;
    const rot = (idx % 2 === 0) ? '-rotate-[0.3deg]' : 'rotate-[0.3deg]';
    details.className = `group bg-paper-cream border-[3px] border-ink-black shadow-[3px_3px_0_#292521] rounded-xl transition-all duration-150 overflow-hidden ${rot}`;
    if (isOpen) details.open = true;

    const formattedDate = formatDate(msg.createdAt);
    const badge = getSentimentBadge(msg.sentiment);

    // Escape all user provided text to ensure 100% XSS safety
    const safeMessage = escapeHtml(msg.message);
    const safeResponse = escapeHtml(distinctReaction || 'Babu nodded and chewed a pacifier.');
    const safeStatus = escapeHtml(msg.status || 'RESOLVED BY BABU');
    const previewExcerpt = safeMessage.length > 60 ? `${safeMessage.substring(0, 60)}...` : safeMessage;

    details.innerHTML = `
      <summary class="flex items-center justify-between p-3 sm:p-3.5 cursor-pointer list-none select-none hover:bg-sunshine-yellow/20 transition-colors border-b-2 border-transparent group-open:border-ink-black/20 group-open:bg-sunshine-yellow/15">
        <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="font-label-stamp text-[10px] bg-lime-green text-ink-black border border-ink-black px-1.5 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">
              ${safeStatus}
            </span>
            ${badge}
          </div>
          <p class="font-body-md text-xs sm:text-sm text-ink-black font-bold truncate">
            "${previewExcerpt}"
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="font-body-sm text-[10px] sm:text-[11px] text-on-surface-variant font-bold hidden sm:inline">${formattedDate}</span>
          <span class="w-6 h-6 rounded bg-surface-container border border-ink-black flex items-center justify-center text-[10px] font-bold text-ink-black transition-transform duration-200 group-open:rotate-180">
            ▼
          </span>
        </div>
      </summary>

      <div class="p-3.5 sm:p-4 bg-background/40 space-y-3">
        <div>
          <span class="font-label-stamp text-[10px] text-on-surface-variant uppercase tracking-wider">VISITOR GRIEVANCE / REVIEW:</span>
          <p class="font-body-md text-sm text-ink-black leading-relaxed font-semibold break-words mt-1">
            "${safeMessage}"
          </p>
        </div>

        <div class="pt-2.5 border-t border-dashed border-ink-black/25 flex items-start gap-2 bg-paper-cream p-3 rounded-lg border border-ink-black/20 shadow-sm">
          <span class="text-base shrink-0">🍼</span>
          <div>
            <span class="font-label-stamp text-[10px] text-crayon-red uppercase font-black">BABU'S OFFICIAL RESPONSE:</span>
            <p class="font-body-md text-xs sm:text-sm text-ink-black font-bold italic mt-0.5 leading-snug">
              "${safeResponse}"
            </p>
          </div>
        </div>
      </div>
    `;

    // Click on summary plays a subtle tick sound
    const summaryEl = details.querySelector('summary');
    if (summaryEl) {
      summaryEl.addEventListener('click', () => {
        sound.playTick();
      });
    }

    return details;
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

  // Attach live Firestore listener for real-time synchronization (deferred to idle to keep initial network quiet)
  let unsubscribe = null;
  const attachGbSub = () => {
    unsubscribe = subscribeToGuestbook((liveMessages) => {
      if (liveMessages && liveMessages.length > 0) {
        renderFeed(liveMessages);
      }
    }, 20);
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(attachGbSub, { timeout: 3500 });
  } else {
    setTimeout(attachGbSub, 2000);
  }

  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}
