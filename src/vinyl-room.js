// ============================================================================
// THIS SUCKS.™ — SECRET VINYL ROOM EASTER EGG CONTROLLER
// Manages Babu's secret music room, interactive vinyl records, turntable,
// toddler dance animations, and audio playback.
// ============================================================================

import { VINYL_RECORDS } from './vinyl-data.js';
import { sound } from './audio.js';

class VinylRoomController {
  constructor() {
    this.isOpen = false;
    this.audio = null;
    this.currentTrack = null;
    this.state = 'idle'; // 'idle' | 'busy' | 'playing'
    this.isMuted = false;
    this.animationTimers = [];
    this.noteInterval = null;

    // Elements
    this.modal = null;
    this.closeBtn = null;
    this.babuEl = null;
    this.babuBodyEl = null;
    this.carriedRecordEl = null;
    this.platterEl = null;
    this.turntableVinylEl = null;
    this.tonearmEl = null;
    this.nowPlayingPill = null;
    this.nowPlayingTitle = null;
    this.nowPlayingArtist = null;
    this.notesContainer = null;
    this.recordsContainer = null;
    this.tapToPlayBanner = null;

    // Floating Miniplayer elements
    this.miniplayer = null;
    this.miniplayerStopBtn = null;
    this.miniplayerOpenBtn = null;
    this.miniplayerTitle = null;
    this.miniplayerArtist = null;
    this.miniplayerVinylLabel = null;

    // Bound listeners for teardown
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  init() {
    this.modal = document.getElementById('vinyl-room-modal');
    if (!this.modal) return;

    this.closeBtn = document.getElementById('close-vinyl-room-btn');
    this.babuEl = document.getElementById('vinyl-babu');
    this.babuBodyEl = document.getElementById('vinyl-babu-body');
    this.carriedRecordEl = document.getElementById('babu-carried-record');
    this.platterEl = document.getElementById('turntable-platter');
    this.turntableVinylEl = document.getElementById('turntable-vinyl');
    this.tonearmEl = document.getElementById('turntable-tonearm');
    this.nowPlayingPill = document.getElementById('vinyl-now-playing');
    this.nowPlayingTitle = document.getElementById('now-playing-title');
    this.nowPlayingArtist = document.getElementById('now-playing-artist');
    this.notesContainer = document.getElementById('turntable-notes-container');
    this.recordsContainer = document.getElementById('wall-records-container');
    this.tapToPlayBanner = document.getElementById('vinyl-tap-to-play');

    // Miniplayer Elements
    this.miniplayer = document.getElementById('vinyl-floating-miniplayer');
    this.miniplayerStopBtn = document.getElementById('miniplayer-stop-btn');
    this.miniplayerOpenBtn = document.getElementById('miniplayer-open-btn');
    this.miniplayerTitle = document.getElementById('miniplayer-title');
    this.miniplayerArtist = document.getElementById('miniplayer-artist');
    this.miniplayerVinylLabel = document.getElementById('miniplayer-vinyl-label');

    if (this.miniplayerStopBtn) {
      this.miniplayerStopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playPop();
        this.stopPlayback(false);
      });
    }

