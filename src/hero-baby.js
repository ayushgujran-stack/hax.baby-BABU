// ============================================================================
// HERO BABY CURSOR TRACKING & DAY/NIGHT SLEEP SYSTEM
// Babu the Baby CEO reacts naturally to cursor movements:
// - Eyes follow pointer with clamped natural limits
// - Head tilts subtly in 3D perspective toward pointer
// - Smooth spring interpolation with neutral return on pointerleave
// - Full touch support on mobile without interfering with page scroll
// - Respects prefers-reduced-motion
// - Day Mode: Awake, cursor tracking active
// - Night Mode: Closed eyelids, peaceful breathing animation, floating Zzz doodles
// ============================================================================

export class HeroBabyController {
  constructor() {
    this.heroSection = document.getElementById('hero-section');
    this.babyContainer = document.getElementById('baby-ceo');
    if (!this.heroSection || !this.babyContainer) return;

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isSleeping = false;
    this.isPointerInside = false;

    // Movement targets and current values
    this.current = {
      pupilX: 0,
      pupilY: 0,
      tiltX: 0,
      tiltY: 0,
      tiltZ: 0
    };

    this.target = {
      pupilX: 0,
      pupilY: 0,
      tiltX: 0,
      tiltY: 0,
      tiltZ: 0
    };

    // Tracking limits (clamped to natural, subtle motion)
    this.MAX_PUPIL_RADIUS = 5.5; // pixels inside SVG viewBox (384x512)
    this.MAX_TILT_Y = 5.0; // degrees
    this.MAX_TILT_X = 4.0; // degrees
    this.MAX_TILT_Z = 1.8; // degrees
    this.LERP_FACTOR = 0.14; // smooth spring follow

    this.animFrameId = null;

    this.initDOM();
    this.bindEvents();
    this.startLoop();
  }

