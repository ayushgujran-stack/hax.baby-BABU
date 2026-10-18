import { sound } from './audio.js';
import confetti from 'canvas-confetti';

export function initCertificate() {
  const licenseCard = document.querySelector('section:has(#license-owner) .relative.bg-paper-cream') 
    || document.querySelector('h2.uppercase:has(+ p)')?.closest('.relative.bg-paper-cream');

  // Let's locate the certificate section
  const certHeader = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('BUSINESS LICENSE'));
  if (!certHeader) return;

  const certSection = certHeader.closest('.relative.bg-paper-cream');
  if (!certSection) return;

  // Enhance the stamp
  const stampOverlay = certSection.querySelector('.border-\\[4px\\].border-crayon-red');
  if (stampOverlay) {
    stampOverlay.style.cursor = 'pointer';
    stampOverlay.title = 'Click to re-stamp with 100% LEGIT authority!';
    stampOverlay.parentElement.classList.remove('pointer-events-none');
    stampOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playStamp();
      stampOverlay.style.transform = 'scale(1.2) rotate(-8deg)';
      setTimeout(() => {
        stampOverlay.style.transform = '';
      }, 180);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: 0.7, y: 0.8 }
      });
    });
  }

  // Make the owner name customizable inline
  const ownerPara = certSection.querySelector('p.font-headline-md');
  if (ownerPara && ownerPara.textContent.includes('Babu')) {
    ownerPara.setAttribute('contenteditable', 'true');
    ownerPara.title = 'Click to customize CEO or baby name!';
    ownerPara.classList.add('hover:bg-sunshine-yellow/30', 'px-1', 'rounded', 'outline-dashed', 'outline-1', 'outline-ink-black/40', 'cursor-text');
    ownerPara.addEventListener('focus', () => {
      sound.playTick();
    });
  }

  // Add a "PRINT / DOWNLOAD LICENSE" button to the certificate
  const footerSeals = certSection.querySelector('.mt-8.pt-6');
  if (footerSeals && !document.getElementById('print-cert-btn')) {
    const printBtn = document.createElement('button');
    printBtn.id = 'print-cert-btn';
    printBtn.className = 'font-label-stamp text-xs text-ink-black bg-sunshine-yellow px-3 py-1.5 border-2 border-ink-black rounded shadow-[2px_2px_0_#292521] hover:shadow-[4px_4px_0_#292521] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer';
    printBtn.innerHTML = '<span>🖨️</span> <span>PRINT CERTIFICATE</span>';
    printBtn.addEventListener('click', () => {
      sound.playStamp();
      window.print();
    });
    footerSeals.appendChild(printBtn);
  }
}
