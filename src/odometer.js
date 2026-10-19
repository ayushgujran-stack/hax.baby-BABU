// THIS SUCKS.™ — Mechanical Odometer Visitor Counter
// Connects to Firebase Cloud Firestore via secure server-side endpoint with atomic increment
// Features smooth rolling digit animation, session deduplication, and error resilience

import { sound } from './audio.js';
import { getVisitorCount, recordVisitorHit } from './api.js';
import { subscribeToVisitorCounter } from './firebase.js';

const STORAGE_SESSION_KEY = 'paci_boss_visit_session_active';
const STORAGE_CACHE_KEY = 'paci_boss_last_visitor_count';
const DEFAULT_BASELINE_COUNT = 1337;

export async function initOdometer() {
  const container = document.getElementById('odometer-container');
  if (!container) return;

  // Retrieve cached count from localStorage to avoid visual flicker if available
  const cachedCountRaw = localStorage.getItem(STORAGE_CACHE_KEY);
  let displayedCount = cachedCountRaw && !isNaN(parseInt(cachedCountRaw, 10))
    ? parseInt(cachedCountRaw, 10)
    : DEFAULT_BASELINE_COUNT;

  // Build the mechanical odometer drum structure
  function buildOdometerStructure() {
    container.innerHTML = '';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-label', `Visitor counter: ${displayedCount}`);

    const formatted = String(displayedCount).padStart(6, '0');
    const fullStr = `${formatted.slice(0, 3)},${formatted.slice(3)}`;

    for (let i = 0; i < fullStr.length; i++) {
      const char = fullStr[i];
      if (char === ',') {
        const commaSpan = document.createElement('span');
        commaSpan.className = 'font-headline-md text-headline-md text-sunshine-yellow bg-ink-black px-1 py-0.5 rounded font-mono inline-flex items-center justify-center select-none';
        commaSpan.textContent = ',';
        container.appendChild(commaSpan);
      } else {
        // Rolling drum window
        const drumWindow = document.createElement('div');
        drumWindow.className = 'odometer-digit-window relative overflow-hidden bg-ink-black border border-sunshine-yellow/30 rounded font-mono inline-block text-center select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] w-6 sm:w-7 h-8 sm:h-9';
        drumWindow.dataset.digitIndex = i;

        // Strip containing digits 0-9
        const strip = document.createElement('div');
        strip.className = 'odometer-digit-strip flex flex-col transition-transform duration-700 ease-out will-change-transform';
        for (let d = 0; d <= 9; d++) {
          const numSpan = document.createElement('span');
          numSpan.className = 'h-8 sm:h-9 flex items-center justify-center font-headline-md text-headline-md text-sunshine-yellow';
          numSpan.textContent = d;
          strip.appendChild(numSpan);
        }

        const digitVal = parseInt(char, 10) || 0;
        strip.style.transform = `translateY(-${digitVal * 10}%)`;
        drumWindow.appendChild(strip);
        container.appendChild(drumWindow);
      }
    }

    // Label Stamp Badge
    const badge = document.createElement('span');
    badge.className = 'font-label-stamp text-label-stamp text-xs text-on-primary bg-crayon-red px-2 py-1 ml-1 rounded select-none cursor-pointer hover:bg-crayon-pink active:scale-95 transition-all';
    badge.textContent = 'VISITORS LOGGED';
    badge.title = 'Persistent database-backed visitor count';
    container.appendChild(badge);
  }

  // Animate the drums to a new target count
  function animateToCount(newCount) {
    if (typeof newCount !== 'number' || isNaN(newCount)) return;

    displayedCount = newCount;
    localStorage.setItem(STORAGE_CACHE_KEY, String(newCount));
    container.setAttribute('aria-label', `Visitor counter: ${displayedCount}`);

    const formatted = String(newCount).padStart(6, '0');
    const fullStr = `${formatted.slice(0, 3)},${formatted.slice(3)}`;

    const windows = container.querySelectorAll('.odometer-digit-window');
    let windowIdx = 0;

    for (let i = 0; i < fullStr.length; i++) {
      const char = fullStr[i];
      if (char !== ',') {
        const drumWindow = windows[windowIdx];
        if (drumWindow) {
          const strip = drumWindow.querySelector('.odometer-digit-strip');
          const targetDigit = parseInt(char, 10) || 0;
          if (strip) {
            // Stagger each wheel slightly for realistic mechanical odometer feel
            strip.style.transitionDelay = `${windowIdx * 0.04}s`;
            strip.style.transform = `translateY(-${targetDigit * 10}%)`;
          }
        }
        windowIdx++;
      }
    }

    try {
      sound.playTick();
    } catch {
      // Audio tick is optional enhancement
    }
  }

  // 1. Initial build with cached/baseline count
  buildOdometerStructure();

  // 2. Defer visitor hit/read to idle callback so Lighthouse and initial paint are zero-cost
  const syncCount = async () => {
    try {
      // Skip heavy writes if headless/bot user agent
      if (navigator.webdriver) return;

      const isSessionCounted = sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (!isSessionCounted) {
        const result = await recordVisitorHit();
        if (typeof result === 'number' && !isNaN(result)) {
          sessionStorage.setItem(STORAGE_SESSION_KEY, 'true');
          animateToCount(result);
        }
      } else {
        const result = await getVisitorCount();
        if (typeof result === 'number' && !isNaN(result)) {
          animateToCount(result);
        }
      }
    } catch (err) {
      console.warn('ℹ️ [Odometer] Notice during visitor count sync:', err.message);
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(syncCount, { timeout: 4000 });
  } else {
    setTimeout(syncCount, 2500);
  }

  // 3. Realtime Firestore Sync (attached non-blockingly so synthetic audits/Lighthouse complete clean)
  const attachSync = () => {
    try {
      subscribeToVisitorCounter((liveCount) => {
        if (typeof liveCount === 'number' && liveCount !== displayedCount) {
          animateToCount(liveCount);
        }
      });
    } catch (err) {}
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(attachSync, { timeout: 3500 });
  } else {
    setTimeout(attachSync, 2000);
  }
}
