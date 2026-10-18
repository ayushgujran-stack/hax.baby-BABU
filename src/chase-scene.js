// ============================================================================
// THE PACIFIER CHASE - Interactive Scene Controller
// Babu (CEO) & Tommy (CSO) chase the irresistible pacifier while Mom knits quietly.
// ============================================================================

import { sound } from './audio.js';

export function initChaseScene() {
  const section = document.getElementById('chase-section');
  const arena = document.getElementById('chase-arena');
  if (!section || !arena) return;

  const tapPrompt = document.getElementById('chase-tap-prompt');
  const pacifierEl = document.getElementById('chase-pacifier');
  const babuEl = document.getElementById('chase-babu');
  const tommyEl = document.getElementById('chase-tommy');
  const momEl = document.getElementById('chase-mom');

  if (!pacifierEl || !babuEl || !tommyEl) return;

  // Track reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // SVG limb references for Tommy puppy animation
  const tommyTail = tommyEl.querySelector('#tommy-tail');
  const tommyLegFl = tommyEl.querySelector('#tommy-leg-fl');
  const tommyLegFr = tommyEl.querySelector('#tommy-leg-fr');
  const tommyLegBl = tommyEl.querySelector('#tommy-leg-bl');

  // Scene state
  let hasStarted = false;
  let isPointerInside = false;
  let isDragging = false;
  let arenaRect = arena.getBoundingClientRect();

  // Positions and velocities (arena coordinates)
  // Pacifier
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

  // Babu
  const babu = {
    x: 60,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1, // 1 for right, -1 for left
    waddlePhase: 0,
    speed: prefersReducedMotion ? 90 : 170, // toddler run speed
    isMoving: false
  };

  // Tommy the Dog
  const tommy = {
    x: 160,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    runPhase: 0,
    tailPhase: 0,
    speed: prefersReducedMotion ? 130 : 260, // energetic dog run speed
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

  // Dimensions & bounds
  const PADDING = 28;
  const PACI_SIZE = 54;
  const BABU_WIDTH = 75;
  const BABU_HEIGHT = 100;
  const TOMMY_WIDTH = 105;
  const TOMMY_HEIGHT = 85;

  // Setup initial coordinates based on arena size
  function resetPositions() {
    arenaRect = arena.getBoundingClientRect();
    const w = arenaRect.width;
    const h = arenaRect.height;

    // Pacifier starts in center
    paci.x = w * 0.5;
    paci.y = h * 0.48;
    paci.targetX = paci.x;
    paci.targetY = paci.y;
    paci.vx = 0;
    paci.vy = 0;
    paci.dodgeVx = 0;
    paci.dodgeVy = 0;

    // Babu starts in bottom-left corner
    babu.x = Math.max(PADDING + 30, w * 0.12);
    babu.y = h - BABU_HEIGHT / 2 - PADDING - 10;
    babu.facing = 1;

    // Tommy sits next to Babu in bottom-left corner
    tommy.x = babu.x + 90;
    tommy.y = h - TOMMY_HEIGHT / 2 - PADDING - 10;
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
    // Clamp inside new bounds
    paci.x = Math.max(PADDING, Math.min(arenaRect.width - PADDING, paci.x));
    paci.y = Math.max(PADDING, Math.min(arenaRect.height - PADDING, paci.y));
    paci.targetX = paci.x;
    paci.targetY = paci.y;

    babu.x = Math.max(PADDING, Math.min(arenaRect.width - PADDING, babu.x));
    babu.y = Math.max(PADDING, Math.min(arenaRect.height - PADDING, babu.y));

    tommy.x = Math.max(PADDING, Math.min(arenaRect.width - PADDING, tommy.x));
    tommy.y = Math.max(PADDING, Math.min(arenaRect.height - PADDING, tommy.y));
  };
  window.addEventListener('resize', handleResize, { passive: true });

  // --------------------------------------------------------------------------
  // INPUT HANDLING: Pointer Events (unified mouse & touch)
  // --------------------------------------------------------------------------

  function updatePointerTarget(clientX, clientY) {
    arenaRect = arena.getBoundingClientRect();
    const clampedX = Math.max(PADDING + PACI_SIZE / 2, Math.min(arenaRect.width - PADDING - PACI_SIZE / 2, clientX - arenaRect.left));
    const clampedY = Math.max(PADDING + PACI_SIZE / 2, Math.min(arenaRect.height - PADDING - PACI_SIZE / 2, clientY - arenaRect.top));
    paci.targetX = clampedX;
    paci.targetY = clampedY;
  }

  // Handle TAP trigger
  function startChase(e) {
    if (hasStarted) return;
    hasStarted = true;

    // Remove the TAP label smoothly
    if (tapPrompt) {
      tapPrompt.style.opacity = '0';
      tapPrompt.style.transform = 'scale(0.5) rotate(-20deg)';
      tapPrompt.style.pointerEvents = 'none';
      setTimeout(() => tapPrompt.remove(), 250);
    }

    // Remove idle CSS tail wag so JS controls Tommy's running animation
    if (tommyTail) {
      tommyTail.classList.remove('tommy-idle-tail');
    }

    arena.classList.add('chase-active');

    sound.init();
    sound.playPop();

    if (e && typeof e.clientX === 'number') {
      updatePointerTarget(e.clientX, e.clientY);
      if (e.pointerType === 'mouse') {
        isPointerInside = true;
        document.body.classList.add('chase-in-arena');
        arena.classList.add('chase-cursor-hide');
      }
    }
  }

  // Clicking pacifier or TAP prompt starts chase
  if (tapPrompt) {
    tapPrompt.addEventListener('pointerdown', (e) => {
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

  // Arena pointer events
  arena.addEventListener('pointerenter', (e) => {
    if (!hasStarted) return;
    if (e.pointerType === 'mouse') {
      isPointerInside = true;
      document.body.classList.add('chase-in-arena');
      arena.classList.add('chase-cursor-hide');
      updatePointerTarget(e.clientX, e.clientY);
    }
  });

  arena.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') {
      isPointerInside = false;
      document.body.classList.remove('chase-in-arena');
      arena.classList.remove('chase-cursor-hide');
    }
  });

  arena.addEventListener('pointermove', (e) => {
    if (!hasStarted) return;

    if (e.pointerType === 'mouse') {
      isPointerInside = true;
      document.body.classList.add('chase-in-arena');
      arena.classList.add('chase-cursor-hide');
      updatePointerTarget(e.clientX, e.clientY);
    } else if (e.pointerType === 'touch' && isDragging) {
      updatePointerTarget(e.clientX, e.clientY);
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
  // ANIMATION LOOP (Physics, AI, Tommy Jump & Dodge)
  // --------------------------------------------------------------------------

  let lastTime = performance.now();
  let animationFrameId = null;

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap delta time at 50ms
    lastTime = now;

    if (hasStarted) {
      updatePacifier(dt);
      updateBabu(dt);
      updateTommy(dt);
    } else {
      updateIdleAnimations(now);
    }

    render();
    animationFrameId = requestAnimationFrame(tick);
  }

  // --- PACIFIER PHYSICS ---
  function updatePacifier(dt) {
    // Decay dodge velocity
    paci.dodgeVx *= Math.pow(0.03, dt);
    paci.dodgeVy *= Math.pow(0.03, dt);

    // Apply dodge velocity
    paci.x += paci.dodgeVx * dt;
    paci.y += paci.dodgeVy * dt;

    // Follow target smoothly with snappy tracking
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

    // Avoid pacifier getting stuck behind Mom's chair
    const momZoneLeft = arenaRect.width - 150;
    const momZoneBottom = 150;
    if (paci.x > momZoneLeft && paci.y < momZoneBottom) {
      paci.y = momZoneBottom + 10;
    }

    paci.x = Math.max(minX, Math.min(maxX, paci.x));
    paci.y = Math.max(minY, Math.min(maxY, paci.y));

    // Slight playful wobble when moving
    const speed = Math.hypot(dx, dy);
    paci.rotation = Math.sin(lastTime * 0.015) * Math.min(16, speed * 0.1);
    paci.scale = 1 + Math.sin(lastTime * 0.008) * 0.05;
  }

  // --- BABU AI & RUN ANIMATION ---
  function updateBabu(dt) {
    const dx = paci.x - babu.x;
    const dy = paci.y - babu.y;
    const dist = Math.hypot(dx, dy);

    // Babu wants the pacifier!
    if (dist > 35) {
      babu.isMoving = true;
      const dirX = dx / dist;
      const dirY = dy / dist;

      babu.x += dirX * babu.speed * dt;
      babu.y += dirY * babu.speed * dt;

      // Update facing direction with slight hysteresis
      if (Math.abs(dx) > 12) {
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

    // Avoid running through Mom's quiet chair zone in top-right
    const momZoneLeft = arenaRect.width - 160;
    const momZoneBottom = 165;
    if (babu.x > momZoneLeft && babu.y < momZoneBottom) {
      babu.y = momZoneBottom + 6;
    }

    babu.x = Math.max(minX, Math.min(maxX, babu.x));
    babu.y = Math.max(minY, Math.min(maxY, babu.y));
  }

  // --- TOMMY AI, JUMP SEQUENCE & DODGE LOGIC ---
  function updateTommy(dt) {
    tommy.jumpCooldown -= dt;
    tommy.tailPhase += dt * 22;

    const dx = paci.x - tommy.x;
    const dy = paci.y - tommy.y;
    const dist = Math.hypot(dx, dy);

    switch (tommy.state) {
      case 'CHASE': {
        // Runs towards pacifier
        if (Math.abs(dx) > 12) {
          tommy.facing = dx > 0 ? 1 : -1;
        }

        if (dist > 38) {
          const dirX = dx / dist;
          const dirY = dy / dist;
          tommy.x += dirX * tommy.speed * dt;
          tommy.y += dirY * tommy.speed * dt;
          tommy.runPhase += dt * 18;
        }

        // TRIGGER JUMP CHECK:
        // When Tommy is within catching range (< 105px) and jump cooldown is expired
        if (dist < 105 && tommy.jumpCooldown <= 0) {
          tommy.state = 'CROUCH';
          tommy.stateTimer = 0.18; // 180ms crouch
        }
        break;
      }

      case 'CROUCH': {
        // Tommy stops and squashes down into an alert spring pose
        tommy.stateTimer -= dt;
        if (tommy.stateTimer <= 0) {
          // Launch into leap!
          tommy.state = 'LEAP';
          tommy.stateTimer = 0.36; // 360ms leap duration
          tommy.leapStartX = tommy.x;
          tommy.leapStartY = tommy.y;
          tommy.leapTargetX = paci.x;
          tommy.leapTargetY = paci.y;
          tommy.hasDodgedThisLeap = false;
        }
        break;
      }

      case 'LEAP': {
        tommy.stateTimer -= dt;
        const totalDuration = 0.36;
        const progress = Math.max(0, Math.min(1, 1 - (tommy.stateTimer / totalDuration)));

        // Parabolic jump trajectory
        tommy.x = tommy.leapStartX + (tommy.leapTargetX - tommy.leapStartX) * progress;
        tommy.y = tommy.leapStartY + (tommy.leapTargetY - tommy.leapStartY) * progress;
        tommy.leapHeight = -Math.sin(progress * Math.PI) * 48; // 48px upward leap arc

        // DODGE TRIGGER AT THE LAST POSSIBLE MOMENT!
        // When Tommy reaches ~62% of his leap, the pacifier escapes!
        if (progress > 0.62 && !tommy.hasDodgedThisLeap) {
          tommy.hasDodgedThisLeap = true;
          triggerPacifierDodge(tommy.x, tommy.y);
        }

        if (tommy.stateTimer <= 0) {
          // Tommy lands!
          tommy.state = 'LAND';
          tommy.stateTimer = 0.22; // 220ms landing recovery
          tommy.leapHeight = 0;

          // Play funny landing dog-toy squeak!
          sound.playSqueak();
        }
        break;
      }

      case 'LAND': {
        tommy.stateTimer -= dt;
        if (tommy.stateTimer <= 0) {
          tommy.state = 'CHASE';
          // Cooldown between jumps (2.3s to 3.3s with randomness)
          tommy.jumpCooldown = 2.3 + Math.random() * 1.0;
        }
        break;
      }
    }

    // Clamp Tommy inside arena
    const minX = PADDING + TOMMY_WIDTH / 2;
    const maxX = arenaRect.width - PADDING - TOMMY_WIDTH / 2;
    const minY = PADDING + TOMMY_HEIGHT / 2;
    const maxY = arenaRect.height - PADDING - TOMMY_HEIGHT / 2;

    // Avoid running through Mom's quiet chair zone in top-right
    const momZoneLeft = arenaRect.width - 160;
    const momZoneBottom = 165;
    if (tommy.x > momZoneLeft && tommy.y < momZoneBottom) {
      tommy.y = momZoneBottom + 6;
    }

    tommy.x = Math.max(minX, Math.min(maxX, tommy.x));
    tommy.y = Math.max(minY, Math.min(maxY, tommy.y));
  }

  // --- PACIFIER ESCAPE / DODGE MECHANIC ---
  function triggerPacifierDodge(attackerX, attackerY) {
    // Vector pointing away from Tommy
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

    // Add slight random deflection angle (-45 deg to +45 deg)
    const angleOffset = (Math.random() - 0.5) * (Math.PI * 0.45);
    const cosA = Math.cos(angleOffset);
    const sinA = Math.sin(angleOffset);
    const dodgedDirX = awayX * cosA - awayY * sinA;
    const dodgedDirY = awayX * sinA + awayY * cosA;

    // Dodge impulse velocity
    const dodgeSpeed = 520 + Math.random() * 140;
    paci.dodgeVx = dodgedDirX * dodgeSpeed;
    paci.dodgeVy = dodgedDirY * dodgeSpeed;

    // Update target point so pacifier smoothly coasts
    paci.targetX = Math.max(PADDING + PACI_SIZE, Math.min(arenaRect.width - PADDING - PACI_SIZE, paci.x + dodgedDirX * 130));
    paci.targetY = Math.max(PADDING + PACI_SIZE, Math.min(arenaRect.height - PADDING - PACI_SIZE, paci.y + dodgedDirY * 130));

    // Play escape pop sound
    sound.playPop();
  }

  // --- IDLE ANIMATIONS BEFORE TAP ---
  function updateIdleAnimations(time) {
    // Gentle floating pacifier
    paci.scale = 1 + Math.sin(time * 0.004) * 0.05;
    paci.rotation = Math.sin(time * 0.003) * 5;

    // Babu idle breathing
    babu.waddlePhase = time * 0.002;

    // Tommy idle tail wag
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
      // Waddling toddler run
      babuRotate = Math.sin(babu.waddlePhase) * 7.5;
      babuBob = -Math.abs(Math.sin(babu.waddlePhase)) * 8.5;
      babuSquash = 1 + Math.sin(babu.waddlePhase * 2) * 0.04;
    } else {
      // Idle breathing
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
      tommyYOffset = 8;
    } else if (tommy.state === 'LEAP') {
      tommyYOffset = tommy.leapHeight;
      tommyRotate = tommy.facing * -16;
      tommyScaleY = 1.1;
    } else if (tommy.state === 'LAND') {
      tommyScaleY = 0.76;
      tommyScaleX = tommy.facing * 1.2;
      tommyYOffset = 6;
    } else if (tommy.state === 'CHASE' && !prefersReducedMotion) {
      // Running trot
      tommyRotate = Math.sin(tommy.runPhase) * 6;
      tommyYOffset = -Math.abs(Math.sin(tommy.runPhase)) * 6.5;
      tommyScaleY = 1 + Math.sin(tommy.runPhase * 2) * 0.05;

      // Animate Tommy's paws running
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

    // Wag Tommy's tail inside the SVG
    if (tommyTail && hasStarted) {
      const tailAngle = Math.sin(tommy.tailPhase) * (tommy.state === 'LEAP' ? 35 : 22);
      tommyTail.style.transform = `rotate(${tailAngle}deg)`;
    }
  }

  // Start the animation frame loop
  animationFrameId = requestAnimationFrame(tick);

  // Return teardown function for clean cleanup
  return () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  };
}