  initDOM() {
    // Check if the interactive wrapper is already built
    let wrapper = document.getElementById('baby-ceo-wrapper');
    if (!wrapper) {
      // Find the existing img
      const existingImg = this.babyContainer.querySelector('img');
      if (!existingImg) return;

      // Create wrapper that preserves the exact existing baby image
      wrapper = document.createElement('div');
      wrapper.id = 'baby-ceo-wrapper';
      wrapper.className = 'relative inline-block mx-auto select-none';
      wrapper.style.transformOrigin = '50% 82%';
      wrapper.style.transformStyle = 'preserve-3d';
      wrapper.style.willChange = 'transform';

      // Insert wrapper and move image inside
      existingImg.parentNode.insertBefore(wrapper, existingImg);
      wrapper.appendChild(existingImg);

      // Create SVG overlay aligned 1:1 with the 384x512 baby artwork
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'baby-ceo-eyes-svg');
      svg.setAttribute('viewBox', '0 0 384 512');
      svg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-20');
      svg.setAttribute('aria-hidden', 'true');

      svg.innerHTML = `
        <defs>
          <!-- Left Eye Socket Clip (Viewer Left) -->
          <clipPath id="left-eye-socket-clip">
            <ellipse cx="148" cy="161" rx="26" ry="29" />
          </clipPath>

          <!-- Right Eye Socket Clip (Viewer Right) -->
          <clipPath id="right-eye-socket-clip">
            <ellipse cx="237" cy="161" rx="26" ry="29" />
          </clipPath>

          <!-- Sclera Shadow Gradient -->
          <linearGradient id="sclera-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#CCD7E4" />
            <stop offset="35%" stop-color="#EAF0F8" />
            <stop offset="70%" stop-color="#FFFFFF" />
          </linearGradient>

          <!-- Eyelid Skin Gradient -->
          <linearGradient id="eyelid-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FCE1D0" />
            <stop offset="60%" stop-color="#FAD2B8" />
            <stop offset="100%" stop-color="#F2BE9F" />
          </linearGradient>

          <!-- Pupil Radial Depth -->
          <radialGradient id="pupil-gloss" cx="42%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#3A241C" />
            <stop offset="65%" stop-color="#1A110C" />
            <stop offset="100%" stop-color="#0A0605" />
          </radialGradient>
        </defs>

        <!-- AWAKE EYE SOCKETS & TRACKING PUPILS -->
        <g id="hero-awake-eyes" style="transition: opacity 0.35s ease;">
          <!-- ================= LEFT EYE ================= -->
          <g clip-path="url(#left-eye-socket-clip)">
            <!-- Eye White Sclera Base -->
            <rect x="118" y="128" width="60" height="66" fill="url(#sclera-shadow)" />
            
            <!-- Pupil + Iris (Moves via transform) -->
            <g id="hero-pupil-left">
              <!-- Dark Iris -->
              <circle cx="148" cy="161" r="17.5" fill="url(#pupil-gloss)" stroke="#0E0806" stroke-width="1.2" />
              <!-- Inner Black Core -->
              <circle cx="148" cy="161" r="10" fill="#0A0604" />
              <!-- Big Specular Catchlight (Top Right) -->
              <circle cx="154.5" cy="154" r="5" fill="#FFFFFF" opacity="0.95" />
              <!-- Small Secondary Catchlight (Bottom Right) -->
              <circle cx="156.5" cy="168" r="2.2" fill="#FFFFFF" opacity="0.85" />
            </g>
          </g>

          <!-- Left Upper Eyelid Rim & Fold (Gives original anime/cartoon depth) -->
          <path d="M 122 153 Q 148 136 174 153" stroke="#292521" stroke-width="3" stroke-linecap="round" fill="none" />
          <path d="M 125 142 Q 148 130 171 142" stroke="#D3A588" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />

          <!-- ================= RIGHT EYE ================= -->
          <g clip-path="url(#right-eye-socket-clip)">
            <!-- Eye White Sclera Base -->
            <rect x="207" y="128" width="60" height="66" fill="url(#sclera-shadow)" />

            <!-- Pupil + Iris (Moves via transform) -->
            <g id="hero-pupil-right">
              <!-- Dark Iris -->
              <circle cx="237" cy="161" r="17.5" fill="url(#pupil-gloss)" stroke="#0E0806" stroke-width="1.2" />
              <!-- Inner Black Core -->
              <circle cx="237" cy="161" r="10" fill="#0A0604" />
              <!-- Big Specular Catchlight (Top Right) -->
              <circle cx="243.5" cy="154" r="5" fill="#FFFFFF" opacity="0.95" />
              <!-- Small Secondary Catchlight (Bottom Right) -->
              <circle cx="245.5" cy="168" r="2.2" fill="#FFFFFF" opacity="0.85" />
            </g>
          </g>

          <!-- Right Upper Eyelid Rim & Fold -->
          <path d="M 211 153 Q 237 136 263 153" stroke="#292521" stroke-width="3" stroke-linecap="round" fill="none" />
          <path d="M 214 142 Q 237 130 260 142" stroke="#D3A588" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />
        </g>

        <!-- NIGHTTIME SLEEPING EYELIDS (Covers eyes with peaceful closed arcs) -->
        <g id="hero-sleeping-eyelids" style="opacity: 0; pointer-events: none; transition: opacity 0.4s ease-in-out;">
          <!-- Left Sleeping Eye -->
          <g clip-path="url(#left-eye-socket-clip)">
            <!-- Skin fill -->
            <rect x="118" y="128" width="60" height="66" fill="url(#eyelid-skin)" />
          </g>
          <!-- Left Peaceful Closed Curved Lash Line -->
          <path d="M 124 163 Q 148 178 172 163" stroke="#292521" stroke-width="3.5" stroke-linecap="round" fill="none" />
          <!-- Cute sleeping eyelashes -->
          <path d="M 125 163 L 120 160" stroke="#292521" stroke-width="2.2" stroke-linecap="round" />
          <path d="M 171 163 L 176 160" stroke="#292521" stroke-width="2.2" stroke-linecap="round" />

          <!-- Right Sleeping Eye -->
          <g clip-path="url(#right-eye-socket-clip)">
            <!-- Skin fill -->
            <rect x="207" y="128" width="60" height="66" fill="url(#eyelid-skin)" />
          </g>
          <!-- Right Peaceful Closed Curved Lash Line -->
          <path d="M 213 163 Q 237 178 261 163" stroke="#292521" stroke-width="3.5" stroke-linecap="round" fill="none" />
          <!-- Cute sleeping eyelashes -->
          <path d="M 214 163 L 209 160" stroke="#292521" stroke-width="2.2" stroke-linecap="round" />
          <path d="M 260 163 L 265 160" stroke="#292521" stroke-width="2.2" stroke-linecap="round" />
        </g>
      `;

      wrapper.appendChild(svg);

      // Create sleeping Zzz doodle container
      const zzzContainer = document.createElement('div');
      zzzContainer.id = 'hero-baby-zzz-doodle';
      zzzContainer.className = 'absolute -top-10 right-4 pointer-events-none select-none z-30 transition-opacity duration-300 opacity-0';
      zzzContainer.innerHTML = `
        <div class="relative flex flex-col items-center">
          <span class="hero-zzz text-xl font-headline-lg font-black text-sunshine-yellow rotate-12 drop-shadow-[2px_2px_0_#292521]" style="animation: hero-zzz-float 2.4s ease-in-out infinite;">Z</span>
          <span class="hero-zzz text-base font-headline-lg font-black text-crayon-pink -rotate-6 drop-shadow-[2px_2px_0_#292521]" style="animation: hero-zzz-float 2.4s ease-in-out 0.8s infinite;">z</span>
          <span class="hero-zzz text-xs font-headline-lg font-black text-marker-blue rotate-12 drop-shadow-[1px_1px_0_#292521]" style="animation: hero-zzz-float 2.4s ease-in-out 1.6s infinite;">z</span>
        </div>
      `;
      wrapper.appendChild(zzzContainer);
    }

