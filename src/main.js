import './style.css';
import { sound } from './audio.js';
import { initOdometer } from './odometer.js';
import { CartManager } from './cart.js';
import { initCertificate } from './certificate.js';
import { initEasterEggs } from './easter-eggs.js';
import { initGuestbook } from './guestbook.js';
import { initVisitorMemory } from './visitor-memory.js';
import { mountDotCursor } from './cursor-init.tsx';
import { initChaseScene } from './chase-scene.js';
import { initVinylRoom } from './vinyl-room.js';
import { initAuth } from './auth-ui.js';
import { initHeroBaby } from './hero-baby.js';
import { initTheme } from './theme.js';
import { initFireflies } from './fireflies.js';
import { initIntroScroll } from './intro-scroll.js';
import { initJourneyTimeline } from './journey-timeline.js';
import { initStorybook } from './storybook.js';
import { initStonksChart } from './stonks-chart.js';

document.addEventListener('DOMContentLoaded', () => {
  // Expose sound engine globally
  window.sound = sound;

  // Initialize intro scroll-controlled sequential frame animation
  const introController = initIntroScroll();
  window.introScrollController = introController;

  // Core immediate visual setups
  initTheme();
  initFireflies();
  initLicenseStackEffect();
  initChaseDominationStackEffect();
  initMobileMenu();

  // Defer below-the-fold & non-critical interactive components to avoid main-thread freeze
  const scheduleInit = (fn) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(fn, { timeout: 1500 });
    } else {
      setTimeout(fn, 100);
    }
  };

  scheduleInit(() => {
    const cart = new CartManager();
    mountDotCursor();
    initHeroBaby();
    initJourneyTimeline();
    initCertificate();
    initEasterEggs();
  });

  scheduleInit(() => {
    initChaseScene();
    initStonksChart();
    initStorybook();
    initVinylRoom();
  });

  // Defer heavy network components (Auth, Odometer, Guestbook, Memory) until user interacts or scrolls near them
  const initNetworkFeatures = () => {
    if (window.__networkFeaturesLoaded) return;
    window.__networkFeaturesLoaded = true;
    initAuth();
    initOdometer();
    initGuestbook();
    initVisitorMemory();
  };

  // If user scrolls or after 3.5s idle, trigger network features
  if (window.scrollY > 200) {
    initNetworkFeatures();
  } else {
    const onScrollOrTouch = () => {
      initNetworkFeatures();
      window.removeEventListener('scroll', onScrollOrTouch);
      window.removeEventListener('touchstart', onScrollOrTouch);
    };
    window.addEventListener('scroll', onScrollOrTouch, { passive: true });
    window.addEventListener('touchstart', onScrollOrTouch, { passive: true });
    setTimeout(initNetworkFeatures, 3500);
  }

  // Play pop on interactive button clicks that don't already have specific sounds
  document.addEventListener('click', (e) => {
    // Prime the audio context on any user click
    sound.init();

    const target = e.target;
    if (!target) return;

    // Check if clicked an interactive button or card that doesn't already have its own sound handler
    const button = target.closest('button, .cursor-pointer, a');
    if (button) {
      // If it's a generic button or CTA (like Join the Club, Meet the Boss, etc.)
      const isCustomHandled = 
        button.hasAttribute('data-product') ||
        button.id === 'audio-toggle-btn' ||
        button.id === 'theme-toggle-btn' ||
        button.id === 'easter-egg-btn' ||
        button.id === 'close-modal-btn' ||
        button.id === 'modal-ok-btn' ||
        button.id === 'baby-ceo' ||
        button.id === 'speech-bubble' ||
        button.id === 'submit-complaint' ||
        button.id === 'complaint-submit-btn' ||
        button.closest('#auth-modal') ||
        button.closest('#vinyl-room-modal') ||
        button.closest('#confidential-modal') ||
        button.closest('#order-confirmation-modal') ||
        button.closest('header nav') ||
        button.matches('a[href^="#"]');

      if (!isCustomHandled) {
        sound.playPop();
      }
    }
  });

  // Smooth scroll for internal navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          sound.playPeel();
          if (href !== '#hero-section' && window.introScrollController && !window.introScrollController.isDismissed()) {
            window.introScrollController.dismiss();
          }
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Nav item active state switcher & scroll
  const navLinks = document.querySelectorAll('header nav a');
  const allNavLinks = document.querySelectorAll('header nav a, footer a[data-path], #mobile-nav-drawer a[data-path]');
  allNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const path = link.getAttribute('data-path');
      if (path === 'the-products') {
        const showcase = document.getElementById('showcase');
        if (showcase) {
          e.preventDefault();
          if (window.introScrollController && !window.introScrollController.isDismissed()) {
            window.introScrollController.dismiss();
          }
          showcase.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (path === 'the-story') {
        const bio = document.getElementById('biography');
        if (bio) {
          e.preventDefault();
          if (window.introScrollController && !window.introScrollController.isDismissed()) {
            window.introScrollController.dismiss();
          }
          bio.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (path === 'the-storybook') {
        const storybook = document.getElementById('storybook-section');
        if (storybook) {
          e.preventDefault();
          if (window.introScrollController && !window.introScrollController.isDismissed()) {
            window.introScrollController.dismiss();
          }
          storybook.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (path === 'home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      navLinks.forEach(l => {
        l.className = 'font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-sm py-1 transition-all';
        l.removeAttribute('aria-current');
      });
      const matchingHeaderLink = document.querySelector(`header nav a[data-path="${path}"]`);
      if (matchingHeaderLink) {
        matchingHeaderLink.className = 'font-label-lg px-space-sm py-1 transition-all bg-sunshine-yellow text-ink-black shadow-[2px_2px_0px_#292521] border-2 border-ink-black rounded-lg';
        matchingHeaderLink.setAttribute('aria-current', 'page');
      }
      sound.playPop();
    });
  });

  // Credits Modal Controller
  const creditsModal = document.getElementById('credits-modal');
  const closeCreditsBtn = document.getElementById('close-credits-btn');
  const creditsOkBtn = document.getElementById('credits-ok-btn');
  const aboutCreditsBtn = document.getElementById('about-credits-btn');
  const footerCreditsBtn = document.getElementById('footer-credits-btn');

  const openCreditsModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (creditsModal) {
      creditsModal.classList.remove('hidden');
      sound.playStamp();
    }
  };

  const closeCreditsModal = () => {
    if (creditsModal) {
      creditsModal.classList.add('hidden');
      sound.playPop();
    }
  };

  if (aboutCreditsBtn) aboutCreditsBtn.addEventListener('click', openCreditsModal);
  if (footerCreditsBtn) footerCreditsBtn.addEventListener('click', openCreditsModal);
  if (closeCreditsBtn) closeCreditsBtn.addEventListener('click', closeCreditsModal);
  if (creditsOkBtn) creditsOkBtn.addEventListener('click', closeCreditsModal);

  if (creditsModal) {
    creditsModal.addEventListener('click', (e) => {
      if (e.target === creditsModal) closeCreditsModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && creditsModal && !creditsModal.classList.contains('hidden')) {
      closeCreditsModal();
    }
  });
});

