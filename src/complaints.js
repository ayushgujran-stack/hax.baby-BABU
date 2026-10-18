import { sound } from './audio.js';
import { submitComplaint } from './api.js';

export function initComplaints() {
  const form = document.getElementById('complaint-form');
  const input = document.getElementById('complaint-input');
  const submitBtn = document.getElementById('complaint-submit-btn');
  const responseBox = document.getElementById('complaint-response-box');
  const errorBox = document.getElementById('complaint-error-box');
  const charCounter = document.getElementById('complaint-char-counter');

  if (!form || !input || !submitBtn) return;

  // Character counter
  input.addEventListener('input', () => {
    const len = input.value.length;
    if (charCounter) {
      charCounter.textContent = `${len}/500`;
      if (len > 500) {
        charCounter.classList.add('text-crayon-red');
      } else {
        charCounter.classList.remove('text-crayon-red');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();

    if (!text) {
      showError('Please write your grievance before disturbing the CEO.');
      return;
    }

    if (text.length < 5) {
      showError('Complaint too brief. Babu needs at least 5 characters to understand.');
      return;
    }

    if (text.length > 500) {
      showError('Complaint exceeds 500 characters. Babu cannot read novels.');
      return;
    }

    // Clear previous states
    hideMessages();

    // Disable button & show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>⏳</span> <span>BABU IS REVIEWING...</span>';
    sound.playTick();

    try {
      const result = await submitComplaint(text);
      sound.playStamp();

      // Display success with fictional status RESOLVED BY BABU
      if (responseBox) {
        responseBox.innerHTML = `
          <div class="border-[3px] border-ink-black bg-lime-green/30 p-4 rounded-xl shadow-[3px_3px_0_#292521] rotate-[-1deg] animate-in fade-in">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-stamp text-xs bg-lime-green text-ink-black border-2 border-ink-black px-2 py-0.5 rounded font-black shadow-[1px_1px_0_#292521]">
                STATUS: ${result.status}
              </span>
              <span class="font-mono text-xs text-on-surface-variant font-bold">${result.complaintId}</span>
            </div>
            <p class="font-headline-sm text-sm text-ink-black font-bold">
              👏 Babu smiled and started clapping!
            </p>
            <p class="font-body-sm text-xs text-on-surface-variant mt-1 italic">
              "${result.babuResponse}"
            </p>
          </div>
        `;
        responseBox.classList.remove('hidden');
      }

      input.value = '';
      if (charCounter) charCounter.textContent = '0/500';
    } catch (err) {
      sound.playPop();
      showError(err.message || 'Failed to submit complaint. Babu threw his bottle.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      submitBtn.innerHTML = originalText;
    }
  });

  function showError(msg) {
    if (errorBox) {
      errorBox.innerHTML = `
        <div class="border-[2px] border-crayon-red bg-crayon-pink/20 p-3 rounded-lg text-ink-black text-xs font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>${msg}</span>
        </div>
      `;
      errorBox.classList.remove('hidden');
    }
  }

  function hideMessages() {
    if (errorBox) errorBox.classList.add('hidden');
    if (responseBox) responseBox.classList.add('hidden');
  }
}