    this.wrapper = wrapper;
    this.pupilLeft = document.getElementById('hero-pupil-left');
    this.pupilRight = document.getElementById('hero-pupil-right');
    this.sleepingEyelids = document.getElementById('hero-sleeping-eyelids');
    this.awakeEyes = document.getElementById('hero-awake-eyes');
    this.zzzDoodle = document.getElementById('hero-baby-zzz-doodle');
  }

  bindEvents() {
    // Pointer move across the entire hero section
    const handleMove = (e) => {
      if (this.isSleeping || this.prefersReducedMotion) return;

      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);

      if (clientX === null || clientY === null) return;

      this.isPointerInside = true;
      this.calculateTargets(clientX, clientY);
    };

    // Hero section mouse / pointer tracking
    this.heroSection.addEventListener('pointermove', handleMove, { passive: true });
    this.heroSection.addEventListener('pointerenter', handleMove, { passive: true });

    // Touch support: passive so mobile scroll is never blocked
    this.heroSection.addEventListener('touchstart', handleMove, { passive: true });
    this.heroSection.addEventListener('touchmove', handleMove, { passive: true });

    // Pointer leave / return to neutral
    const handleLeave = () => {
      this.isPointerInside = false;
      this.target.pupilX = 0;
      this.target.pupilY = 0;
      this.target.tiltX = 0;
      this.target.tiltY = 0;
      this.target.tiltZ = 0;
    };

    this.heroSection.addEventListener('pointerleave', handleLeave, { passive: true });
    this.heroSection.addEventListener('touchend', handleLeave, { passive: true });
    this.heroSection.addEventListener('touchcancel', handleLeave, { passive: true });
    window.addEventListener('blur', handleLeave);

    // Listen to reduced motion changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      if (this.prefersReducedMotion) {
        handleLeave();
      }
    });
  }

  calculateTargets(clientX, clientY) {
    if (!this.wrapper) return;

    const rect = this.wrapper.getBoundingClientRect();
    const heroRect = this.heroSection.getBoundingClientRect();

    // Center of baby's face (approx 32% from top of the wrapper)
    const faceCenterX = rect.left + rect.width * 0.5;
    const faceCenterY = rect.top + rect.height * 0.32;

    const dx = clientX - faceCenterX;
    const dy = clientY - faceCenterY;

    // Angle and distance to cursor
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 1. Eye pupil offsets (constrained smoothly by sigmoid/tanh curve)
    const normalizedDist = Math.min(1, distance / (heroRect.width * 0.45));
    const pupilDist = normalizedDist * this.MAX_PUPIL_RADIUS;

    this.target.pupilX = Math.cos(angle) * pupilDist;
    this.target.pupilY = Math.sin(angle) * pupilDist;

    // 2. Head 3D tilt (subtle, constrained angles)
    const normX = Math.max(-1, Math.min(1, dx / (heroRect.width * 0.5)));
    const normY = Math.max(-1, Math.min(1, dy / (heroRect.height * 0.5)));

    this.target.tiltY = normX * this.MAX_TILT_Y;
    this.target.tiltX = -normY * this.MAX_TILT_X;
    this.target.tiltZ = normX * this.MAX_TILT_Z;
  }

  startLoop() {
    const tick = () => {
      // Lerp current values toward targets
      const factor = this.isPointerInside ? this.LERP_FACTOR : 0.08;

      this.current.pupilX += (this.target.pupilX - this.current.pupilX) * factor;
      this.current.pupilY += (this.target.pupilY - this.current.pupilY) * factor;
      this.current.tiltX += (this.target.tiltX - this.current.tiltX) * factor;
      this.current.tiltY += (this.target.tiltY - this.current.tiltY) * factor;
      this.current.tiltZ += (this.target.tiltZ - this.current.tiltZ) * factor;

      // Apply transforms if awake
      if (!this.isSleeping && !this.prefersReducedMotion) {
        if (this.pupilLeft) {
          this.pupilLeft.setAttribute('transform', `translate(${this.current.pupilX.toFixed(2)}, ${this.current.pupilY.toFixed(2)})`);
        }
        if (this.pupilRight) {
          this.pupilRight.setAttribute('transform', `translate(${this.current.pupilX.toFixed(2)}, ${this.current.pupilY.toFixed(2)})`);
        }
        if (this.wrapper) {
          this.wrapper.style.transform = `perspective(700px) rotateX(${this.current.tiltX.toFixed(2)}deg) rotateY(${this.current.tiltY.toFixed(2)}deg) rotateZ(${this.current.tiltZ.toFixed(2)}deg)`;
        }
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  setSleeping(sleeping) {
    this.isSleeping = sleeping;

    if (sleeping) {
      // Return head & eyes to neutral resting position
      this.target.pupilX = 0;
      this.target.pupilY = 0;
      this.target.tiltX = 0;
      this.target.tiltY = 0;
      this.target.tiltZ = 0;
      this.current.pupilX = 0;
      this.current.pupilY = 0;
      this.current.tiltX = 0;
      this.current.tiltY = 0;
      this.current.tiltZ = 0;

      if (this.pupilLeft) this.pupilLeft.setAttribute('transform', 'translate(0, 0)');
      if (this.pupilRight) this.pupilRight.setAttribute('transform', 'translate(0, 0)');
      if (this.wrapper) {
        this.wrapper.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
        this.wrapper.classList.add('baby-sleeping-breathing');
      }

      // Show sleeping eyelids
      if (this.sleepingEyelids) this.sleepingEyelids.style.opacity = '1';
      if (this.awakeEyes) this.awakeEyes.style.opacity = '0';

      // Show floating Zzz doodle
      if (this.zzzDoodle) this.zzzDoodle.style.opacity = '1';
    } else {
      // Wake up Babu
      if (this.wrapper) {
        this.wrapper.classList.remove('baby-sleeping-breathing');
      }

      // Hide sleeping eyelids, show awake eyes
      if (this.sleepingEyelids) this.sleepingEyelids.style.opacity = '0';
      if (this.awakeEyes) this.awakeEyes.style.opacity = '1';

      // Hide floating Zzz doodle
      if (this.zzzDoodle) this.zzzDoodle.style.opacity = '0';
    }
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}

let heroBabyInstance = null;

export function initHeroBaby() {
  if (!heroBabyInstance) {
    heroBabyInstance = new HeroBabyController();
  }
  return heroBabyInstance;
}

export function setHeroBabySleeping(isSleeping) {
  if (heroBabyInstance) {
    heroBabyInstance.setSleeping(isSleeping);
  }
}