// Desk Stacking Effect: As Autobiography slides up from bottom, License recedes smoothly
function initLicenseStackEffect() {
  const licenseCard = document.getElementById('license-card-inner');
  const bio = document.getElementById('biography');
  if (!licenseCard || !bio) return;

  let ticking = false;
  function update() {
    const bioRect = bio.getBoundingClientRect();
    const winH = window.innerHeight;

    if (bioRect.top < winH && bioRect.top > 60) {
      const overlapProgress = Math.min(1, Math.max(0, (winH - bioRect.top) / (winH - 80)));
      const scale = 1 - overlapProgress * 0.05;
      const opacity = 1 - overlapProgress * 0.35;
      const translateY = overlapProgress * 15;
      licenseCard.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`;
      licenseCard.style.opacity = opacity.toFixed(3);
    } else if (bioRect.top >= winH) {
      licenseCard.style.transform = 'scale(1) translateY(0)';
      licenseCard.style.opacity = '1';
    } else {
      licenseCard.style.transform = 'scale(0.95) translateY(15px)';
      licenseCard.style.opacity = '0.65';
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

// Desk Stacking Effect: As Domination Timeline slides up from bottom, Chase Game recedes smoothly
function initChaseDominationStackEffect() {
  const chaseCard = document.getElementById('chase-card-inner');
  const domination = document.getElementById('domination');
  if (!chaseCard || !domination) return;

  let ticking = false;
  function update() {
    const domRect = domination.getBoundingClientRect();
    const winH = window.innerHeight;

    if (domRect.top < winH && domRect.top > 60) {
      const overlapProgress = Math.min(1, Math.max(0, (winH - domRect.top) / (winH - 80)));
      const scale = 1 - overlapProgress * 0.05;
      const opacity = 1 - overlapProgress * 0.35;
      const translateY = overlapProgress * 15;
      chaseCard.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`;
      chaseCard.style.opacity = opacity.toFixed(3);
    } else if (domRect.top >= winH) {
      chaseCard.style.transform = 'scale(1) translateY(0)';
      chaseCard.style.opacity = '1';
    } else {
      chaseCard.style.transform = 'scale(0.95) translateY(15px)';
      chaseCard.style.opacity = '0.65';
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}


// Mobile Navigation Drawer Controller
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (!toggleBtn || !drawer) return;

  let isOpen = false;

  const openMenu = () => {
    isOpen = true;
    drawer.classList.remove('-translate-y-full', 'opacity-0', 'pointer-events-none');
    drawer.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
    if (overlay) {
      overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      overlay.classList.add('opacity-100', 'pointer-events-auto');
    }
    toggleBtn.setAttribute('aria-expanded', 'true');
    const icon = toggleBtn.querySelector('.menu-icon');
    if (icon) icon.textContent = '✕';
    if (window.sound) window.sound.playPop();
  };

  const closeMenu = () => {
    isOpen = false;
    drawer.classList.add('-translate-y-full', 'opacity-0', 'pointer-events-none');
    drawer.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    if (overlay) {
      overlay.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        if (!isOpen) overlay.classList.add('hidden');
      }, 300);
    }
    toggleBtn.setAttribute('aria-expanded', 'false');
    const icon = toggleBtn.querySelector('.menu-icon');
    if (icon) icon.textContent = '☰';
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) closeMenu();
    else openMenu();
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      closeMenu();
      if (window.sound) window.sound.playPop();
    });
  }

  // Close when tapping any link in drawer
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
    }
  });
}
