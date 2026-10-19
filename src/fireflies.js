// ============================================================================
// NIGHT MODE FIREFLIES EFFECT
// Lightweight, buttery 60fps canvas-based fireflies overlay.
// Active strictly when theme === 'night'.
// - Tiny glowing bodies with subtle warm-yellow/lime radial glow halo
// - Organic fluttering, hovering, and gentle drifting across the viewport
// - Smooth alpha fading when transitioning in and out of night mode
// - Zero pointer events, strictly non-blocking for clicks and scrolling
// ============================================================================

export class FirefliesController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isActive = false;
    this.animId = null;
    this.fadeAlpha = 0; // for smooth crossfade into/out of night mode
    this.targetAlpha = 0;
    this.lastTime = 0;

    this.onResize = this.onResize.bind(this);
    this.render = this.render.bind(this);
    this.onThemeChange = this.onThemeChange.bind(this);

    this.init();
  }

  init() {
    // Check if canvas already exists
    let canvas = document.getElementById('night-fireflies-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'night-fireflies-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '35'; // above background content, below modals/drawers (z-50)
      canvas.style.opacity = '1';
      document.body.appendChild(canvas);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    this.updateDimensions();
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('paci-theme-changed', this.onThemeChange);

    // Initial check from document attribute
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

  onResize() {
    this.updateDimensions();
  }

  createParticles() {
    // 22-30 fireflies for balanced aesthetic without visual clutter
    const count = window.innerWidth < 768 ? 16 : 28;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        // Base tiny dot radius (1.5px - 2.5px)
        radius: 1.5 + Math.random() * 1.0,
        // Glow radius around the body (8px - 16px)
        glowRadius: 10 + Math.random() * 8,
        // Smooth drifting velocity
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        // Organic sinusoidal flutter phase & speed
        angle: Math.random() * Math.PI * 2,
        angularSpeed: 0.015 + Math.random() * 0.02,
        // Pulsing glow luminance
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.025 + Math.random() * 0.035,
        // Hue slight variation: warm golden yellow to fresh firefly chartreuse
        // #ffd84d (warm yellow) to #b8e986 (lime green firefly)
        hue: Math.random() > 0.4 ? 'rgba(255, 230, 90,' : 'rgba(200, 245, 110,'
      });
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
    if (!this.isActive) {
      this.isActive = true;
      if (this.particles.length === 0) {
        this.createParticles();
      }
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

    // Smoothly interpolate master fadeAlpha
    this.fadeAlpha += (this.targetAlpha - this.fadeAlpha) * 0.06;

    // When fully faded out in day mode, stop animation loop to preserve battery & CPU
    if (this.fadeAlpha < 0.005 && this.targetAlpha === 0) {
      this.fadeAlpha = 0;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.isActive = false;
      return;
    }

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update fluttering motion
      p.angle += p.angularSpeed;
      p.pulse += p.pulseSpeed;

      // Slight natural wind wander
      p.x += p.vx + Math.cos(p.angle) * 0.4;
      p.y += p.vy + Math.sin(p.angle * 0.8) * 0.35;

      // Wrap around screen borders smoothly
      if (p.x < -20) p.x = this.width + 20;
      if (p.x > this.width + 20) p.x = -20;
      if (p.y < -20) p.y = this.height + 20;
      if (p.y > this.height + 20) p.y = -20;

      // Pulsing brightness: oscillates between 0.35 and 0.95
      const pulseFactor = 0.65 + 0.35 * Math.sin(p.pulse);
      const alpha = this.fadeAlpha * pulseFactor;

      if (alpha <= 0.01) continue;

      // 1. Draw outer soft radial glow around the body
      const outerGlow = this.ctx.createRadialGradient(
        p.x, p.y, p.radius * 0.5,
        p.x, p.y, p.glowRadius
      );
      outerGlow.addColorStop(0, `${p.hue} ${(0.6 * alpha).toFixed(3)})`);
      outerGlow.addColorStop(0.35, `${p.hue} ${(0.22 * alpha).toFixed(3)})`);
      outerGlow.addColorStop(1, `${p.hue} 0)`);

      this.ctx.fillStyle = outerGlow;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 2. Draw tiny bright glowing core (dot)
      this.ctx.fillStyle = `rgba(255, 255, 235, ${(0.95 * alpha).toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.animId = requestAnimationFrame(this.render);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
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
