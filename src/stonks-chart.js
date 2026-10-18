/**
 * Stonks Candlestick Live Engine
 * Neo-brutalist cartoon financial chart with live ticking candysticks,
 * upward executive mandate, interactive hover scrubber, and a "PUMP IT" button.
 */

export class StonksEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.container = this.canvas.parentElement;
    this.athBadge = document.getElementById('stonks-ath-val');
    this.pumpBtn = document.getElementById('stonks-pump-btn');
    this.statusPill = document.getElementById('stonks-status-pill');
    this.livePriceEl = document.getElementById('stonks-live-price');
    this.tooltipEl = document.getElementById('stonks-tooltip');

    this.athPrice = 1000000000; // ₹1 Billion base
    this.currentPrice = 1000420000;
    this.prevPrice = this.currentPrice;

    // Visual theme palette
    this.colors = {
      bg: '#FFFDF5',
      ink: '#292521',
      red: '#FF5B55',
      yellow: '#FFD84D',
      pink: '#FF719A',
      blue: '#55B9F5',
      mint: '#B8E986',
      white: '#FFF8E8'
    };

    this.candleWidth = 24;
    this.candleGap = 16;
    this.candles = [];
    this.sparkles = [];
    this.pumpEffects = [];

    this.mouse = { x: -1, y: -1, active: false };
    this.isRunning = false;
    this.lastTickTime = performance.now();
    this.tickInterval = 1400; // New candle every 1.4s

    this.initPreloadCandles();
    this.bindEvents();
    this.resize();
    this.start();
  }

  initPreloadCandles() {
    let p = 120;
    const count = 30;
    for (let i = 0; i < count; i++) {
      const isUp = Math.random() > 0.18; // 82% up!
      const change = isUp ? Math.random() * 14 + 4 : -(Math.random() * 8 + 2);
      const open = p;
      const close = Math.max(30, open + change);
      const high = Math.max(open, close) + Math.random() * 8 + 2;
      const low = Math.min(open, close) - Math.random() * 6 - 1;
      p = close;

      this.candles.push({
        open,
        close,
        high,
        low,
        isUp,
        pattern: this.getRandomPattern(isUp),
        label: this.getRandomEvent(isUp),
        time: new Date(Date.now() - (count - i) * 60000)
      });
    }
  }

  getRandomPattern(isUp) {
    if (isUp) {
      const types = ['mint', 'pink', 'blue', 'yellow-red'];
      return types[Math.floor(Math.random() * types.length)];
    }
    return 'pink'; // Bear candle is still cute pink
  }

  getRandomEvent(isUp) {
    const bullishEvents = [
      'BABY ACQUIRED MILK RANCH',
      'PACIFIER FUTURES AT ATH',
      'NAP TIME CRUSHED ESTIMATES',
      'EXECUTIVE GIGGLE FILED',
      'BABY ACCIDENTAL IP BUYOUT',
      'CANDYSTICK BREAKOUT CONFIRMED',
      'WHOLE MILK DIVIDEND DISTRIBUTED'
    ];
    const bearEvents = [
      'MINI TEETHING SQUEEZE',
      'JUICE BOX SLIGHT LEAK',
      'BEAR MARKET CANCELED BY MOM'
    ];
    const list = isUp ? bullishEvents : bearEvents;
    return list[Math.floor(Math.random() * list.length)];
  }

  resize() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Scrubber interaction
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.active = false;
      if (this.tooltipEl) this.tooltipEl.classList.add('opacity-0');
    });

    // Touch support for mobile
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.touches[0].clientX - rect.left;
        this.mouse.y = e.touches[0].clientY - rect.top;
        this.mouse.active = true;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.active = false;
      if (this.tooltipEl) this.tooltipEl.classList.add('opacity-0');
    });

    // PUMP IT BUTTON
    if (this.pumpBtn) {
      this.pumpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.pumpStock();
      });
    }

    // Observer to pause when out of view to save battery
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!this.isRunning) this.start();
        } else {
          this.isRunning = false;
        }
      });
    }, { threshold: 0.1 });

    observer.observe(this.container);
  }

  pumpStock() {
    // Big green super candle
    const last = this.candles[this.candles.length - 1];
    const pumpAmount = Math.floor(Math.random() * 25000000 + 15000000);
    this.currentPrice += pumpAmount;

    // Visual button squash
    if (this.pumpBtn) {
      this.pumpBtn.classList.add('scale-90', 'bg-sunshine-yellow');
      setTimeout(() => this.pumpBtn.classList.remove('scale-90'), 150);
    }

    // Flash status pill
    if (this.statusPill) {
      this.statusPill.innerHTML = `🚀 EXECUTIVE PUMP INJECTED! +₹${(pumpAmount / 10000000).toFixed(1)}Cr`;
      this.statusPill.classList.add('bg-crayon-red', 'text-white');
      setTimeout(() => {
        this.statusPill.innerHTML = `● LIVE MARKET: ULTRA BULLISH`;
        this.statusPill.classList.remove('bg-crayon-red', 'text-white');
      }, 1800);
    }

    // Force massive candle
    const open = last ? last.close : 150;
    const close = open + (Math.random() * 35 + 25);
    const candle = {
      open,
      close,
      high: close + 15,
      low: open - 2,
      isUp: true,
      pattern: 'yellow-red',
      label: '🚨 SMASHED EXECUTIVE PUMP BUTTON 🚀',
      time: new Date()
    };
    this.candles.push(candle);

    // Burst sparkles across the chart
    for (let i = 0; i < 24; i++) {
      this.sparkles.push({
        x: this.width - 60 + (Math.random() * 60 - 30),
        y: this.height * 0.4 + (Math.random() * 80 - 40),
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 8 - 2,
        size: Math.random() * 8 + 4,
        color: [this.colors.red, this.colors.yellow, this.colors.mint, this.colors.blue][Math.floor(Math.random() * 4)],
        life: 1.0
      });
    }

    this.updateATHBadge();
  }

  tick() {
    const last = this.candles[this.candles.length - 1];
    const isUp = Math.random() > 0.15; // 85% up!
    const change = isUp ? (Math.random() * 12 + 2) : -(Math.random() * 6 + 1);
    const open = last ? last.close : 120;
    const close = Math.max(30, open + change);
    const high = Math.max(open, close) + Math.random() * 8 + 2;
    const low = Math.min(open, close) - Math.random() * 4 - 1;

    // Price delta
    const priceChange = isUp ? Math.floor(Math.random() * 450000 + 120000) : -Math.floor(Math.random() * 150000);
    this.currentPrice = Math.max(1000000000, this.currentPrice + priceChange);

    this.candles.push({
      open,
      close,
      high,
      low,
      isUp,
      pattern: this.getRandomPattern(isUp),
      label: this.getRandomEvent(isUp),
      time: new Date()
    });

    // Sparkle for big up candles
    if (isUp && change > 8) {
      this.sparkles.push({
        x: this.width - 50,
        y: this.height * 0.35 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 1,
        size: Math.random() * 6 + 4,
        color: this.colors.yellow,
        life: 1.0
      });
    }

    // Keep memory clean
    if (this.candles.length > 70) {
      this.candles.shift();
    }

    this.updateATHBadge();
  }

  updateATHBadge() {
    if (this.currentPrice > this.athPrice) {
      this.athPrice = this.currentPrice;
    }
    if (this.athBadge) {
      const cr = (this.currentPrice / 10000000).toFixed(2);
      this.athBadge.textContent = `ALL TIME HIGH: ₹${cr} CR`;
    }
    if (this.livePriceEl) {
      const cr = (this.currentPrice / 10000000).toFixed(2);
      this.livePriceEl.textContent = `₹${cr} Cr`;
    }
  }

  drawPatternCandle(x, y, w, h, pattern, isUp) {
    const ctx = this.ctx;
    ctx.save();

    const r = Math.min(6, w / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [r, r, r, r]);
    ctx.clip();

    let baseColor = isUp ? '#B8E986' : '#FF719A';
    let stripeColor = '#FFF8E8';

    if (pattern === 'yellow-red') {
      baseColor = '#FF5B55';
      stripeColor = '#FFD84D';
    } else if (pattern === 'blue') {
      baseColor = '#55B9F5';
      stripeColor = '#FFF8E8';
    } else if (pattern === 'pink') {
      baseColor = '#FF719A';
      stripeColor = '#FFF8E8';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = stripeColor;
    const stripeWidth = 6;
    for (let sx = -h; sx < w + h; sx += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x + sx, y + h);
      ctx.lineTo(x + sx + stripeWidth, y + h);
      ctx.lineTo(x + sx + stripeWidth + h, y);
      ctx.lineTo(x + sx + h, y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.colors.ink;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [r, r, r, r]);
    ctx.stroke();
  }

  drawSparkle(s) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = s.color;
    ctx.strokeStyle = this.colors.ink;
    ctx.lineWidth = 1;
    ctx.globalAlpha = Math.max(0, s.life);

    const r = s.size;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  render() {
    if (!this.ctx || !this.width) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle dashed chart guide lines
    ctx.strokeStyle = 'rgba(41, 37, 33, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    const gridLines = 4;
    for (let i = 1; i <= gridLines; i++) {
      const gy = (h / (gridLines + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(10, gy);
      ctx.lineTo(w - 10, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Calculate scaling range
    const visibleCount = Math.floor((w - 40) / (this.candleWidth + this.candleGap));
    const startIndex = Math.max(0, this.candles.length - visibleCount);
    const visibleCandles = this.candles.slice(startIndex);

    if (visibleCandles.length === 0) return;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    visibleCandles.forEach(c => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
    });

    const paddingY = 35;
    const priceRange = Math.max(20, maxPrice - minPrice);
    const scaleY = (p) => h - paddingY - ((p - minPrice) / priceRange) * (h - paddingY * 2);

    // Draw connecting trend squiggly line
    ctx.beginPath();
    ctx.strokeStyle = this.colors.red;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);

    visibleCandles.forEach((c, idx) => {
      const cx = 30 + idx * (this.candleWidth + this.candleGap) + this.candleWidth / 2;
      const cy = scaleY(c.close);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw candlesticks
    let hoveredCandle = null;
    let hoveredX = 0;
    let hoveredY = 0;

    visibleCandles.forEach((c, idx) => {
      const cx = 30 + idx * (this.candleWidth + this.candleGap);
      const topY = scaleY(Math.max(c.open, c.close));
      const bottomY = scaleY(Math.min(c.open, c.close));
      const candleHeight = Math.max(14, bottomY - topY);
      const wickHighY = scaleY(c.high);
      const wickLowY = scaleY(c.low);
      const centerX = cx + this.candleWidth / 2;

      // Draw Top/Bottom Wicks
      ctx.strokeStyle = this.colors.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, wickHighY);
      ctx.lineTo(centerX, topY);
      ctx.moveTo(centerX, bottomY);
      ctx.lineTo(centerX, wickLowY);
      ctx.stroke();

      // Pacifier tiny bead on wick ends
      ctx.fillStyle = c.isUp ? this.colors.mint : this.colors.pink;
      ctx.beginPath();
      ctx.arc(centerX, wickHighY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.colors.white;
      ctx.beginPath();
      ctx.arc(centerX, wickLowY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Candlestick Body with candy patterns
      this.drawPatternCandle(cx, topY, this.candleWidth, candleHeight, c.pattern, c.isUp);

      // Check mouse hover for scrubber
      if (this.mouse.active && Math.abs(this.mouse.x - centerX) < (this.candleWidth + this.candleGap) / 2) {
        hoveredCandle = c;
        hoveredX = centerX;
        hoveredY = topY;
      }
    });

    // Update or hide tooltip
    if (hoveredCandle && this.tooltipEl) {
      // Draw crosshair vertical line
      ctx.strokeStyle = 'rgba(255, 91, 85, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoveredX, 10);
      ctx.lineTo(hoveredX, h - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip content & position
      this.tooltipEl.classList.remove('opacity-0');
      const timeStr = hoveredCandle.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.tooltipEl.innerHTML = `
        <div class="font-label-stamp text-[10px] text-crayon-red uppercase flex items-center justify-between gap-4">
          <span>${timeStr}</span>
          <span class="${hoveredCandle.isUp ? 'text-green-600' : 'text-crayon-pink'} font-black">${hoveredCandle.isUp ? '▲ BULLISH' : '▼ DIP'}</span>
        </div>
        <div class="font-display-md text-sm font-black text-ink-black mt-0.5">${hoveredCandle.label}</div>
        <div class="text-[10px] text-on-surface-variant font-medium mt-1">Candle: ${hoveredCandle.open.toFixed(1)} → ${hoveredCandle.close.toFixed(1)}</div>
      `;

      const tooltipWidth = 190;
      let leftPos = hoveredX + 15;
      if (leftPos + tooltipWidth > w) leftPos = hoveredX - tooltipWidth - 15;
      this.tooltipEl.style.left = `${Math.max(10, leftPos)}px`;
      this.tooltipEl.style.top = `${Math.min(h - 90, Math.max(15, hoveredY - 30))}px`;
    } else if (this.tooltipEl) {
      this.tooltipEl.classList.add('opacity-0');
    }

    // Update and draw sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.025;
      this.drawSparkle(s);
      if (s.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    if (currentTime - this.lastTickTime > this.tickInterval) {
      this.tick();
      this.lastTickTime = currentTime;
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.isRunning = false;
  }
}

export function initStonksChart() {
  const canvas = document.getElementById('stonks-canvas');
  if (canvas) {
    return new StonksEngine('stonks-canvas');
  }
  return null;
}
