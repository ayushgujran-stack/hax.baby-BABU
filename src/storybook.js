// ============================================================================
// BABU'S BEDTIME STORYBOOK — 3D INTERACTIVE VIRTUAL FLIPBOOK
// Engine: DearFlip WebGL 3D Mesh Physics (Powered by Three.js)
// Based on /virtual-book skill instructions and template
// Source Material: BABU.pdf (12 pages, high-res web-optimized)
// NOTE: Each PDF page is 1:1 mapped to ONE single page in the book.
// ============================================================================

export const STORYBOOK_PAGES = [
  '/storybook/page-01.jpg', // Page 1: Front Cover ("THE LEGEND OF BABU")
  '/storybook/page-02.jpg', // Page 2: Inside Left ("Once upon a time...")
  '/storybook/page-03.jpg', // Page 3: Inside Right (Illustration)
  '/storybook/page-04.jpg', // Page 4: Inside Left ("Babu loved many things...")
  '/storybook/page-05.jpg', // Page 5: Inside Right (Illustration)
  '/storybook/page-06.jpg', // Page 6: Inside Left ("Unfortunately...")
  '/storybook/page-07.jpg', // Page 7: Inside Right (Illustration)
  '/storybook/page-08.jpg', // Page 8: Inside Left ("And so, THIS SUCKS.™...")
  '/storybook/page-09.jpg', // Page 9: Inside Right (Illustration)
  '/storybook/page-10.jpg', // Page 10: Inside Left ("Business was booming...")
  '/storybook/page-11.jpg', // Page 11: Inside Right (Illustration)
  '/storybook/page-12.jpg'  // Page 12: Back Cover ("Mommy thought it was just a mess...")
];

export const STORYBOOK_CONFIG = {
  bookId: 'babu_legend_book',
  soundEnabled: false,           // Strict silent operation per skill guidelines
  flipDuration: 850,             // Realistic turning inertia (ms)
  backgroundColor: '#0b1120',    // Executive dark blue-gray 3D studio background
  backgroundColorNight: '#060913',
  defaultSpread: 'double',       // Double-page spread on desktop, auto-single on mobile
  startPage: 1                   // Closed front cover
};

let flipbookInstance = null;

