import { sound } from './audio.js';
import { getClassifiedFiles } from './api.js';
import confetti from 'canvas-confetti';

export function initEasterEggs() {
  // 1. Audio Mute / Unmute Toggle Button in Navbar
  const headerRight = document.querySelector('header .flex.items-center.gap-space-md');
  if (headerRight && !document.getElementById('audio-toggle-btn')) {
    const audioBtn = document.createElement('button');
    audioBtn.id = 'audio-toggle-btn';
    audioBtn.className = 'w-9 h-9 rounded-lg bg-paper-cream border-2 border-ink-black shadow-[2px_2px_0_#292521] flex items-center justify-center text-lg hover:bg-sunshine-yellow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer';
    audioBtn.title = 'Toggle Toy Sounds';
    audioBtn.innerHTML = sound.isMuted() ? '🔇' : '🔊';

    audioBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      audioBtn.innerHTML = isMuted ? '🔇' : '🔊';
      if (!isMuted) sound.playSqueak();
    });

    headerRight.prepend(audioBtn);
  }

  // 2. Interactive Sticky Notes (physics jiggle & peel sound)
  const stickies = document.querySelectorAll('.relative.bg-sunshine-yellow.p-4, .relative.bg-crayon-pink.p-3, .relative.bg-lime-green.p-3, .bg-sunshine-yellow.px-4.py-1\\.5, .bg-crayon-pink.p-3.rotate-6');
  stickies.forEach(sticky => {
    sticky.style.cursor = 'pointer';
    sticky.addEventListener('click', () => {
      sound.playPeel();
      sticky.style.transition = 'transform 0.15s ease-in-out';
      sticky.style.transform = `scale(1.08) rotate(${Math.random() * 8 - 4}deg)`;
      setTimeout(() => {
        sticky.style.transform = '';
      }, 250);
    });
  });

  // 3. Baby CEO Speech Bubble & Babu Quotes
  const speeches = [
    { text: '"GOO GOO GAGA!"', sub: "Translation: We're executing a hostile takeover of the sandbox." },
    { text: '"WHERE IS MY WARM MILK?"', sub: "Translation: Emergency board meeting called in nursery room." },
    { text: '"YOU MAY ADDRESS ME AS SIR."', sub: "Translation: I have soiled my executive diaper." },
    { text: '"BUY LOW, SUCK HARD."', sub: "Translation: The foundational philosophy of the Paci Empire." }
  ];

  let speechIdx = 0;
  const speechBubble = document.getElementById('speech-bubble');
  const babyCeo = document.getElementById('baby-ceo');
  const speechText = document.getElementById('speech-text');
  const speechSub = document.getElementById('speech-sub');

  function triggerSpeech() {
    speechIdx = (speechIdx + 1) % speeches.length;
    if (speechText && speechSub) {
      speechText.style.opacity = '0';
      speechSub.style.opacity = '0';
      sound.playSqueak();
      setTimeout(() => {
        speechText.textContent = speeches[speechIdx].text;
        speechSub.textContent = speeches[speechIdx].sub;
        speechText.style.opacity = '1';
        speechSub.style.opacity = '1';
      }, 120);
    }
  }

  if (speechBubble) speechBubble.addEventListener('click', triggerSpeech);
  if (babyCeo) babyCeo.addEventListener('click', triggerSpeech);

  // 4. Secret "TOP SECRET CEO FILE" Dossier Modal (Secret Supply Chain Investigation)
  const easterBtn = document.getElementById('easter-egg-btn');
  const modal = document.getElementById('confidential-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const okBtn = document.getElementById('modal-ok-btn');
  const modalContent = document.getElementById('modal-classified-content');

  async function openSecretModal() {
    if (!modal) return;
    sound.playStamp();
    modal.classList.remove('hidden');

    confetti({
      particleCount: 70,
      spread: 50,
      origin: { x: 0.9, y: 0.9 }
    });

    // Populate with backend classified files
    if (modalContent) {
      try {
        const data = await getClassifiedFiles();
        modalContent.innerHTML = `
          <div class="space-y-4 font-body-lg text-ink-black">
            <p class="font-label-stamp text-xs text-crayon-red uppercase">
              ${data.classification}
            </p>
            <div class="space-y-3">
              ${data.files.map(f => `
                <div class="bg-paper-cream border-2 border-ink-black p-3 rounded-lg shadow-[2px_2px_0_#292521]">
                  <h4 class="font-headline-sm text-sm text-ink-black font-bold flex items-center gap-1.5">
                    <span class="text-crayon-red">📁</span>
                    <span>${f.id} — ${f.title}</span>
                  </h4>
                  <p class="font-body-sm text-xs text-on-surface-variant mt-1 font-semibold">${f.details}</p>
                </div>
              `).join('')}
            </div>
            <!-- Final Stamp -->
            <div class="pt-2 flex flex-col items-center">
              <div class="border-[4px] border-crayon-red px-4 py-1.5 rounded-lg bg-crayon-pink/20 shadow-[3px_3px_0_#FF5B55] rotate-[-4deg]">
                <span class="font-display-lg text-headline-sm text-crayon-red font-black tracking-widest uppercase">
                  ${data.finalStamp}
                </span>
              </div>
              <p class="font-body-sm text-xs text-on-surface-variant italic mt-3 font-bold">
                "${data.additionalNote}"
              </p>
            </div>
          </div>
        `;
      } catch (err) {
        console.warn('Could not fetch classified files from API, using static fallback:', err.message);
      }
    }
  }

  function closeSecretModal() {
    if (!modal) return;
    sound.playPop();
    modal.classList.add('hidden');
  }

  if (easterBtn) easterBtn.addEventListener('click', openSecretModal);
  if (closeBtn) closeBtn.addEventListener('click', closeSecretModal);
  if (okBtn) okBtn.addEventListener('click', closeSecretModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSecretModal();
    });
  }

  // 5. Thumbprint Stamp Interactive Glow
  const thumbprint = document.querySelector('.relative.w-16.h-16.rounded-full');
  if (thumbprint) {
    thumbprint.style.cursor = 'pointer';
    thumbprint.title = 'Biometric Executive Authorization: Click to verify thumbprint';
    thumbprint.addEventListener('click', () => {
      sound.playStamp();
      thumbprint.classList.add('ring-4', 'ring-crayon-pink', 'animate-pulse');
      setTimeout(() => {
        thumbprint.classList.remove('ring-4', 'ring-crayon-pink', 'animate-pulse');
      }, 1200);
    });
  }
}
