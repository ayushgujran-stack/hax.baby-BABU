import { sound } from './audio.js';
import { getVisitorCount, recordVisitorHit } from './api.js';

export async function initOdometer() {
  const container = document.getElementById('odometer-container');
  if (!container) return;

  let currentCount = 1337;

  function renderDigits(num) {
    const formatted = String(num).padStart(6, '0');
    const part1 = formatted.slice(0, 3);
    const part2 = formatted.slice(3);
    const fullStr = `${part1},${part2}`;

    container.innerHTML = '';
    for (const char of fullStr) {
      const span = document.createElement('span');
      span.className = 'font-headline-md text-headline-md text-sunshine-yellow bg-ink-black px-2 py-0.5 border border-sunshine-yellow/30 rounded font-mono inline-block text-center select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-150';
      span.textContent = char;
      container.appendChild(span);
    }

    const badge = document.createElement('span');
    badge.className = 'font-label-stamp text-label-stamp text-xs text-on-primary bg-crayon-red px-2 py-1 ml-1 rounded select-none cursor-pointer hover:bg-crayon-pink active:scale-95 transition-all';
    badge.textContent = 'VISITORS LOGGED';
    badge.title = 'Persistent database-backed visitor count';
    container.appendChild(badge);
  }

  // Initial placeholder while fetching
  renderDigits(currentCount);

  // Fetch real persistent visitor count from database
  try {
    const alreadyCounted = sessionStorage.getItem('paci_boss_visit_counted');
    if (!alreadyCounted) {
      currentCount = await recordVisitorHit();
      sessionStorage.setItem('paci_boss_visit_counted', 'true');
    } else {
      currentCount = await getVisitorCount();
    }
    renderDigits(currentCount);
  } catch (err) {
    console.warn('Could not reach visitor counter endpoint, using fallback:', err.message);
  }
}
