import { sound } from './audio.js';
import { placeOrder } from './api.js';
import confetti from 'canvas-confetti';

export const APPROVED_PRODUCTS = [
  'Pacifier my aunt gifted',
  'Found at Suzie’s house',
  'It just spawned on my bedroom'
];

export class CartManager {
  constructor() {
    this.initBuyNowButtons();
  }

  initBuyNowButtons() {
    const showcase = document.getElementById('showcase');
    if (!showcase) return;

    // Connect all BUY NOW buttons in the showcase cards
    const buttons = showcase.querySelectorAll('button[data-product]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const productName = btn.getAttribute('data-product');
        await this.handleDirectOrder(productName, btn);
      });
    });
  }

  async handleDirectOrder(productName, btn) {
    if (!btn || btn.disabled) return;

    // Prevent duplicate orders by disabling button while request is processing
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.classList.add('opacity-70', 'cursor-not-allowed');
    btn.innerHTML = '<span>⏳</span> <span>PROCESSING WITH BABU...</span>';
    sound.playTick();

    try {
      const result = await placeOrder(productName);
      sound.playStamp();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Display EXACT confirmation required:
      // ORDER PLACED!
      // Delivery after sucked and approved by CEO.
      this.showExactOrderConfirmation(result);
    } catch (err) {
      sound.playPop();
      this.showErrorToast(err.message || 'Babu rejected your order.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-70', 'cursor-not-allowed');
      btn.innerHTML = originalText;
    }
  }

  showExactOrderConfirmation(result) {
    const existing = document.getElementById('order-confirmation-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'order-confirmation-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/70 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="relative bg-paper-cream border-[4px] border-ink-black shadow-[10px_10px_0_#292521] rounded-2xl p-6 sm:p-10 max-w-md w-full rotate-[-1deg] text-center animate-in zoom-in-95 duration-150">
        <!-- Masking Tape -->
        <div class="absolute -top-4 left-1/3 w-28 h-6 bg-sunshine-yellow/90 border border-ink-black/30 -rotate-2"></div>
        <span class="text-5xl block mb-3">🍼</span>
        
        <!-- Exact headline -->
        <h2 class="font-display-lg text-headline-lg text-crayon-red uppercase font-black tracking-wider mb-2">
          ${result.confirmation.headline}
        </h2>

        <!-- Exact message -->
        <p class="font-headline-md text-ink-black text-lg mb-4 leading-snug">
          ${result.confirmation.message}
        </p>

        <div class="bg-paper-cream border-2 border-dashed border-ink-black/40 p-3 rounded-lg mb-6 text-left space-y-1">
          <div class="flex justify-between text-xs">
            <span class="font-label-stamp text-on-surface-variant">PRODUCT:</span>
            <span class="font-bold text-ink-black">${result.product}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="font-label-stamp text-on-surface-variant">ORDER ID:</span>
            <span class="font-mono text-ink-black font-bold">${result.orderId}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="font-label-stamp text-on-surface-variant">STATUS:</span>
            <span class="text-crayon-red font-bold font-label-stamp">AWAITING CEO SUCK &amp; APPROVAL</span>
          </div>
        </div>

        <button id="close-order-conf-btn" class="w-full font-label-lg text-label-lg bg-sunshine-yellow text-ink-black py-3 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg hover:shadow-[6px_6px_0_#292521] active:translate-x-1 active:translate-y-1 transition-all">
          ACKNOWLEDGE &amp; SALUTE BABU
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('close-order-conf-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sound.playPop();
        modal.remove();
      });
    }
  }

  showErrorToast(message) {
    const existing = document.getElementById('paci-error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'paci-error-toast';
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-crayon-pink text-ink-black font-label-stamp text-xs px-4 py-3 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg rotate-[-1deg] flex items-center gap-2';
    toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}
