// ============================================================================
// SCROLL-DRIVEN TIMELINE ANIMATION: "MY JOURNEY TO WORLD DOMINATION"
//
// Features:
// 1. Horizontal progressive timeline track (draws from Card 1 to Card 5 on scroll).
// 2. Playful pop-up sequential card animation (scale & upward movement with spring ease).
// 3. Subtle alternating pattern: Cards 1, 3, 5 above midline, Cards 2, 4 below midline.
// 4. Vertical connectors that grow outward from the main timeline toward each card.
// 5. Neobrutalist timeline node markers at each milestone junction.
// 6. Responsive vertical track adaptation on mobile (< md).
// 7. Full bidirectional synchronization with scroll position (scrolling up reverses).
// 8. Respects prefers-reduced-motion.
// ============================================================================

export class JourneyTimelineController {
  constructor() {
    this.section = document.getElementById('domination');
    this.container = document.getElementById('journey-timeline-container');
    this.svg = document.getElementById('journey-timeline-svg');
    this.cards = Array.from(document.querySelectorAll('.journey-timeline-card'));

    if (!this.section || !this.container || this.cards.length < 5) return;

    // Card initial rotation offsets (preserves exact hand-drawn tilts)
    this.cardRotations = [-2, 2, -1, 3, -2];

    // Reduced motion check
    this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Internal state
    this.isDesktop = window.innerWidth >= 768;
    this.rafId = null;
    this.lastProgress = -1;

    // Bind methods
    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    this.updateGeometry = this.updateGeometry.bind(this);

    this.init();
  }