export function initStorybook() {
  const viewerContainer = document.getElementById('flipbook-viewer');
  if (!viewerContainer) return null;

  // Ensure jQuery and DearFlip are loaded
  if (typeof window.jQuery === 'undefined' || typeof window.DFLIP === 'undefined') {
    console.warn('DearFlip or jQuery not yet loaded, retrying in 100ms...');
    setTimeout(initStorybook, 100);
    return null;
  }

  const $ = window.jQuery;
  const DFLIP = window.DFLIP;

  // Set viewer ID to match bookId for canonical hash routing
  viewerContainer.id = STORYBOOK_CONFIG.bookId;

  // Configure DearFlip global defaults
  DFLIP.defaults.threejsSrc = "https://cdn.jsdelivr.net/npm/@dearhive/dearflip-jquery-flipbook@1.7.3/dflip/js/libs/three.min.js";
  DFLIP.defaults.pdfjsSrc = "https://cdn.jsdelivr.net/npm/@dearhive/dearflip-jquery-flipbook@1.7.3/dflip/js/libs/pdf.min.js";
  
  // CRITICAL: Ensure each PDF page / image is treated as ONE page in the book (NEVER slice in half)
  DFLIP.defaults.pageSize = DFLIP.PAGE_SIZE.SINGLE;

  // Strict mute per skill requirements
  DFLIP.defaults.soundEnable = false;
  DFLIP.defaults.soundFile = null;

  // Controls strictly limited to Previous / Next arrows (no fullscreen, no page numbers, no layout change options)
  DFLIP.defaults.allControls = "altPrev,altNext";
  DFLIP.defaults.moreControls = "";
  DFLIP.defaults.hideControls = "fullScreen,pageNumber,pageMode,play,outline,thumbnail,zoomIn,zoomOut,download,search,more,startPage,endPage,sound,share";

  // Check URL hash for direct deep-linking (e.g. #flipbook-babu_legend_book/5/)
  let initialPage = STORYBOOK_CONFIG.startPage;
  const hashRegex = new RegExp(`#flipbook-${STORYBOOK_CONFIG.bookId}/(\\d+)/?`);
  const hashMatch = window.location.hash.match(hashRegex);
  if (hashMatch) {
    const parsedPage = parseInt(hashMatch[1], 10);
    if (!isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= STORYBOOK_PAGES.length) {
      initialPage = parsedPage;
    }
  }

  // Determine initial background based on active theme
  const isNight = document.documentElement.getAttribute('data-theme') === 'night';
  const initialBg = isNight ? STORYBOOK_CONFIG.backgroundColorNight : STORYBOOK_CONFIG.backgroundColor;

  // Initialize DearFlip with 3D WebGL paper mesh curvature
  try {
    flipbookInstance = $(`#${STORYBOOK_CONFIG.bookId}`).flipBook(STORYBOOK_PAGES, {
      webgl: true,
      webglShadow: true,
      hard: "cover", // Rigid physical front and back covers, realistic flexible paper interior
      soundEnable: false,
      sound: null,
      duration: STORYBOOK_CONFIG.flipDuration,
      openPage: initialPage,
      height: '100%',
      backgroundColor: initialBg,
      pageSize: DFLIP.PAGE_SIZE.SINGLE, // 1 PDF page = 1 book page (NEVER slice in half)
      pageMode: DFLIP.PAGE_MODE.DOUBLE, // Display facing pages when open
      singlePageMode: DFLIP.SINGLE_PAGE_MODE.AUTO, // Auto-single on mobile screens
      controlsPosition: DFLIP.CONTROLSPOSITION.BOTTOM,
      allControls: "altPrev,altNext",
      moreControls: "",
      hideControls: "fullScreen,pageNumber,pageMode,play,outline,thumbnail,zoomIn,zoomOut,download,search,more,startPage,endPage,sound,share",
      enableDownload: false,
      search: false,
      scrollWheel: false, // Prevent page flips when scrolling down the website
      onFlip: function(target) {
        updatePageIndicator();
      }
    });

    // Wire up tactile neobrutalist external control buttons
    setupCustomControls();

    // Wire up left and right keyboard arrow navigation
    setupKeyboardNavigation();

    // Listen for Day/Night theme toggles to adapt 3D stage lighting
    window.addEventListener('paci-theme-changed', (e) => {
      const isDark = e.detail?.isNight;
      const stageWrapper = document.getElementById('storybook-stage-wrapper');
      if (stageWrapper) {
        stageWrapper.style.backgroundColor = isDark ? STORYBOOK_CONFIG.backgroundColorNight : STORYBOOK_CONFIG.backgroundColor;
      }
    });

    // Initial indicator update after slight delay to allow 3D scene mount
    setTimeout(() => {
      updatePageIndicator();
      updatePageModeLabel();
    }, 350);

  } catch (err) {
    console.error('Failed to initialize DearFlip virtual book:', err);
  }

  return flipbookInstance;
}

function updatePageIndicator() {
  const statusLabel = document.getElementById('book-status-label');
  if (!statusLabel || !flipbookInstance) return;

  const target = flipbookInstance.target;
  const activePage = target ? (target._activePage || target.activePage || 1) : 1;
  const totalPages = STORYBOOK_PAGES.length;
  const isSingleMode = target && target.pageMode === window.DFLIP?.PAGE_MODE?.SINGLE;

  if (isSingleMode) {
    statusLabel.textContent = `Page ${activePage} of ${totalPages}`;
  } else if (activePage <= 1) {
    statusLabel.textContent = 'Front Cover (Closed)';
  } else if (activePage >= totalPages) {
    statusLabel.textContent = 'Back Cover (Closed)';
  } else {
    // In double page mode, pages are viewed in facing spreads (e.g. 2–3)
    const leftPage = activePage % 2 === 0 ? activePage : activePage - 1;
    const rightPage = leftPage + 1;
    statusLabel.textContent = `Pages ${leftPage}–${Math.min(rightPage, totalPages)}`;
  }
}

