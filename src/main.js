import './style.css';
import { sound } from './audio.js';
import { initOdometer } from './odometer.js';
import { CartManager } from './cart.js';
import { initCertificate } from './certificate.js';
import { initEasterEggs } from './easter-eggs.js';
import { initComplaints } from './complaints.js';
import { mountDotCursor } from './cursor-init.tsx';
import { initChaseScene } from './chase-scene.js';
import { initVinylRoom } from './vinyl-room.js';

document.addEventListener('DOMContentLoaded', () => {
  // Expose sound engine globally
  window.sound = sound;

  // Initialize all interactive frontend and backend systems
  const cart = new CartManager();
  initOdometer();
  initCertificate();
  initEasterEggs();
  initComplaints();
  mountDotCursor();
  initChaseScene();
  initVinylRoom();

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
        button.id === 'easter-egg-btn' ||
        button.id === 'close-modal-btn' ||
        button.id === 'modal-ok-btn' ||
        button.id === 'baby-ceo' ||
        button.id === 'speech-bubble' ||
        button.id === 'submit-complaint' ||
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
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Nav item active state switcher
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const path = link.getAttribute('data-path');
      if (path === 'the-products') {
        const showcase = document.getElementById('showcase');
        if (showcase) {
          e.preventDefault();
          showcase.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (path === 'the-story') {
        const bio = document.getElementById('biography');
        if (bio) {
          e.preventDefault();
          bio.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (path === 'the-empire') {
        const timeline = document.querySelector('section:has(.grid-cols-5)') || document.getElementById('biography');
        if (timeline) {
          e.preventDefault();
          timeline.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (path === 'home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      navLinks.forEach(l => {
        l.className = 'font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface px-space-sm py-1 transition-all';
        l.removeAttribute('aria-current');
      });
      link.className = 'font-label-lg px-space-sm py-1 transition-all bg-sunshine-yellow text-ink-black shadow-[2px_2px_0px_#292521] border-2 border-ink-black rounded-lg';
      link.setAttribute('aria-current', 'page');
      sound.playPop();
    });
  });
});
