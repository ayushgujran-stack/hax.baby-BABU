// ============================================================================
// INTRO SCROLL-CONTROLLED ANIMATION
// Controls the sequential frame animation from the `scroll` folder:
// - 300 sequential JPG frames: ezgif-frame-001.jpg to ezgif-frame-300.jpg
// - Smooth scroll-driven scrubbing (scroll down advances, scroll up reverses)
// - Minimal, elegant desktop text: "The story of the baby." (hidden on mobile)
// - High performance HTML5 Canvas rendering with intelligent frame caching
// - Once-per-visit behavior: dismisses once completed; scrolling to top
//   does not re-trigger it. Reappears only on a new visit/reload.
// ============================================================================

const TOTAL_FRAMES = 300;
const FRAME_BASE_PATH = '/scroll/ezgif-frame-';

function getFramePath(index) {
  // index is 0 to 299 -> '001' to '300'
  const frameNumber = String(index + 1).padStart(3, '0');
  return `${FRAME_BASE_PATH}${frameNumber}.jpg`;
}

export function initIntroScroll() {
  const container = document.getElementById('intro-scroll-container');
  const sticky = document.getElementById('intro-scroll-sticky');
  const canvas = document.getElementById('intro-scroll-canvas');
  const textEl = document.getElementById('intro-scroll-text');

  if (!container || !canvas) {
    return { dismiss: () => {} };
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Frame storage and loading state
  const frames = new Array(TOTAL_FRAMES);
  let currentRenderedIndex = -1;
  let isDismissed = false;
  let isTicking = false;

  // Render a specific frame index
  function renderFrame(targetIndex) {
    if (isDismissed || targetIndex === currentRenderedIndex) return;

    // Find the best available frame (exact or closest loaded fallback)
    let imgToDraw = frames[targetIndex];
    if (!imgToDraw) {
      // Find closest loaded frame
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        if (targetIndex - offset >= 0 && frames[targetIndex - offset]) {
          imgToDraw = frames[targetIndex - offset];
          break;
        }
        if (targetIndex + offset < TOTAL_FRAMES && frames[targetIndex + offset]) {
          imgToDraw = frames[targetIndex + offset];
          break;
        }
      }
    }

    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      ctx.drawImage(imgToDraw, 0, 0, canvas.width, canvas.height);
      currentRenderedIndex = targetIndex;
    }
  }

  // Preload frame 0 immediately to display without any delay
  const firstFrame = new Image();
  firstFrame.src = getFramePath(0);
  firstFrame.onload = () => {
    frames[0] = firstFrame;
    renderFrame(0);
  };

  // Progressive background preloader
  // Phase 1: Load every 10th frame across the timeline (0, 10, 20... 290, 299)
  // Phase 2: Fill in all remaining frames in sequential batches
  function startPreloading() {
    const priorityIndices = [];
    for (let i = 0; i < TOTAL_FRAMES; i += 10) {
      if (i !== 0) priorityIndices.push(i);
    }
    if (!priorityIndices.includes(TOTAL_FRAMES - 1)) {
      priorityIndices.push(TOTAL_FRAMES - 1);
    }

    const remainingIndices = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (i !== 0 && !priorityIndices.includes(i)) {
        remainingIndices.push(i);
      }
    }

    const queue = [...priorityIndices, ...remainingIndices];
    const CONCURRENCY = 8;
    let activeWorkers = 0;

    function next() {
      if (queue.length === 0 || isDismissed) return;
      while (activeWorkers < CONCURRENCY && queue.length > 0) {
        const idx = queue.shift();
        activeWorkers++;
        const img = new Image();
        img.src = getFramePath(idx);
        img.onload = () => {
          frames[idx] = img;
          activeWorkers--;
          // If user is currently near this frame, render it
          if (currentRenderedIndex === -1 || Math.abs(currentRenderedIndex - idx) <= 2) {
            renderFrame(currentRenderedIndex === -1 ? 0 : currentRenderedIndex);
          }
          next();
        };
        img.onerror = () => {
          activeWorkers--;
          next();
        };
      }
    }

    next();
  }

  // Calculate scroll progress and update frame
  function updateScroll() {
    if (isDismissed) return;

    const rect = container.getBoundingClientRect();
    const headerHeight = 80; // Fixed header height (h-20)
    const viewportHeight = window.innerHeight;

    // The sticky element is active from container top = headerHeight
    // until container bottom = viewportHeight
    const scrolled = headerHeight - rect.top;
    const scrollableDistance = rect.height - (viewportHeight - headerHeight);

    if (scrollableDistance <= 0) return;

    const progress = Math.min(1, Math.max(0, scrolled / scrollableDistance));
    const targetIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.floor(progress * (TOTAL_FRAMES - 1))));

    renderFrame(targetIndex);

    // Kinetic scrolling text animation
    const textTrack = document.getElementById('intro-text-track');
    const actCards = document.querySelectorAll('.intro-act-card');
    const stepIndicators = document.querySelectorAll('#intro-step-indicators > div');
    const CARD_HEIGHT = 240;

    if (textTrack && actCards.length > 0) {
      // Smooth continuous vertical translation of text reel
      const totalShift = (actCards.length - 1) * CARD_HEIGHT;
      const currentY = progress * totalShift;
      textTrack.style.transform = `translate3d(0, -${currentY}px, 0)`;

      // Proximity-based smooth opacity, scaling, and subtle depth blur
      const currentFloatingAct = progress * (actCards.length - 1);
      actCards.forEach((card, idx) => {
        const dist = Math.abs(currentFloatingAct - idx);
        const opacity = Math.max(0.18, 1 - dist * 0.82);
        const scale = Math.max(0.92, 1 - dist * 0.08);
        const translateY = dist > 0.1 ? (idx < currentFloatingAct ? -6 : 6) * dist : 0;
        card.style.opacity = opacity.toFixed(3);
        card.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`;
        card.style.filter = dist > 0.5 ? `blur(${Math.min(2.5, (dist - 0.5) * 3).toFixed(1)}px)` : 'none';
      });

      // Update chapter step indicators
      const activeStep = Math.min(stepIndicators.length - 1, Math.round(currentFloatingAct));
      stepIndicators.forEach((pill, idx) => {
        if (idx === activeStep) {
          pill.className = 'h-2 w-8 rounded-full border border-ink-black bg-ink-black dark:bg-paper-cream transition-all duration-200';
        } else {
          pill.className = 'h-2 w-3 rounded-full border border-ink-black/40 bg-transparent transition-all duration-200';
        }
      });
    }

    // Dismissal detection:
    // Once the user has scrolled through the animation (progress >= 0.99)
    // AND the container has scrolled off the top of the viewport (rect.bottom <= headerHeight):
    // The user has transitioned fully into the homepage content!
    if (progress >= 0.99 && rect.bottom <= headerHeight + 5) {
      dismissIntro();
    }
  }

  function handleScroll() {
    if (!isTicking) {
      requestAnimationFrame(() => {
        updateScroll();
        isTicking = false;
      });
      isTicking = true;
    }
  }

  // Dismiss the intro section cleanly so it never reappears during this visit
  function dismissIntro() {
    if (isDismissed) return;
    isDismissed = true;

    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleScroll);

    // Measure container height to adjust scroll offset seamlessly
    const containerHeight = container.offsetHeight;
    const currentScrollY = window.scrollY;

    // Hide container
    container.style.display = 'none';

    // Adjust scroll position so the user experiences zero visual jump
    const adjustedScrollY = Math.max(0, currentScrollY - containerHeight);
    window.scrollTo({
      top: adjustedScrollY,
      behavior: 'instant'
    });
  }

  // Start listening to scroll and resize
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });

  // Initial draw and kick off preloading
  updateScroll();
  // Start progressive batch preloading ONLY when the user begins scrolling or interacting
  let preloadStarted = false;
  function triggerPreloadOnInteraction() {
    if (preloadStarted) return;
    preloadStarted = true;
    window.removeEventListener('scroll', triggerPreloadOnInteraction);
    window.removeEventListener('touchstart', triggerPreloadOnInteraction);
    window.removeEventListener('wheel', triggerPreloadOnInteraction);
    startPreloading();
  }

  // If user is already scrolled, or as soon as they scroll/touch, begin preloading
  if (window.scrollY > 10) {
    triggerPreloadOnInteraction();
  } else {
    window.addEventListener('scroll', triggerPreloadOnInteraction, { passive: true });
    window.addEventListener('touchstart', triggerPreloadOnInteraction, { passive: true });
    window.addEventListener('wheel', triggerPreloadOnInteraction, { passive: true });
  }

  // Expose dismiss function for external internal navigations
  return {
    dismiss: dismissIntro,
    isDismissed: () => isDismissed
  };
}