function updatePageModeLabel() {
  const modeBtn = document.getElementById('book-btn-pagemode');
  if (!modeBtn || !flipbookInstance) return;
  const target = flipbookInstance.target;
  const isSingle = target && target.pageMode === window.DFLIP?.PAGE_MODE?.SINGLE;
  modeBtn.textContent = isSingle ? '📄 Single Page' : '📖 Double Spread';
  modeBtn.title = isSingle ? 'Switch to Double Spread View' : 'Switch to Single Page View';
}

function setupCustomControls() {
  const coverBtn = document.getElementById('book-btn-cover');
  const prevBtn = document.getElementById('book-btn-prev');
  const nextBtn = document.getElementById('book-btn-next');
  const endBtn = document.getElementById('book-btn-end');
  const modeBtn = document.getElementById('book-btn-pagemode');
  const fsBtn = document.getElementById('book-btn-fullscreen');

  if (coverBtn) {
    coverBtn.addEventListener('click', () => {
      if (flipbookInstance) {
        flipbookInstance.gotoPage(1);
        if (window.sound) window.sound.playPop();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (flipbookInstance) {
        flipbookInstance.prev();
        if (window.sound) window.sound.playPop();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (flipbookInstance) {
        flipbookInstance.next();
        if (window.sound) window.sound.playPop();
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener('click', () => {
      if (flipbookInstance) {
        flipbookInstance.gotoPage(STORYBOOK_PAGES.length);
        if (window.sound) window.sound.playPop();
      }
    });
  }

  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      if (flipbookInstance) {
        const nativeModeBtn = document.querySelector('.df-ui-pagemode');
        if (nativeModeBtn) {
          nativeModeBtn.click();
        } else if (typeof flipbookInstance.setPageMode === 'function') {
          const isCurrentlySingle = flipbookInstance.target.pageMode === window.DFLIP.PAGE_MODE.SINGLE;
          flipbookInstance.setPageMode(!isCurrentlySingle);
        }
        setTimeout(() => {
          updatePageModeLabel();
          updatePageIndicator();
        }, 150);
        if (window.sound) window.sound.playPop();
      }
    });
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (flipbookInstance && flipbookInstance.ui && typeof flipbookInstance.ui.fullScreen === 'function') {
        flipbookInstance.ui.fullScreen();
      } else {
        const nativeFsBtn = document.querySelector('.df-ui-fullscreen');
        if (nativeFsBtn) {
          nativeFsBtn.click();
        } else {
          const stageWrapper = document.getElementById('storybook-stage-wrapper');
          if (stageWrapper && document.fullscreenElement !== stageWrapper) {
            stageWrapper.requestFullscreen?.();
          } else if (document.fullscreenElement) {
            document.exitFullscreen?.();
          }
        }
      }
      if (window.sound) window.sound.playPop();
    });
  }
}

function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    // Ignore keyboard events when typing in input, textarea, or contentEditable
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    // Only handle if flipbook is initialized
    if (!flipbookInstance) return;

    // Check if storybook section is currently visible or in viewport/fullscreen
    const stage = document.getElementById('storybook-section');
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    const isFullscreen = !!document.fullscreenElement;

    if (!isVisible && !isFullscreen) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      flipbookInstance.next();
      updatePageIndicator();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      flipbookInstance.prev();
      updatePageIndicator();
    } else if (e.key === 'Home') {
      e.preventDefault();
      flipbookInstance.gotoPage(1);
      updatePageIndicator();
    } else if (e.key === 'End') {
      e.preventDefault();
      flipbookInstance.gotoPage(STORYBOOK_PAGES.length);
      updatePageIndicator();
    }
  });
}
