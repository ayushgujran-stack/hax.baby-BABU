// ============================================================================
// THE PACIFIER CHASE - Interactive Scene Controller
// Babu (CEO) & Tommy (CSO) chase the irresistible pacifier in the garden while Mom knits.
// Features: Cursor leave auto-stop & reset, dog barking, comic jump boing, enlarged sizes.
// ============================================================================

import { sound } from './audio.js';

let chaseSceneController = null;
let pendingNightMode = null;

export function setChaseSceneNightMode(isNight) {
  if (chaseSceneController && chaseSceneController.setNightMode) {
    chaseSceneController.setNightMode(isNight);
  } else {
    pendingNightMode = isNight;
  }
}

export function initChaseScene() {
  const section = document.getElementById('chase-section');
  const arena = document.getElementById('chase-arena');
  if (!section || !arena) return;

  let isNightMode = false;

  const tapPrompt = document.getElementById('chase-tap-prompt');
  const pacifierEl = document.getElementById('chase-pacifier');
  const babuEl = document.getElementById('chase-babu');
  const tommyEl = document.getElementById('chase-tommy');
  const momEl = document.getElementById('chase-mom');

  if (!pacifierEl || !babuEl || !tommyEl) return;

  // Track reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // SVG limb references for Tommy puppy running animation
  const tommyTail = tommyEl.querySelector('#tommy-tail');
  const tommyLegFl = tommyEl.querySelector('#tommy-leg-fl');
  const tommyLegFr = tommyEl.querySelector('#tommy-leg-fr');
  const tommyLegBl = tommyEl.querySelector('#tommy-leg-bl');

  // Scene state
  let hasStarted = false;
  let isPointerInside = false;
  let isDragging = false;
  let arenaRect = arena.getBoundingClientRect();

  // Reset & Revert animation state
  let isResetting = false;
  let resetProgress = 0;
  let resetFrom = {
    paci: { x: 0, y: 0 },
    babu: { x: 0, y: 0 },
    tommy: { x: 0, y: 0 }
  };

  // Barking timer
  let barkTimer = 1.2;

  // Enlarged character dimensions
  const PADDING = 30;
  const PACI_SIZE = 70;
  const BABU_WIDTH = 120;
  const BABU_HEIGHT = 160;
  const TOMMY_WIDTH = 170;
  const TOMMY_HEIGHT = 138;

  // Positions and velocities (arena coordinates)
  const paci = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    dodgeVx: 0,
    dodgeVy: 0,
    scale: 1,
    rotation: 0
  };

  const babu = {
    x: 70,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1, // 1 for right, -1 for left
    waddlePhase: 0,
    speed: prefersReducedMotion ? 100 : 180, // toddler run speed
    isMoving: false
  };

  const tommy = {
    x: 200,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    runPhase: 0,
    tailPhase: 0,
    speed: prefersReducedMotion ? 140 : 280, // energetic dog run speed
    state: 'CHASE', // 'CHASE' | 'CROUCH' | 'LEAP' | 'LAND'
    stateTimer: 0,
    jumpCooldown: 1.5,
    leapStartX: 0,
    leapStartY: 0,
    leapTargetX: 0,
    leapTargetY: 0,
    leapHeight: 0,
    hasDodgedThisLeap: false
  };

  function getHomePositions() {
    arenaRect = arena.getBoundingClientRect();
    const w = arenaRect.width;
    const h = arenaRect.height;
    return {
      paciX: w * 0.5,
      paciY: h * 0.48,
      babuX: Math.max(PADDING + 45, w * 0.13),
      babuY: h - BABU_HEIGHT / 2 - PADDING - 15,
      tommyX: Math.max(PADDING + 45, w * 0.13) + 130,
      tommyY: h - TOMMY_HEIGHT / 2 - PADDING - 12
    };
  }

  // Setup initial coordinates based on arena size
  function resetPositions() {
    const home = getHomePositions();

    paci.x = home.paciX;
    paci.y = home.paciY;
    paci.targetX = paci.x;
    paci.targetY = paci.y;
    paci.vx = 0;
    paci.vy = 0;
    paci.dodgeVx = 0;
    paci.dodgeVy = 0;
    paci.rotation = 0;

    babu.x = home.babuX;
    babu.y = home.babuY;
    babu.facing = 1;
    babu.isMoving = false;

    tommy.x = home.tommyX;
    tommy.y = home.tommyY;
    tommy.facing = 1;
    tommy.state = 'CHASE';
    tommy.jumpCooldown = 1.2;

    renderStaticTransforms();
  }

  function renderStaticTransforms() {
    pacifierEl.style.transform = `translate3d(${paci.x - PACI_SIZE / 2}px, ${paci.y - PACI_SIZE / 2}px, 0)`;
    babuEl.style.transform = `translate3d(${babu.x - BABU_WIDTH / 2}px, ${babu.y - BABU_HEIGHT / 2}px, 0) scaleX(${babu.facing})`;
    tommyEl.style.transform = `translate3d(${tommy.x - TOMMY_WIDTH / 2}px, ${tommy.y - TOMMY_HEIGHT / 2}px, 0) scaleX(${tommy.facing})`;
  }

  resetPositions();

  // Resize listener
  const handleResize = () => {
    arenaRect = arena.getBoundingClientRect();
    if (!hasStarted) {
      resetPositions();
    } else {
      paci.x = Math.max(PADDING, Math.min(arenaRect.width - PADDING, paci.x));
      paci.y = Math.max(PADDING, Math.min(arenaRect.height - PADDING, paci.y));
      paci.targetX = paci.x;
      paci.targetY = paci.y;

      babu.x = Math.max(PADDING, Math.min(arenaRect.width - PADDING, babu.x));
      babu.y = Math.max(PADDING, Math.min(arenaRect.height - PADDING, babu.y));

      tommy.x = Math.max(PADDING, Math.min(arenaRect.width - PADDING, tommy.x));
      tommy.y = Math.max(PADDING, Math.min(arenaRect.height - PADDING, tommy.y));
    }
  };
  window.addEventListener('resize', handleResize, { passive: true });

  // --------------------------------------------------------------------------
  // GAME START / STOP & REVERT SYSTEM
  // --------------------------------------------------------------------------

  function updatePointerTarget(clientX, clientY) {
    arenaRect = arena.getBoundingClientRect();
    const clampedX = Math.max(PADDING + PACI_SIZE / 2, Math.min(arenaRect.width - PADDING - PACI_SIZE / 2, clientX - arenaRect.left));
    const clampedY = Math.max(PADDING + PACI_SIZE / 2, Math.min(arenaRect.height - PADDING - PACI_SIZE / 2, clientY - arenaRect.top));
    paci.targetX = clampedX;
    paci.targetY = clampedY;
  }

  // Comic Bark Speech Bubble above Tommy
  function showTommyBarkBubble() {
    let bubble = document.getElementById('tommy-bark-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.id = 'tommy-bark-bubble';
      bubble.className = 'absolute z-30 pointer-events-none font-extrabold text-xs md:text-sm px-2.5 py-1 bg-sunshine-yellow border-2 border-ink-black shadow-[2px_2px_0_#292521] rounded-lg rotate-[-6deg] transition-all duration-200 select-none';
      arena.appendChild(bubble);
    }
    const words = ['WOOF! 🐾', 'ARF! 🦴', 'RUFF! 🐶', 'WOOF WOOF!'];
    bubble.textContent = words[Math.floor(Math.random() * words.length)];
    const clampLeft = Math.max(12, Math.min(arenaRect.width - 110, tommy.x - 35));
    const clampTop = Math.max(10, tommy.y - TOMMY_HEIGHT / 2 - 32);
    bubble.style.left = `${clampLeft}px`;
    bubble.style.top = `${clampTop}px`;
    bubble.style.opacity = '1';
    bubble.style.transform = 'scale(1.15) translateY(-4px)';

    clearTimeout(bubble._timer);
    bubble._timer = setTimeout(() => {
      bubble.style.opacity = '0';
      bubble.style.transform = 'scale(0.7) translateY(-12px)';
    }, 650);
  }

  function triggerTommyBark(pitch = 1.0, isDouble = false) {
    sound.init();
    sound.playDogBark(pitch, isDouble);
    showTommyBarkBubble();
  }

  // Start chase
  function startChase(e) {
    if (hasStarted || isNightMode) return;
    hasStarted = true;
    isResetting = false;

    // Hide TAP prompt smoothly
    if (tapPrompt) {
      tapPrompt.style.opacity = '0';
      tapPrompt.style.transform = 'scale(0.4) rotate(-20deg)';
      tapPrompt.style.pointerEvents = 'none';
    }

    // Tommy tail active
    if (tommyTail) {
      tommyTail.classList.remove('tommy-idle-tail');
    }

    arena.classList.add('chase-active');

    sound.init();
    sound.playPop();

    // Dog gives immediate energetic double bark!
    triggerTommyBark(1.05, true);

    barkTimer = 1.4 + Math.random() * 0.8;

    if (e && typeof e.clientX === 'number') {
      updatePointerTarget(e.clientX, e.clientY);
      if (e.pointerType === 'mouse') {
        isPointerInside = true;
        document.body.classList.add('chase-in-arena');
        arena.classList.add('chase-cursor-hide');
      }
    }
  }

  // Stop chase & revert back to initial set section
  function stopChase() {
    if (!hasStarted && !isResetting) return;
    hasStarted = false;
    isPointerInside = false;
    isDragging = false;

    // Restore desktop cursor
    document.body.classList.remove('chase-in-arena');
    arena.classList.remove('chase-active', 'chase-cursor-hide');
    arena.style.touchAction = 'pan-y';

    // Restore idle tail wagging on Tommy
    if (tommyTail) {
      tommyTail.classList.add('tommy-idle-tail');
    }

    // Reset leg positions
    if (tommyLegFl) tommyLegFl.style.transform = 'none';
    if (tommyLegFr) tommyLegFr.style.transform = 'none';
    if (tommyLegBl) tommyLegBl.style.transform = 'none';

    // Restore TAP prompt badge smoothly
    if (tapPrompt) {
      tapPrompt.style.opacity = '1';
      tapPrompt.style.transform = 'scale(1) rotate(0deg)';
      tapPrompt.style.pointerEvents = 'auto';
    }

    // Reset Tommy state
    tommy.state = 'CHASE';
    tommy.stateTimer = 0;
    tommy.leapHeight = 0;
    tommy.hasDodgedThisLeap = false;
    tommy.jumpCooldown = 1.2;

    // Begin smooth glide revert back to home positions
    isResetting = true;
    resetProgress = 0;
    resetFrom = {
      paci: { x: paci.x, y: paci.y },
      babu: { x: babu.x, y: babu.y },
      tommy: { x: tommy.x, y: tommy.y }
    };
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS: Mouse, Touch, and Pointer Leave
  // --------------------------------------------------------------------------

  // Clicking TAP or Pacifier starts chase
  if (tapPrompt) {
    tapPrompt.addEventListener('pointerdown', (e) => {
      if (isNightMode) return;
      e.stopPropagation();
      e.preventDefault();
      startChase(e);
      if (e.pointerType === 'touch') {
        isDragging = true;
        arena.style.touchAction = 'none';
      }
    });
  }

  pacifierEl.addEventListener('pointerdown', (e) => {
    if (isNightMode) return;
    if (!hasStarted) {
      e.stopPropagation();
      e.preventDefault();
      startChase(e);
      if (e.pointerType === 'touch') {
        isDragging = true;
        arena.style.touchAction = 'none';
      }
    } else if (e.pointerType === 'touch') {
      isDragging = true;
      arena.style.touchAction = 'none';
      updatePointerTarget(e.clientX, e.clientY);
    }
  });

  // Clicking Tommy makes him bark and wag his tail on demand!
  if (tommyEl) {
    tommyEl.addEventListener('pointerdown', (e) => {
      if (isNightMode) return;
      e.stopPropagation();
      triggerTommyBark(1.05, true);
      tommy.tailPhase += 20;
    });
  }

  // Arena enter
  arena.addEventListener('pointerenter', (e) => {
    if (!hasStarted || isNightMode) return;
    if (e.pointerType === 'mouse') {
      isPointerInside = true;
      document.body.classList.add('chase-in-arena');
      arena.classList.add('chase-cursor-hide');
      updatePointerTarget(e.clientX, e.clientY);
    }
  });

  // Arena leave: STOP THE GAME AND REVERT BACK!
  arena.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && hasStarted) {
      stopChase();
    }
  });

  section.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && hasStarted) {
      stopChase();
    }
  });

  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && hasStarted) {
      stopChase();
    }
  });

  // Arena pointermove
  arena.addEventListener('pointermove', (e) => {
    if (!hasStarted || isNightMode) return;

    if (e.pointerType === 'mouse') {
      isPointerInside = true;
      document.body.classList.add('chase-in-arena');
      arena.classList.add('chase-cursor-hide');
      updatePointerTarget(e.clientX, e.clientY);
    } else if (e.pointerType === 'touch' && isDragging) {
      // Check if touch moved out of arena
      arenaRect = arena.getBoundingClientRect();
      if (
        e.clientX < arenaRect.left - 20 ||
        e.clientX > arenaRect.right + 20 ||
        e.clientY < arenaRect.top - 20 ||
        e.clientY > arenaRect.bottom + 20
      ) {
        stopChase();
      } else {
        updatePointerTarget(e.clientX, e.clientY);
      }
    }
  });

  // Touch drag end handlers
  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') {
      isDragging = false;
      arena.style.touchAction = 'pan-y';
    }
  };

  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);

  // Clicking anywhere inside arena starts or steers
  arena.addEventListener('pointerdown', (e) => {
    if (!hasStarted) {
      startChase(e);
      if (e.pointerType === 'touch') {
        isDragging = true;
        arena.style.touchAction = 'none';
      }
      return;
    }
    if (e.pointerType === 'touch') {
      isDragging = true;
      arena.style.touchAction = 'none';
      updatePointerTarget(e.clientX, e.clientY);
    }
  });

  // --------------------------------------------------------------------------
  // ANIMATION LOOP (Physics, AI, Tommy Jump & Dodge, Garden Revert)
  // --------------------------------------------------------------------------

  let lastTime = performance.now();
  let animationFrameId = null;

  function tick(now) {
    if (isNightMode) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap delta time at 50ms
    lastTime = now;

    if (hasStarted) {
      updatePacifier(dt);
      updateBabu(dt);
      updateTommy(dt);
    } else if (isResetting) {
      updateRevertGlide(dt);
    } else {
      updateIdleAnimations(now);
    }

    render();
    animationFrameId = requestAnimationFrame(tick);
  }

  // --- REVERT GLIDE ANIMATION (Smooth return to home positions) ---
  function updateRevertGlide(dt) {
    resetProgress += dt * 2.4; // ~420ms smooth ease-out return
    const t = Math.min(1, resetProgress);
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out

    const home = getHomePositions();

    paci.x = resetFrom.paci.x + (home.paciX - resetFrom.paci.x) * ease;
    paci.y = resetFrom.paci.y + (home.paciY - resetFrom.paci.y) * ease;
    paci.targetX = paci.x;
    paci.targetY = paci.y;
    paci.rotation *= (1 - ease);

    babu.x = resetFrom.babu.x + (home.babuX - resetFrom.babu.x) * ease;
    babu.y = resetFrom.babu.y + (home.babuY - resetFrom.babu.y) * ease;
    babu.facing = 1;
    babu.isMoving = false;

    tommy.x = resetFrom.tommy.x + (home.tommyX - resetFrom.tommy.x) * ease;
    tommy.y = resetFrom.tommy.y + (home.tommyY - resetFrom.tommy.y) * ease;
    tommy.facing = 1;

    if (t >= 1) {
      isResetting = false;
      paci.x = home.paciX;
      paci.y = home.paciY;
      babu.x = home.babuX;
      babu.y = home.babuY;
      tommy.x = home.tommyX;
      tommy.y = home.tommyY;
    }
  }

  // --- PACIFIER PHYSICS ---
  function updatePacifier(dt) {
    paci.dodgeVx *= Math.pow(0.025, dt);
    paci.dodgeVy *= Math.pow(0.025, dt);

    paci.x += paci.dodgeVx * dt;
    paci.y += paci.dodgeVy * dt;

    const springFactor = isPointerInside || isDragging ? 26 : 5;
    const dx = paci.targetX - paci.x;
    const dy = paci.targetY - paci.y;

    paci.x += dx * Math.min(springFactor * dt, 1);
    paci.y += dy * Math.min(springFactor * dt, 1);

    // Clamp inside arena boundaries
    const minX = PADDING + PACI_SIZE / 2;
    const maxX = arenaRect.width - PADDING - PACI_SIZE / 2;
    const minY = PADDING + PACI_SIZE / 2;
    const maxY = arenaRect.height - PADDING - PACI_SIZE / 2;

    // Avoid Mom's cozy garden chair corner in top-right
    const momZoneLeft = arenaRect.width - 200;
    const momZoneBottom = 195;
    if (paci.x > momZoneLeft && paci.y < momZoneBottom) {
      paci.y = momZoneBottom + 12;
    }

    paci.x = Math.max(minX, Math.min(maxX, paci.x));
    paci.y = Math.max(minY, Math.min(maxY, paci.y));

    const speed = Math.hypot(dx, dy);
    paci.rotation = Math.sin(lastTime * 0.015) * Math.min(16, speed * 0.1);
    paci.scale = 1 + Math.sin(lastTime * 0.008) * 0.05;
  }

  // --- BABU AI & RUN ANIMATION ---
  function updateBabu(dt) {
    const dx = paci.x - babu.x;
    const dy = paci.y - babu.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 42) {
      babu.isMoving = true;
      const dirX = dx / dist;
      const dirY = dy / dist;

      babu.x += dirX * babu.speed * dt;
      babu.y += dirY * babu.speed * dt;

      if (Math.abs(dx) > 14) {
        babu.facing = dx > 0 ? 1 : -1;
      }

      babu.waddlePhase += dt * 14;
    } else {
      babu.isMoving = false;
      babu.waddlePhase += dt * 3;
    }

    // Clamp Babu inside arena
    const minX = PADDING + BABU_WIDTH / 2;
    const maxX = arenaRect.width - PADDING - BABU_WIDTH / 2;
    const minY = PADDING + BABU_HEIGHT / 2;
    const maxY = arenaRect.height - PADDING - BABU_HEIGHT / 2;

    // Avoid Mom's garden bench in top-right
    const momZoneLeft = arenaRect.width - 205;
    const momZoneBottom = 200;
    if (babu.x > momZoneLeft && babu.y < momZoneBottom) {
      babu.y = momZoneBottom + 8;
    }

    babu.x = Math.max(minX, Math.min(maxX, babu.x));
    babu.y = Math.max(minY, Math.min(maxY, babu.y));
  }

  // --- TOMMY AI, BARKING, JUMP SEQUENCE & DODGE LOGIC ---
  function updateTommy(dt) {
    tommy.jumpCooldown -= dt;
    tommy.tailPhase += dt * 22;

    // Periodic energetic dog bark while chasing!
    if (hasStarted && tommy.state === 'CHASE') {
      barkTimer -= dt;
      if (barkTimer <= 0) {
        triggerTommyBark(0.95 + Math.random() * 0.25, Math.random() < 0.6);
        barkTimer = 1.5 + Math.random() * 1.5; // Bark every 1.5s to 3.0s
      }
    }

    const dx = paci.x - tommy.x;
    const dy = paci.y - tommy.y;
    const dist = Math.hypot(dx, dy);

    switch (tommy.state) {
      case 'CHASE': {
        if (Math.abs(dx) > 14) {
          tommy.facing = dx > 0 ? 1 : -1;
        }

        if (dist > 45) {
          const dirX = dx / dist;
          const dirY = dy / dist;
          tommy.x += dirX * tommy.speed * dt;
          tommy.y += dirY * tommy.speed * dt;
          tommy.runPhase += dt * 18;
        }

        // TRIGGER JUMP CHECK:
        // When Tommy is within catching distance (< 140px) and cooldown is expired
        if (dist < 140 && tommy.jumpCooldown <= 0) {
          tommy.state = 'CROUCH';
          tommy.stateTimer = 0.18; // 180ms crouch
        }
        break;
      }

      case 'CROUCH': {
        // Tommy crouches down into alert pounce pose
        tommy.stateTimer -= dt;
        if (tommy.stateTimer <= 0) {
          // Launch into leap with cartoon boing jump sound!
          tommy.state = 'LEAP';
          tommy.stateTimer = 0.38; // 380ms leap duration
          tommy.leapStartX = tommy.x;
          tommy.leapStartY = tommy.y;
          tommy.leapTargetX = paci.x;
          tommy.leapTargetY = paci.y;
          tommy.hasDodgedThisLeap = false;

          // PLAY JUMP BOING SOUND!
          sound.playJumpBoing();
        }
        break;
      }

      case 'LEAP': {
        tommy.stateTimer -= dt;
        const totalDuration = 0.38;
        const progress = Math.max(0, Math.min(1, 1 - (tommy.stateTimer / totalDuration)));

        // Parabolic jump trajectory
        tommy.x = tommy.leapStartX + (tommy.leapTargetX - tommy.leapStartX) * progress;
        tommy.y = tommy.leapStartY + (tommy.leapTargetY - tommy.leapStartY) * progress;
        tommy.leapHeight = -Math.sin(progress * Math.PI) * 62; // 62px upward leap arc

        // DODGE TRIGGER AT LAST POSSIBLE MOMENT (~62% of leap)
        if (progress > 0.62 && !tommy.hasDodgedThisLeap) {
          tommy.hasDodgedThisLeap = true;
          triggerPacifierDodge(tommy.x, tommy.y);
        }

        if (tommy.stateTimer <= 0) {
          // Tommy lands!
          tommy.state = 'LAND';
          tommy.stateTimer = 0.22;
          tommy.leapHeight = 0;

          // Landing dog-toy miss squeak!
          sound.playSqueak();
        }
        break;
      }

      case 'LAND': {
        tommy.stateTimer -= dt;
        if (tommy.stateTimer <= 0) {
          tommy.state = 'CHASE';
          tommy.jumpCooldown = 2.4 + Math.random() * 1.0;
        }
        break;
      }
    }

    // Clamp Tommy inside arena
    const minX = PADDING + TOMMY_WIDTH / 2;
    const maxX = arenaRect.width - PADDING - TOMMY_WIDTH / 2;
    const minY = PADDING + TOMMY_HEIGHT / 2;
    const maxY = arenaRect.height - PADDING - TOMMY_HEIGHT / 2;

    // Avoid Mom's garden bench in top-right
    const momZoneLeft = arenaRect.width - 205;
    const momZoneBottom = 200;
    if (tommy.x > momZoneLeft && tommy.y < momZoneBottom) {
      tommy.y = momZoneBottom + 8;
    }

    tommy.x = Math.max(minX, Math.min(maxX, tommy.x));
    tommy.y = Math.max(minY, Math.min(maxY, tommy.y));
  }

  // --- PACIFIER ESCAPE / DODGE MECHANIC ---
  function triggerPacifierDodge(attackerX, attackerY) {
    let awayX = paci.x - attackerX;
    let awayY = paci.y - attackerY;
    let dist = Math.hypot(awayX, awayY);

    if (dist < 1) {
      awayX = (Math.random() - 0.5);
      awayY = (Math.random() - 0.5);
      dist = Math.hypot(awayX, awayY);
    }

    awayX /= dist;
    awayY /= dist;

    // Random deflection angle (-45 deg to +45 deg)
    const angleOffset = (Math.random() - 0.5) * (Math.PI * 0.45);
    const cosA = Math.cos(angleOffset);
    const sinA = Math.sin(angleOffset);
    const dodgedDirX = awayX * cosA - awayY * sinA;
    const dodgedDirY = awayX * sinA + awayY * cosA;

    // Dodge impulse velocity
    const dodgeSpeed = 580 + Math.random() * 150;
    paci.dodgeVx = dodgedDirX * dodgeSpeed;
    paci.dodgeVy = dodgedDirY * dodgeSpeed;

    paci.targetX = Math.max(PADDING + PACI_SIZE, Math.min(arenaRect.width - PADDING - PACI_SIZE, paci.x + dodgedDirX * 160));
    paci.targetY = Math.max(PADDING + PACI_SIZE, Math.min(arenaRect.height - PADDING - PACI_SIZE, paci.y + dodgedDirY * 160));

    sound.playPop();
  }

  // --- IDLE ANIMATIONS BEFORE TAP ---
  function updateIdleAnimations(time) {
    paci.scale = 1 + Math.sin(time * 0.004) * 0.05;
    paci.rotation = Math.sin(time * 0.003) * 5;
    babu.waddlePhase = time * 0.002;
    tommy.tailPhase = time * 0.008;
  }

  // --------------------------------------------------------------------------
  // RENDERING & CSS TRANSFORMS
  // --------------------------------------------------------------------------

  function render() {
    // 1. Pacifier
    pacifierEl.style.transform = `translate3d(${paci.x - PACI_SIZE / 2}px, ${paci.y - PACI_SIZE / 2}px, 0) rotate(${paci.rotation}deg) scale(${paci.scale})`;

    // 2. Babu (toddler waddle animation)
    let babuRotate = 0;
    let babuBob = 0;
    let babuSquash = 1;

    if (babu.isMoving && !prefersReducedMotion) {
      babuRotate = Math.sin(babu.waddlePhase) * 7.5;
      babuBob = -Math.abs(Math.sin(babu.waddlePhase)) * 9;
      babuSquash = 1 + Math.sin(babu.waddlePhase * 2) * 0.04;
    } else {
      babuSquash = 1 + Math.sin(babu.waddlePhase * 2) * 0.02;
    }

    babuEl.style.transform = `translate3d(${babu.x - BABU_WIDTH / 2}px, ${babu.y - BABU_HEIGHT / 2 + babuBob}px, 0) scaleX(${babu.facing}) rotate(${babuRotate}deg) scaleY(${babuSquash})`;

    // 3. Tommy
    let tommyRotate = 0;
    let tommyScaleX = tommy.facing;
    let tommyScaleY = 1;
    let tommyYOffset = 0;

    if (tommy.state === 'CROUCH') {
      tommyScaleY = 0.72;
      tommyScaleX = tommy.facing * 1.18;
      tommyYOffset = 10;
    } else if (tommy.state === 'LEAP') {
      tommyYOffset = tommy.leapHeight;
      tommyRotate = tommy.facing * -16;
      tommyScaleY = 1.1;
    } else if (tommy.state === 'LAND') {
      tommyScaleY = 0.76;
      tommyScaleX = tommy.facing * 1.2;
      tommyYOffset = 8;
    } else if (tommy.state === 'CHASE' && !prefersReducedMotion) {
      tommyRotate = Math.sin(tommy.runPhase) * 6;
      tommyYOffset = -Math.abs(Math.sin(tommy.runPhase)) * 7;
      tommyScaleY = 1 + Math.sin(tommy.runPhase * 2) * 0.05;

      if (tommyLegFl) {
        tommyLegFl.style.transform = `rotate(${Math.sin(tommy.runPhase) * 22}deg)`;
      }
      if (tommyLegFr) {
        tommyLegFr.style.transform = `rotate(${-Math.sin(tommy.runPhase) * 22}deg)`;
      }
      if (tommyLegBl) {
        tommyLegBl.style.transform = `rotate(${Math.sin(tommy.runPhase + Math.PI) * 16}deg)`;
      }
    }

    tommyEl.style.transform = `translate3d(${tommy.x - TOMMY_WIDTH / 2}px, ${tommy.y - TOMMY_HEIGHT / 2 + tommyYOffset}px, 0) scaleX(${tommyScaleX}) scaleY(${tommyScaleY}) rotate(${tommyRotate}deg)`;

    // Wag Tommy's tail inside SVG
    if (tommyTail && hasStarted) {
      const tailAngle = Math.sin(tommy.tailPhase) * (tommy.state === 'LEAP' ? 35 : 22);
      tommyTail.style.transform = `rotate(${tailAngle}deg)`;
    }
  }

  // Bedroom Scene night mode controller
  function setNightMode(isNight) {
    isNightMode = isNight;
    const gardenBg = document.getElementById('chase-garden-bg');
    const bedroomScene = document.getElementById('chase-bedroom-scene');

    if (isNight) {
      // Pause any active chase and remove cursor hiding
      if (hasStarted) stopChase();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      arena.classList.add('arena-bedroom-mode');
      arena.classList.remove('chase-cursor-hide', 'chase-active');
      document.body.classList.remove('chase-in-arena');

      // Hide active daytime characters & meadow
      if (gardenBg) gardenBg.style.display = 'none';
      if (momEl) momEl.style.display = 'none';
      if (babuEl) babuEl.style.display = 'none';
      if (tommyEl) tommyEl.style.display = 'none';
      if (pacifierEl) pacifierEl.style.display = 'none';
      if (tapPrompt) tapPrompt.style.display = 'none';

      // Show cozy bedroom scene
      if (bedroomScene) {
        bedroomScene.classList.remove('hidden');
        requestAnimationFrame(() => {
          bedroomScene.style.opacity = '1';
          bedroomScene.style.pointerEvents = 'auto';
        });
      }
    } else {
      // Wake up: return to daytime garden meadow
      arena.classList.remove('arena-bedroom-mode');
      if (bedroomScene) {
        bedroomScene.style.opacity = '0';
        bedroomScene.style.pointerEvents = 'none';
        setTimeout(() => {
          if (!isNightMode) bedroomScene.classList.add('hidden');
        }, 300);
      }

      if (gardenBg) gardenBg.style.display = '';
      if (momEl) momEl.style.display = '';
      if (babuEl) babuEl.style.display = '';
      if (tommyEl) tommyEl.style.display = '';
      if (pacifierEl) pacifierEl.style.display = '';
      if (tapPrompt) tapPrompt.style.display = '';

      resetPositions();
      hasStarted = false;
      isResetting = false;
      lastTime = performance.now();
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(tick);
      }
    }
  }

  // Bedroom interactive elements (Clicking sleeping Babu or Tommy)
  const bedroomTommy = document.getElementById('bedroom-tommy-sleeping');
  const bedroomBabu = document.getElementById('bedroom-babu-bed');
  if (bedroomTommy) {
    bedroomTommy.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playPop();
    });
  }
  if (bedroomBabu) {
    bedroomBabu.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playPop();
    });
  }

  // Expose controller instance
  chaseSceneController = { setNightMode };
  if (pendingNightMode !== null) {
    setNightMode(pendingNightMode);
  }

  // Start animation loop
  animationFrameId = requestAnimationFrame(tick);

  // Return teardown function
  return () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
    chaseSceneController = null;
  };
}