    if (this.miniplayerOpenBtn) {
      this.miniplayerOpenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playPop();
        this.open();
      });
    }

    if (this.miniplayer) {
      this.miniplayer.addEventListener('click', () => {
        this.open();
      });
    }

    // Initialize Audio instance
    this.audio = new Audio();
    this.audio.preload = 'none';

    this.audio.addEventListener('ended', () => {
      this.handleSongEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Vinyl audio playback error:', e);
      this.showFeedback('Audio could not be loaded');
      this.stopPlayback(true);
    });

    // Close button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Render interactive records on the wall
    this.renderWallRecords();

    // Turntable Stop/Eject button inside the room
    const stopBtn = document.getElementById('turntable-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        sound.playPop();
        this.stopPlayback(true);
      });
    }

    // Turntable Mute button
    const muteBtn = document.getElementById('turntable-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        if (this.audio) this.audio.muted = this.isMuted;
        muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
        sound.playPop();
      });
    }

    // Tap to play fallback banner
    if (this.tapToPlayBanner) {
      this.tapToPlayBanner.addEventListener('click', () => {
        if (this.audio) {
          this.audio.play().then(() => {
            this.tapToPlayBanner.classList.add('hidden');
          }).catch(() => {});
        }
      });
    }

    // Secret dossier folder inside the room (connects to the classified modal)
    const secretDossierBtn = document.getElementById('room-secret-dossier-btn');
    if (secretDossierBtn) {
      secretDossierBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playStamp();
        const confModal = document.getElementById('confidential-modal');
        if (confModal) confModal.classList.remove('hidden');
      });
    }
  }

  // Render wall mounted vinyl records
  renderWallRecords() {
    if (!this.recordsContainer) return;
    this.recordsContainer.innerHTML = '';

    VINYL_RECORDS.forEach((rec, idx) => {
      const card = document.createElement('div');
      card.className = 'group relative flex flex-col items-center cursor-pointer select-none transition-transform hover:-translate-y-1.5 focus:outline-none';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Play ${rec.title} - ${rec.concept}`);
      card.dataset.vinylId = rec.id;
      card.dataset.index = idx;

      card.innerHTML = `
        <!-- Cardboard Sleeve Wall Mount Plaque -->
        <div class="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl bg-paper-cream border-[3px] border-ink-black shadow-[4px_4px_0_#292521] p-1.5 flex items-center justify-center transition-all group-hover:shadow-[6px_6px_0_#292521] group-focus:ring-2 group-focus:ring-marker-blue">
          
          <!-- Masking Tape holding plaque -->
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4.5 bg-crayon-pink/85 border border-ink-black/30 ${idx % 2 === 0 ? '-rotate-3' : 'rotate-2'} shadow-sm pointer-events-none"></div>

          <!-- Realistic Vinyl Disc inside Mount -->
          <div id="wall-disc-${rec.id}" class="relative w-full h-full rounded-full border-2 border-ink-black flex items-center justify-center shadow-inner overflow-hidden transition-all duration-300" style="background: radial-gradient(circle, #333 0%, #1a1a1a 45%, #2a2a2a 50%, #111 75%, #050505 100%);">
            
            <!-- Vinyl Grooves Rings -->
            <div class="absolute inset-1 rounded-full border border-white/10 pointer-events-none"></div>
            <div class="absolute inset-2.5 rounded-full border border-white/5 pointer-events-none"></div>
            <div class="absolute inset-4 rounded-full border border-white/10 pointer-events-none"></div>
            <div class="absolute inset-6 rounded-full border border-white/5 pointer-events-none"></div>
            
            <!-- Center Label Sticker -->
            <div class="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-ink-black flex flex-col items-center justify-center text-[7px] sm:text-[8px] font-bold shadow-md" style="background-color: ${rec.labelColor}; color: ${rec.accentColor};">
              <span class="leading-none text-center truncate px-0.5 max-w-full uppercase font-mono font-black">${rec.code.replace('RECORD ', '#')}</span>
              <div class="w-2 h-2 rounded-full bg-paper-cream border border-ink-black my-0.5"></div>
              <span class="text-[6px] font-bold truncate leading-none">33 RPM</span>
            </div>
          </div>

          <!-- Empty Sleeve Slot Placeholder (Shown when Babu takes it) -->
          <div id="wall-slot-${rec.id}" class="absolute inset-1.5 rounded-lg border-2 border-dashed border-ink-black/40 bg-ink-black/5 flex items-center justify-center hidden pointer-events-none">
            <span class="text-[10px] font-mono text-ink-black/50 font-bold">ON TURNTABLE</span>
          </div>

          <!-- Gold Star Sticker on Album -->
          <span class="absolute -bottom-2 -right-2 text-xs">⭐</span>
        </div>

        <!-- Plaque Label Tape Strip -->
        <div class="mt-2 text-center max-w-[130px]">
          <span class="inline-block px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase rounded border border-ink-black shadow-[2px_2px_0_#292521] font-mono ${rec.badgeClass}">
            ${rec.concept}
          </span>
          <p class="font-headline-sm text-xs sm:text-sm font-bold text-ink-black truncate mt-1">${rec.title}</p>
          <p class="text-[10px] text-on-surface-variant font-medium truncate">by ${rec.artist}</p>
        </div>
      `;

      // Click or keyboard interaction
      const selectHandler = (e) => {
        e.preventDefault();
        this.selectRecord(rec.id);
      };

      card.addEventListener('click', selectHandler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') selectHandler(e);
      });

      this.recordsContainer.appendChild(card);
    });
  }

  // Open Room Modal
  open() {
    if (!this.modal) return;
    this.isOpen = true;
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Hide background miniplayer while inside room
    this.hideMiniplayer();

    // Prime audio system
    sound.init();

    if (this.state === 'playing' && this.currentTrack) {
      // Babu is already grooving: re-anchor him on the center rug dancefloor
      this.positionBabuOnDancefloor();
      this.startBabuDance(this.currentTrack.danceStyle);
      this.startMusicalNotes();
    } else {
      // Reset Babu to chair
      this.positionBabuOnChair();
    }

    // Register Escape key
    window.addEventListener('keydown', this.handleKeydown);

    // Focus close button
    setTimeout(() => {
      if (this.closeBtn) this.closeBtn.focus();
    }, 100);
  }

  // Close Room Modal
  close() {
    if (!this.modal) return;
    this.isOpen = false;
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';

    window.removeEventListener('keydown', this.handleKeydown);

    // IF MUSIC IS PLAYING: KEEP PLAYING! Do not stop!
    if (this.state === 'playing') {
      this.showMiniplayer();
      // Pause floating notes particle emission while room is hidden
      if (this.noteInterval) {
        clearInterval(this.noteInterval);
        this.noteInterval = null;
      }
    } else {
      // If idle or interrupted before music started, clean up
      this.stopPlayback(false);
      this.clearAllTimers();
    }
  }

  handleKeydown(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  clearAllTimers() {
    this.animationTimers.forEach(t => clearTimeout(t));
    this.animationTimers = [];
    if (this.noteInterval) {
      clearInterval(this.noteInterval);
      this.noteInterval = null;
    }
  }

  setSafeTimeout(fn, ms) {
    const id = setTimeout(() => {
      fn();
    }, ms);
    this.animationTimers.push(id);
    return id;
  }

  // Position Babu in his Executive Chair
  positionBabuOnChair() {
    if (!this.babuEl) return;
    this.clearBabuAnimations();
    this.babuEl.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.babuEl.style.transform = 'translate3d(0, 0, 0) scaleX(1)';
    if (this.carriedRecordEl) {
      this.carriedRecordEl.classList.add('hidden');
    }
  }

  // Position Babu in the center of the room on the cozy cardboard rug
  positionBabuOnDancefloor() {
    const stage = document.getElementById('vinyl-room-stage');
    const chairEl = document.getElementById('vinyl-chair');
    if (!stage || !chairEl || !this.babuEl) return;

    const stageRect = stage.getBoundingClientRect();
    const chairRect = chairEl.getBoundingClientRect();

    const rugCenterX = stageRect.left + stageRect.width / 2;
    const chairCenterX = chairRect.left + chairRect.width / 2;

    const danceX = rugCenterX - chairCenterX;
    const danceY = 12; // Stand firmly on the rug floor

    this.babuEl.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.babuEl.style.transform = `translate3d(${danceX}px, ${danceY}px, 0) scaleX(1)`;
  }

  clearBabuAnimations() {
    if (this.babuEl) {
      this.babuEl.classList.remove('babu-is-walking');
    }
    if (this.babuBodyEl) {
      this.babuBodyEl.classList.remove(
        'babu-dancing-ceo-strut',
        'babu-dancing-toddler-bounce',
        'babu-dancing-chaos-spin',
        'babu-dancing-wobble-rave'
      );
    }
  }

  // ==========================================================================
  // COMPLETE RECORD-SELECTION SEQUENCE
  // ==========================================================================
  selectRecord(recordId) {
    if (this.state === 'busy') return; // Prevent concurrent collisions

    const record = VINYL_RECORDS.find(r => r.id === recordId);
    if (!record) return;

    // If same track is already playing, do nothing
    if (this.currentTrack && this.currentTrack.id === recordId && this.state === 'playing') {
      return;
    }

    this.state = 'busy';
    this.stopPlayback(false); // Stop prior track

    // 1. Highlight selected record on wall
    this.highlightWallRecord(recordId);

    // Sound: initial tape peel / click pop
    sound.playPop();

    // 2. STATE 2: BABU GETS UP FROM CHAIR
    this.babuEl.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.babuEl.style.transform = 'translate3d(20px, 8px, 0) scaleX(1)';

    this.setSafeTimeout(() => {
      // 3. STATE 3: BABU WALKS TO THE WALL
      this.babuWalkToWall(record);
    }, 280);
  }

  highlightWallRecord(recordId) {
    document.querySelectorAll('[data-vinyl-id]').forEach(el => {
      const disc = el.querySelector('[id^="wall-disc-"]');
      if (el.dataset.vinylId === recordId) {
        el.classList.add('vinyl-active-selection');
        if (disc) disc.style.transform = 'scale(1.08)';
      } else {
        el.classList.remove('vinyl-active-selection');
        if (disc) disc.style.transform = 'scale(1)';
      }
    });
  }

  babuWalkToWall(record) {
    const wallRecordCard = document.querySelector(`[data-vinyl-id="${record.id}"]`);
    const chairEl = document.getElementById('vinyl-chair');
    if (!wallRecordCard || !chairEl || !this.babuEl) {
      this.babuWalkToTurntable(record);
      return;
    }

    const chairRect = chairEl.getBoundingClientRect();
    const cardRect = wallRecordCard.getBoundingClientRect();

    const chairCenterX = chairRect.left + chairRect.width / 2;
    const chairBottomY = chairRect.bottom;
    const cardCenterX = cardRect.left + cardRect.width / 2;

    const targetX = cardCenterX - chairCenterX;
    const targetY = (cardRect.bottom - chairBottomY) + 30; // reach up to plaque

    this.babuEl.classList.add('babu-is-walking');
    this.babuEl.style.transition = 'transform 0.65s ease-in-out';
    this.babuEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scaleX(1)`;

    this.setSafeTimeout(() => {
      // 4. STATE 4: BABU TAKES THE RECORD
      this.babuTakesRecord(record, targetX, targetY);
    }, 660);
  }

  babuTakesRecord(record, currX, currY) {
    this.clearBabuAnimations();
    sound.playPeel();

    // Hide vinyl from wall slot, show empty dashed outline
    const wallDisc = document.getElementById(`wall-disc-${record.id}`);
    const wallSlot = document.getElementById(`wall-slot-${record.id}`);
    if (wallDisc) wallDisc.classList.add('opacity-0');
    if (wallSlot) wallSlot.classList.remove('hidden');

    // Attach carried vinyl to Babu's hands
    if (this.carriedRecordEl) {
      this.carriedRecordEl.classList.remove('hidden');
      const innerLabel = document.getElementById('carried-record-label');
      if (innerLabel) {
        innerLabel.style.backgroundColor = record.labelColor;
        innerLabel.style.color = record.accentColor;
        innerLabel.textContent = record.code.replace('RECORD ', '#');
      }
    }

    // Little reach-up motion
    this.babuEl.style.transition = 'transform 0.22s ease-out';
    this.babuEl.style.transform = `translate3d(${currX}px, ${currY - 14}px, 0) scaleX(1)`;

    this.setSafeTimeout(() => {
      // 5. STATE 5: BABU WALKS TO THE TURNTABLE
      this.babuWalkToTurntable(record);
    }, 280);
  }

  babuWalkToTurntable(record) {
    const tableEl = document.getElementById('turntable-cabinet');
    const chairEl = document.getElementById('vinyl-chair');
    if (!tableEl || !chairEl || !this.babuEl) {
      this.babuPlacesRecord(record);
      return;
    }

    const tableRect = tableEl.getBoundingClientRect();
    const chairRect = chairEl.getBoundingClientRect();
    const chairCenterX = chairRect.left + chairRect.width / 2;

    // Stand just to the left of the turntable table
    const targetX = (tableRect.left - 50) - chairCenterX;
    const targetY = 12;

    this.babuEl.classList.add('babu-is-walking');
    this.babuEl.style.transition = 'transform 0.72s ease-in-out';
    this.babuEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scaleX(1)`;

    this.setSafeTimeout(() => {
      // 6. STATE 6: BABU PLACES RECORD ON TURNTABLE
      this.babuPlacesRecord(record);
    }, 730);
  }

  babuPlacesRecord(record) {
    this.clearBabuAnimations();

    // Hide carried record
    if (this.carriedRecordEl) {
      this.carriedRecordEl.classList.add('hidden');
    }

    // Sound: needle/vinyl placement
    sound.playStamp();

    // Show record on turntable platter
    if (this.turntableVinylEl) {
      this.turntableVinylEl.classList.remove('hidden');
      const label = document.getElementById('turntable-vinyl-label');
      if (label) {
        label.style.backgroundColor = record.labelColor;
        label.style.color = record.accentColor;
        label.textContent = record.code.replace('RECORD ', '#');
      }
    }

    // Needle drop: swivel tonearm onto playing position
    if (this.tonearmEl) {
      this.tonearmEl.classList.remove('tonearm-resting');
      this.tonearmEl.classList.add('tonearm-playing');
    }

    // Platter starts spinning
    if (this.platterEl) {
      this.platterEl.classList.add('animate-vinyl-spin');
    }

    // Step out onto center rug dancefloor!
    this.positionBabuOnDancefloor();

    this.setSafeTimeout(() => {
      // 7. STATE 7: MUSIC STARTS & BABU DANCES
      this.startMusicPlayback(record);
    }, 450);
  }

  startMusicPlayback(record) {
    this.currentTrack = record;
    this.state = 'playing';

    // Update Now Playing banner
    if (this.nowPlayingPill) this.nowPlayingPill.classList.remove('hidden');
    if (this.nowPlayingTitle) this.nowPlayingTitle.textContent = `${record.concept}: ${record.title}`;
    if (this.nowPlayingArtist) this.nowPlayingArtist.textContent = `by ${record.artist} (${record.isrc})`;

    // Audio Playback
    if (this.audio) {
      this.audio.src = record.audioSrc;
      this.audio.muted = this.isMuted;
      this.audio.currentTime = 0;

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Autoplay blocked by browser policy:', err);
          if (this.tapToPlayBanner) {
            this.tapToPlayBanner.classList.remove('hidden');
          }
        });
      }
    }

    // 8. STATE 8: BABU DANCES ON THE FLOOR!
    this.startBabuDance(record.danceStyle);

    // Start emitting cartoon musical notes from turntable
    this.startMusicalNotes();

    // If modal is not open, show floating miniplayer immediately
    if (!this.isOpen) {
      this.showMiniplayer();
    }
  }

  startBabuDance(danceStyle) {
    this.clearBabuAnimations();
    const danceClass = `babu-dancing-${danceStyle}`;
    if (this.babuBodyEl) {
      this.babuBodyEl.classList.add(danceClass);
    } else if (this.babuEl) {
      this.babuEl.classList.add(danceClass);
    }
  }

  startMusicalNotes() {
    if (this.noteInterval) clearInterval(this.noteInterval);

    const notes = ['♪', '♫', '♬', '♩', '✨'];
    this.noteInterval = setInterval(() => {
      if (!this.isOpen || this.state !== 'playing' || !this.notesContainer) return;

      const note = document.createElement('div');
      note.className = 'absolute text-lg sm:text-xl font-bold font-mono pointer-events-none floating-music-note select-none';
      note.textContent = notes[Math.floor(Math.random() * notes.length)];
      
      const colors = ['#FFD84D', '#FF719A', '#55B9F5', '#ACDF6C', '#FFF8E8'];
      note.style.color = colors[Math.floor(Math.random() * colors.length)];
      note.style.setProperty('--note-x', `${(Math.random() - 0.5) * 60}px`);
      note.style.setProperty('--note-rot', `${(Math.random() - 0.5) * 45}deg`);

      this.notesContainer.appendChild(note);

      setTimeout(() => {
        if (note.parentNode) note.parentNode.removeChild(note);
      }, 1850);
    }, 420);
  }

  // Handle Song Ending Naturally
  handleSongEnded() {
    this.stopPlayback(true);
  }

  // Stop playback cleanly and reset
  stopPlayback(returnToChair = false) {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    this.hideMiniplayer();

    if (this.noteInterval) {
      clearInterval(this.noteInterval);
      this.noteInterval = null;
    }

    // Reset tonearm & spinning
    if (this.tonearmEl) {
      this.tonearmEl.classList.remove('tonearm-playing');
      this.tonearmEl.classList.add('tonearm-resting');
    }

    if (this.platterEl) {
      this.platterEl.classList.remove('animate-vinyl-spin');
    }

    if (this.tapToPlayBanner) {
      this.tapToPlayBanner.classList.add('hidden');
    }

    if (this.nowPlayingPill) {
      this.nowPlayingPill.classList.add('hidden');
    }

    // Restore all wall records
    VINYL_RECORDS.forEach(r => {
      const disc = document.getElementById(`wall-disc-${r.id}`);
      const slot = document.getElementById(`wall-slot-${r.id}`);
      if (disc) disc.classList.remove('opacity-0');
      if (slot) slot.classList.add('hidden');
    });

    document.querySelectorAll('[data-vinyl-id]').forEach(el => {
      el.classList.remove('vinyl-active-selection');
    });

    // Hide turntable vinyl
    if (this.turntableVinylEl) {
      this.turntableVinylEl.classList.add('hidden');
    }

    this.clearBabuAnimations();
    this.state = 'idle';
    this.currentTrack = null;

    if (returnToChair && this.isOpen) {
      // Babu waddles back to his chair
      this.babuEl.classList.add('babu-is-walking');
      this.babuEl.style.transition = 'transform 0.65s ease-in-out';
      this.babuEl.style.transform = 'translate3d(0, 0, 0) scaleX(-1)';

      this.setSafeTimeout(() => {
        this.clearBabuAnimations();
        this.babuEl.style.transform = 'translate3d(0, 0, 0) scaleX(1)';
      }, 660);
    } else {
      this.positionBabuOnChair();
    }
  }

  showMiniplayer() {
    if (!this.miniplayer || !this.currentTrack) return;
    if (this.miniplayerTitle) {
      this.miniplayerTitle.textContent = `${this.currentTrack.concept}: ${this.currentTrack.title}`;
    }
    if (this.miniplayerArtist) {
      this.miniplayerArtist.textContent = `by ${this.currentTrack.artist}`;
    }
    if (this.miniplayerVinylLabel) {
      this.miniplayerVinylLabel.style.backgroundColor = this.currentTrack.labelColor;
      this.miniplayerVinylLabel.style.color = this.currentTrack.accentColor;
    }
    this.miniplayer.classList.remove('hidden');
  }

  hideMiniplayer() {
    if (this.miniplayer) {
      this.miniplayer.classList.add('hidden');
    }
  }

  showFeedback(msg) {
    const pill = document.getElementById('vinyl-feedback-pill');
    if (pill) {
      pill.textContent = msg;
      pill.classList.remove('hidden');
      setTimeout(() => {
        pill.classList.add('hidden');
      }, 3000);
    }
  }
}

// Singleton Controller Instance
export const vinylRoom = new VinylRoomController();

export function initVinylRoom() {
  vinylRoom.init();

  // Connect existing "DO NOT CLICK" button to the Secret Vinyl Room
  const easterEggBtn = document.getElementById('easter-egg-btn');
  if (easterEggBtn) {
    easterEggBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      vinylRoom.open();
    });
  }
}
