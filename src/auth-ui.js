// ============================================================================
// THIS SUCKS.™ — Firebase Authentication UI Manager
// Handles Email/Password Sign Up, Sign In, Profile State, and Sign Out
// Project: baby-46ada
// ============================================================================

import {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  subscribeToAuthChanges,
  getCurrentUser
} from './firebase.js';
import { sound } from './audio.js';

export class AuthUIManager {
  constructor() {
    this.modal = null;
    this.currentUser = null;
    this.activeTab = 'signin'; // 'signin' | 'signup'
  }

  init() {
    this.modal = document.getElementById('auth-modal');
    if (!this.modal) return;

    // Header Trigger Buttons (e.g. "Join the Club" or Account Avatar)
    const clubBtn = document.querySelector('[data-path="join-the-club"]');
    if (clubBtn) {
      clubBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sound.playPop();
        this.open();
      });
    }

    const avatarBtn = document.getElementById('header-auth-avatar-btn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sound.playPop();
        this.open();
      });
    }

    // Modal Close Button
    const closeBtn = document.getElementById('close-auth-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sound.playPop();
        this.close();
      });
    }

    // Backdrop Click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Escape Key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });

    // Tab Switchers
    const tabSignIn = document.getElementById('auth-tab-signin');
    const tabSignUp = document.getElementById('auth-tab-signup');

    if (tabSignIn && tabSignUp) {
      tabSignIn.addEventListener('click', () => {
        sound.playPop();
        this.switchTab('signin');
      });
      tabSignUp.addEventListener('click', () => {
        sound.playPop();
        this.switchTab('signup');
      });
    }

    // Sign In Form Submission
    const signInForm = document.getElementById('auth-signin-form');
    if (signInForm) {
      signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email')?.value || '';
        const password = document.getElementById('signin-password')?.value || '';
        await this.handleSignIn(email, password);
      });
    }

    // Sign Up Form Submission
    const signUpForm = document.getElementById('auth-signup-form');
    if (signUpForm) {
      signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email')?.value || '';
        const password = document.getElementById('signup-password')?.value || '';
        const name = document.getElementById('signup-name')?.value || '';
        await this.handleSignUp(email, password, name);
      });
    }

    // Sign Out Button
    const signOutBtn = document.getElementById('auth-signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        sound.playPop();
        await this.handleSignOut();
      });
    }

    // Subscribe to Firebase Auth State Changes
    subscribeToAuthChanges((user) => {
      this.currentUser = user;
      this.updateUIForUser(user);
    });
  }

  open() {
    if (!this.modal) return;
    this.clearErrors();
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (this.currentUser) {
      this.showProfileView();
    } else {
      this.switchTab(this.activeTab);
    }
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.clearErrors();

    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const profileView = document.getElementById('auth-profile-view');
    const tabSignIn = document.getElementById('auth-tab-signin');
    const tabSignUp = document.getElementById('auth-tab-signup');
    const tabContainer = document.getElementById('auth-tabs-container');

    if (profileView) profileView.classList.add('hidden');
    if (tabContainer) tabContainer.classList.remove('hidden');

    if (tab === 'signin') {
      if (signinForm) signinForm.classList.remove('hidden');
      if (signupForm) signupForm.classList.add('hidden');
      if (tabSignIn) {
        tabSignIn.className = 'flex-1 py-2 text-xs font-black uppercase rounded bg-sunshine-yellow text-ink-black border-2 border-ink-black shadow-[2px_2px_0_#292521]';
      }
      if (tabSignUp) {
        tabSignUp.className = 'flex-1 py-2 text-xs font-black uppercase rounded bg-paper-cream text-on-surface-variant hover:text-ink-black border-2 border-transparent';
      }
    } else {
      if (signinForm) signinForm.classList.add('hidden');
      if (signupForm) signupForm.classList.remove('hidden');
      if (tabSignUp) {
        tabSignUp.className = 'flex-1 py-2 text-xs font-black uppercase rounded bg-crayon-pink text-ink-black border-2 border-ink-black shadow-[2px_2px_0_#292521]';
      }
      if (tabSignIn) {
        tabSignIn.className = 'flex-1 py-2 text-xs font-black uppercase rounded bg-paper-cream text-on-surface-variant hover:text-ink-black border-2 border-transparent';
      }
    }
  }

  showProfileView() {
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const profileView = document.getElementById('auth-profile-view');
    const tabContainer = document.getElementById('auth-tabs-container');

    if (signinForm) signinForm.classList.add('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (tabContainer) tabContainer.classList.add('hidden');
    if (profileView) profileView.classList.remove('hidden');

    if (this.currentUser) {
      const emailEl = document.getElementById('auth-profile-email');
      const nameEl = document.getElementById('auth-profile-name');
      const uidEl = document.getElementById('auth-profile-uid');

      if (emailEl) emailEl.textContent = this.currentUser.email || 'None';
      if (nameEl) nameEl.textContent = this.currentUser.displayName || 'VIP Executive Board Member';
      if (uidEl) uidEl.textContent = `EMP-ID: ${this.currentUser.uid.slice(0, 10).toUpperCase()}`;
    }
  }

  async handleSignIn(email, password) {
    this.clearErrors();
    const btn = document.getElementById('signin-submit-btn');
    if (btn) btn.disabled = true;

    try {
      await signInWithEmail(email, password);
      sound.playStamp();
      this.showSuccess('WELCOME BACK TO THE EXECUTIVE BOARD!');
      setTimeout(() => {
        this.showProfileView();
      }, 700);
    } catch (err) {
      console.error('Sign in error:', err);
      this.showError(this.formatAuthError(err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async handleSignUp(email, password, name) {
    this.clearErrors();
    const btn = document.getElementById('signup-submit-btn');
    if (btn) btn.disabled = true;

    try {
      await signUpWithEmail(email, password, name || 'Toddler Board Member');
      sound.playStamp();
      this.showSuccess('EXECUTIVE ACCESS GRANTED! WELCOME TO THIS SUCKS.™');
      setTimeout(() => {
        this.showProfileView();
      }, 700);
    } catch (err) {
      console.error('Sign up error:', err);
      this.showError(this.formatAuthError(err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async handleSignOut() {
    try {
      await signOutUser();
      sound.playPop();
      this.switchTab('signin');
      this.showSuccess('SIGNED OUT. BABU REVOKED YOUR EXECUTIVE MILK PRIVILEGES.');
    } catch (err) {
      this.showError(err.message);
    }
  }

  updateUIForUser(user) {
    const clubBtn = document.querySelector('[data-path="join-the-club"]');
    const avatarEl = document.getElementById('header-auth-avatar-btn');

    if (user) {
      const shortName = user.displayName || user.email?.split('@')[0] || 'VIP Member';
      if (clubBtn) {
        clubBtn.innerHTML = `★ ${shortName.toUpperCase()}`;
        clubBtn.classList.remove('bg-crayon-pink');
        clubBtn.classList.add('bg-lime-green');
        clubBtn.title = `Signed in as ${user.email} (Click for Account)`;
      }
      if (avatarEl) {
        avatarEl.innerHTML = `👶`;
        avatarEl.title = `VIP Executive: ${user.email}`;
      }
    } else {
      if (clubBtn) {
        clubBtn.textContent = 'Join the Club';
        clubBtn.classList.remove('bg-lime-green');
        clubBtn.classList.add('bg-crayon-pink');
        clubBtn.title = 'Join the THIS SUCKS.™ Executive Club';
      }
      if (avatarEl) {
        avatarEl.innerHTML = '';
      }
    }
  }

  formatAuthError(err) {
    const code = err.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. CEO Babu rejected credentials.';
      case 'auth/email-already-in-use':
        return 'An executive account with this email already exists! Please sign in.';
      case 'auth/weak-password':
        return 'Password too short! Please use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Babu put your IP in timeout for 5 minutes.';
      default:
        return err.message || 'Authentication failed. Please try again.';
    }
  }

  showError(msg) {
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
  }

  showSuccess(msg) {
    const succEl = document.getElementById('auth-success-msg');
    if (succEl) {
      succEl.textContent = msg;
      succEl.classList.remove('hidden');
      setTimeout(() => {
        succEl.classList.add('hidden');
      }, 4000);
    }
  }

  clearErrors() {
    const errEl = document.getElementById('auth-error-msg');
    const succEl = document.getElementById('auth-success-msg');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    if (succEl) {
      succEl.textContent = '';
      succEl.classList.add('hidden');
    }
  }
}

export const authUI = new AuthUIManager();

export function initAuth() {
  authUI.init();
}