  init() {
    // Measure geometry and draw lines
    this.updateGeometry();

    // Attach listeners
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });

    // Initial render
    this.onScroll();
  }

  onResize() {
    this.isDesktop = window.innerWidth >= 768;
    this.updateGeometry();
    this.lastProgress = -1; // force re-render
    this.onScroll();
  }

  updateGeometry() {
    if (!this.container || !this.svg) return;

    const containerRect = this.container.getBoundingClientRect();
    const cWidth = this.container.offsetWidth;
    const cHeight = this.container.offsetHeight;

    if (cWidth === 0 || cHeight === 0) return;

    this.svg.setAttribute('viewBox', `0 0 ${cWidth} ${cHeight}`);

    if (this.isDesktop) {
      this.updateDesktopGeometry(cWidth, cHeight);
    } else {
      this.updateMobileGeometry(cWidth, cHeight);
    }
  }

  updateDesktopGeometry(cWidth, cHeight) {
    const yMid = cHeight / 2;
    this.yMid = yMid;

    // Measure horizontal centers and connector targets for all 5 cards
    this.cardCoords = this.cards.map((card, i) => {
      const left = card.offsetLeft;
      const width = card.offsetWidth;
      const top = card.offsetTop;
      const height = card.offsetHeight;

      const centerX = left + width / 2;
      // Cards 0, 2, 4 (Phases 1, 3, 5) are above yMid -> connect to card bottom
      // Cards 1, 3 (Phases 2, 4) are below yMid -> connect to card top
      const isAbove = i % 2 === 0;
      const targetY = isAbove ? top + height : top;

      return { centerX, targetY, isAbove };
    });

    const startX = this.cardCoords[0].centerX;
    const endX = this.cardCoords[4].centerX;
    this.totalLineLength = endX - startX;

    // Main line path: from startX to endX at yMid
    const linePath = `M ${startX} ${yMid} L ${endX} ${yMid}`;
    const desktopGuide = document.getElementById('timeline-desktop-guide');
    const desktopLine = document.getElementById('timeline-desktop-line');

    if (desktopGuide) desktopGuide.setAttribute('d', linePath);
    if (desktopLine) {
      desktopLine.setAttribute('d', linePath);
      desktopLine.style.strokeDasharray = `${this.totalLineLength}`;
      desktopLine.style.strokeDashoffset = `${this.totalLineLength}`;
    }

    // Vertical connectors & markers
    this.cardCoords.forEach((coord, i) => {
      const connPath = `M ${coord.centerX} ${yMid} L ${coord.centerX} ${coord.targetY}`;
      const conn = document.getElementById(`timeline-connector-${i + 1}`);
      const marker = document.getElementById(`timeline-marker-${i + 1}`);

      const connLength = Math.abs(coord.targetY - yMid);
      if (conn) {
        conn.setAttribute('d', connPath);
        conn.style.strokeDasharray = `${connLength}`;
        conn.style.strokeDashoffset = `${connLength}`;
        coord.connLength = connLength;
      }

      if (marker) {
        marker.style.transform = `translate(${coord.centerX}px, ${yMid}px) scale(0)`;
        marker.style.transformOrigin = 'center';
      }
    });
  }

  updateMobileGeometry(cWidth, cHeight) {
    // In mobile, vertical track along left side (around left = 24px)
    const xTrack = 24;
    this.xTrack = xTrack;

    this.cardCoords = this.cards.map((card, i) => {
      const top = card.offsetTop;
      const height = card.offsetHeight;
      const left = card.offsetLeft;

      const centerY = top + height / 2;
      const targetX = left; // connect to left edge of card

      return { centerY, targetX };
    });

    const startY = this.cardCoords[0].centerY;
    const endY = this.cardCoords[4].centerY;
    this.totalLineLength = endY - startY;

    const linePath = `M ${xTrack} ${startY} L ${xTrack} ${endY}`;
    const mobileGuide = document.getElementById('timeline-mobile-guide');
    const mobileLine = document.getElementById('timeline-mobile-line');

    if (mobileGuide) mobileGuide.setAttribute('d', linePath);
    if (mobileLine) {
      mobileLine.setAttribute('d', linePath);
      mobileLine.style.strokeDasharray = `${this.totalLineLength}`;
      mobileLine.style.strokeDashoffset = `${this.totalLineLength}`;
    }

    this.cardCoords.forEach((coord, i) => {
      const connPath = `M ${xTrack} ${coord.centerY} L ${coord.targetX} ${coord.centerY}`;
      const conn = document.getElementById(`timeline-mconnector-${i + 1}`);
      const marker = document.getElementById(`timeline-mmarker-${i + 1}`);

      const connLength = Math.abs(coord.targetX - xTrack);
      if (conn) {
        conn.setAttribute('d', connPath);
        conn.style.strokeDasharray = `${connLength}`;
        conn.style.strokeDashoffset = `${connLength}`;
        coord.connLength = connLength;
      }

      if (marker) {
        marker.style.transform = `translate(${xTrack}px, ${coord.centerY}px) scale(0)`;
        marker.style.transformOrigin = 'center';
      }
    });
  }

  onScroll() {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  calculateProgress() {
    if (this.prefersReducedMotion) return 1.0;

    const rect = this.container.getBoundingClientRect();
    const winH = window.innerHeight || 800;

    // Animation begins as the timeline container enters viewport lower half
    const startTrigger = winH * 0.85;
    // Animation reaches completion when timeline container centers in viewport
    const endTrigger = winH * 0.20;

    const totalDistance = startTrigger - endTrigger;
    const current = startTrigger - rect.top;

    return Math.min(1, Math.max(0, current / totalDistance));
  }

  render() {
    const progress = this.calculateProgress();

    // Skip redundant layout updates if progress didn't change meaningfully
    if (Math.abs(progress - this.lastProgress) < 0.001) return;
    this.lastProgress = progress;

    if (this.isDesktop) {
      this.renderDesktop(progress);
    } else {
      this.renderMobile(progress);
    }
  }

  renderDesktop(progress) {
    const desktopLine = document.getElementById('timeline-desktop-line');
    if (desktopLine && this.totalLineLength) {
      // Main horizontal line draws progressively from left to right
      const offset = this.totalLineLength * (1 - progress);
      desktopLine.style.strokeDashoffset = `${offset.toFixed(1)}`;
    }

    // Milestone thresholds across progress [0, 1]
    const milestoneSteps = [
      { start: 0.02, end: 0.18 }, // Card 1 (Year 0)
      { start: 0.20, end: 0.38 }, // Card 2 (Year 1)
      { start: 0.40, end: 0.58 }, // Card 3 (Year 1.5)
      { start: 0.60, end: 0.78 }, // Card 4 (Year 2)
      { start: 0.80, end: 0.98 }  // Card 5 (Today)
    ];

    this.cards.forEach((card, i) => {
      const step = milestoneSteps[i];
      const t = Math.min(1, Math.max(0, (progress - step.start) / (step.end - step.start)));

      // 1. Animate Marker
      const marker = document.getElementById(`timeline-marker-${i + 1}`);
      if (marker) {
        // Marker pops up slightly before the card
        const markerT = Math.min(1, t * 1.5);
        const markerScale = this.calcSpringScale(markerT);
        const coord = this.cardCoords && this.cardCoords[i];
        if (coord) {
          marker.style.transform = `translate(${coord.centerX}px, ${this.yMid}px) scale(${markerScale.toFixed(3)})`;
        }
      }

      // 2. Animate Vertical Connector
      const conn = document.getElementById(`timeline-connector-${i + 1}`);
      const coord = this.cardCoords && this.cardCoords[i];
      if (conn && coord && coord.connLength) {
        const connProgress = Math.min(1, Math.max(0, t * 1.2));
        const connOffset = coord.connLength * (1 - connProgress);
        conn.style.strokeDashoffset = `${connOffset.toFixed(1)}`;
      }

      // 3. Animate Card Pop-up
      this.animateCardPop(card, i, t);
    });
  }

  renderMobile(progress) {
    const mobileLine = document.getElementById('timeline-mobile-line');
    if (mobileLine && this.totalLineLength) {
      const offset = this.totalLineLength * (1 - progress);
      mobileLine.style.strokeDashoffset = `${offset.toFixed(1)}`;
    }

    const milestoneSteps = [
      { start: 0.02, end: 0.18 },
      { start: 0.20, end: 0.38 },
      { start: 0.40, end: 0.58 },
      { start: 0.60, end: 0.78 },
      { start: 0.80, end: 0.98 }
    ];

    this.cards.forEach((card, i) => {
      const step = milestoneSteps[i];
      const t = Math.min(1, Math.max(0, (progress - step.start) / (step.end - step.start)));

      const marker = document.getElementById(`timeline-mmarker-${i + 1}`);
      const coord = this.cardCoords && this.cardCoords[i];
      if (marker && coord) {
        const markerT = Math.min(1, t * 1.5);
        const markerScale = this.calcSpringScale(markerT);
        marker.style.transform = `translate(${this.xTrack}px, ${coord.centerY}px) scale(${markerScale.toFixed(3)})`;
      }

      const conn = document.getElementById(`timeline-mconnector-${i + 1}`);
      if (conn && coord && coord.connLength) {
        const connProgress = Math.min(1, Math.max(0, t * 1.2));
        const connOffset = coord.connLength * (1 - connProgress);
        conn.style.strokeDashoffset = `${connOffset.toFixed(1)}`;
      }

      this.animateCardPop(card, i, t);
    });
  }

  calcSpringScale(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Spring overshoot curve: gently peaks at ~1.08x then settles into 1.00x
    return Math.sin(t * Math.PI / 2) + 0.1 * Math.sin(t * Math.PI);
  }

  animateCardPop(card, index, t) {
    const baseRotation = this.cardRotations[index] || 0;

    if (t <= 0) {
      card.style.opacity = '0';
      card.style.transform = `rotate(${baseRotation}deg) scale(0.82) translateY(24px)`;
      card.style.pointerEvents = 'none';
      return;
    }

    if (t >= 1) {
      card.style.opacity = '1';
      card.style.transform = `rotate(${baseRotation}deg) scale(1) translateY(0)`;
      card.style.pointerEvents = 'auto';
      return;
    }

    card.style.pointerEvents = 'auto';
    // Opacity fades up rapidly in first 35% of progress
    const opacity = Math.min(1, t * 3.2);
    // Playful spring curve for scale
    const scale = 0.82 + 0.18 * (Math.sin(t * Math.PI / 2) + 0.12 * Math.sin(t * Math.PI));
    // Upward spring translation
    const translateY = 24 * (1 - t);

    card.style.opacity = opacity.toFixed(3);
    card.style.transform = `rotate(${baseRotation}deg) scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`;
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }
}

let journeyTimelineInstance = null;

export function initJourneyTimeline() {
  if (!journeyTimelineInstance) {
    journeyTimelineInstance = new JourneyTimelineController();
  }
  return journeyTimelineInstance;
}

export function getJourneyTimeline() {
  return journeyTimelineInstance;
}
