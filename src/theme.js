// ============================================================================
// GLOBAL DAY / NIGHT THEME CONTROLLER
// Controls the entire THIS SUCKS.™ website:
// - Centralizes theme state ('day' | 'night')
// - Updates document.documentElement data-theme & .dark class
// - Synchronizes Hero Baby awake / sleeping state
// - Transforms Playground between active Pacifier Chase & Babu's Bedroom
// - Persists user preference across page reloads in localStorage
// - Keyboard accessible and smooth transitions
// ============================================================================

import { sound } from './audio.js';
import { setHeroBabySleeping } from './hero-baby.js';
import { setChaseSceneNightMode } from './chase-scene.js';

const STORAGE_KEY = 'paci_boss_theme';

export class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem(STORAGE_KEY) || 'day';
    this.toggleBtn = document.getElementById('theme-toggle-btn');
    this.themeIcon = document.getElementById('theme-icon');
    this.themeLabel = document.getElementById('theme-label');

    this.init();
  }

  init() {
    // Apply initial theme immediately to avoid layout flash
    this.applyTheme(this.currentTheme, false);

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.toggle();
        sound.playPop();
      });

      this.toggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
          sound.playPop();
        }
      });
    }
  }

  toggle() {
    const nextTheme = this.currentTheme === 'day' ? 'night' : 'day';
    this.applyTheme(nextTheme, true);
  }

  applyTheme(theme, isUserAction = true) {
    this.currentTheme = theme;
    const isNight = theme === 'night';

    // 1. Root theme attributes and dark class for Tailwind
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isNight);

    // 2. Persist in localStorage
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // Ignore private browsing storage quota errors
    }

    // 3. Update the button UI
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-pressed', isNight ? 'true' : 'false');
      this.toggleBtn.setAttribute('aria-label', isNight ? 'Switch to Day Mode (Wake Babu)' : 'Switch to Night Mode (Bedtime)');
      this.toggleBtn.setAttribute('title', isNight ? 'Wake Babu (Day Mode)' : 'Put Babu to Sleep (Night Mode)');
    }

    if (this.themeIcon) {
      this.themeIcon.textContent = isNight ? '☀️' : '🌙';
    }

    if (this.themeLabel) {
      this.themeLabel.textContent = isNight ? 'WAKE' : 'SLEEP';
    }

    // 4. Update Hero Baby state
    setHeroBabySleeping(isNight);

    // 5. Update Playground Chase / Bedroom state
    setChaseSceneNightMode(isNight);

    // 6. Dispatch global event for any other custom components
    window.dispatchEvent(new CustomEvent('paci-theme-changed', {
      detail: { theme, isNight }
    }));
  }

  getTheme() {
    return this.currentTheme;
  }

  isNight() {
    return this.currentTheme === 'night';
  }
}

let themeManagerInstance = null;

export function initTheme() {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}

export function getThemeManager() {
  return themeManagerInstance;
}
