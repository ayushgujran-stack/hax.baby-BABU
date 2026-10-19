// ============================================================================
// NIGHT MODE SECTION-AWARE FIREFLIES EFFECT
// Lightweight, buttery 60fps canvas-based fireflies overlay.
// Active strictly when theme === 'night'.
//
// Refined User Requirements:
// 1. "few fireflies flying all over the page" -> sparse, delicate count (6-9 fireflies max)
// 2. "tiny dots and slight glow around the radius" -> 1.5px-2px core with subtle warm halo
// 3. "when the user scrolls to the next section new fireflies must appear the old ones should go"
//    -> Detects current section in viewport. As the user transitions between sections,
//       existing fireflies disperse/fade out and a new batch spawns in fresh locations.
// ============================================================================

export class FirefliesController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isActive = false;
    this.animId = null;
    this.fadeAlpha = 0; // master crossfade for night/day transition
    this.targetAlpha = 0;
    this.lastTime = 0;
    this.currentSectionId = null;
    this.sections = [];

    this.onResize = this.onResize.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.render = this.render.bind(this);
    this.onThemeChange = this.onThemeChange.bind(this);

    this.init();
  }

  init() {
    let canvas = document.getElementById('night-fireflies-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'night-fireflies-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '35'; // above background graphics, below interactive modals/drawers
      canvas.style.opacity = '1';
      document.body.appendChild(canvas);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    this.updateDimensions();
    this.cacheSections();

    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('paci-theme-changed', this.onThemeChange);

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'night') {
      this.activate();
    }
  }

  updateDimensions() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.dpr = dpr;
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  cacheSections() {
    // Collect all major page sections
    const sectionEls = document.querySelectorAll('section[id], section');
    this.sections = Array.from(sectionEls).map((el, idx) => ({
      el,
      id: el.id || `section-${idx}`
    }));
  }

  onResize() {
    this.updateDimensions();
    this.cacheSections();
  }

  detectActiveSection() {
    const viewportMiddle = window.innerHeight * 0.45;
    for (let i = 0; i < this.sections.length; i++) {
      const rect = this.sections[i].el.getBoundingClientRect();
      if (rect.top <= viewportMiddle && rect.bottom >= viewportMiddle) {
        return this.sections[i].id;
      }
    }
    // Fallback: check which section has largest visible portion
    let bestId = null;
    let maxVisible = -Infinity;
    for (let i = 0; i < this.sections.length; i++) {
      const rect = this.sections[i].el.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      if (visibleHeight > maxVisible && visibleHeight > 50) {
        maxVisible = visibleHeight;
        bestId = this.sections[i].id;
      }
    }
    return bestId || (this.sections[0] ? this.sections[0].id : 'default');
  }

  onScroll() {
    if (!this.isActive || this.targetAlpha === 0) return;

    const newSectionId = this.detectActiveSection();
    if (newSectionId && newSectionId !== this.currentSectionId) {
      this.currentSectionId = newSectionId;
      this.transitionSectionFireflies();
    }
  }

  /**
   * Smoothly dispels existing fireflies and introduces a few fresh fireflies for the new section
   */
  transitionSectionFireflies() {
    // 1. Mark existing particles to dissolve away naturally with outward drift
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.dissolving = true;
      p.dissolveSpeed = 0.035 + Math.random() * 0.03;
      p.vx *= 1.8;
      p.vy *= 1.8;
    }

    // 2. Spawn a small, delicate batch of 6 - 8 fireflies for this new section
    const newCount = window.innerWidth < 768 ? 5 : 7;
    for (let i = 0; i < newCount; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(isNewborn = false) {
    // Keep it few and tiny: radius 1.4px - 2.1px with a soft 9px - 15px glow
    const radius = 1.4 + Math.random() * 0.7;
    const glowRadius = 9 + Math.random() * 6;

    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius,
      glowRadius,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: 0.012 + Math.random() * 0.018,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03,
      // Golden sunshine yellow (#FFD84D) or gentle lime green firefly tint (#B8E986)
      hue: Math.random() > 0.4 ? 'rgba(255, 225, 80,' : 'rgba(195, 245, 115,',
      // Section transition lifecycle
      opacity: isNewborn ? 0 : 1, // newborns fade in smoothly
      birthFadeSpeed: 0.025 + Math.random() * 0.025,
      dissolving: false,
      dissolveSpeed: 0.03
    };
  }

  spawnInitialBatch() {
    const count = window.innerWidth < 768 ? 5 : 7;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(false));
    }
  }

  onThemeChange(e) {
    const isNight = e.detail?.isNight;
    if (isNight) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  activate() {
    this.targetAlpha = 1;
    this.currentSectionId = this.detectActiveSection();
    if (!this.isActive) {
      this.isActive = true;
      this.spawnInitialBatch();
      this.lastTime = performance.now();
      cancelAnimationFrame(this.animId);
      this.animId = requestAnimationFrame(this.render);
    }
  }

  deactivate() {
    this.targetAlpha = 0;
  }

  render(now) {
    if (!this.isActive) return;

    // Smoothly interpolate master fadeAlpha (night/day transition)
    this.fadeAlpha += (this.targetAlpha - this.fadeAlpha) * 0.06;

    if (this.fadeAlpha < 0.005 && this.targetAlpha === 0) {
      this.fadeAlpha = 0;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.particles = [];
      this.isActive = false;
      return;
    }

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Handle newborn fade-in
      if (!p.dissolving && p.opacity < 1) {
        p.opacity = Math.min(1, p.opacity + p.birthFadeSpeed);
      }

      // Handle old section fireflies dissolving
      if (p.dissolving) {
        p.opacity -= p.dissolveSpeed;
        if (p.opacity <= 0.001) {
          this.particles.splice(i, 1);
          continue;
        }
      }

      // Update gentle organic fluttering
      p.angle += p.angularSpeed;
      p.pulse += p.pulseSpeed;

      p.x += p.vx + Math.cos(p.angle) * 0.35;
      p.y += p.vy + Math.sin(p.angle * 0.8) * 0.3;

      // Screen edge boundary wrapping
      if (p.x < -20) p.x = this.width + 20;
      if (p.x > this.width + 20) p.x = -20;
      if (p.y < -20) p.y = this.height + 20;
      if (p.y > this.height + 20) p.y = -20;

      // Combined alpha calculation: master fade * particle section opacity * subtle pulse
      const pulseFactor = 0.7 + 0.3 * Math.sin(p.pulse);
      const alpha = this.fadeAlpha * p.opacity * pulseFactor;

      if (alpha <= 0.01) continue;

      // 1. Soft radial glow halo around the body
      const outerGlow = this.ctx.createRadialGradient(
        p.x, p.y, p.radius * 0.4,
        p.x, p.y, p.glowRadius
      );
      outerGlow.addColorStop(0, `${p.hue} ${(0.55 * alpha).toFixed(3)})`);
      outerGlow.addColorStop(0.35, `${p.hue} ${(0.18 * alpha).toFixed(3)})`);
      outerGlow.addColorStop(1, `${p.hue} 0)`);

      this.ctx.fillStyle = outerGlow;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 2. Tiny bright warm-white body center
      this.ctx.fillStyle = `rgba(255, 255, 235, ${(0.92 * alpha).toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.animId = requestAnimationFrame(this.render);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('paci-theme-changed', this.onThemeChange);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

let firefliesInstance = null;

export function initFireflies() {
  if (!firefliesInstance && typeof window !== 'undefined') {
    firefliesInstance = new FirefliesController();
  }
  return firefliesInstance;
}
