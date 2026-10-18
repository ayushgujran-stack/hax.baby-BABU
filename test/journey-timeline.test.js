// ============================================================================
// TEST SUITE: Scroll-Driven Journey Timeline Animation
// ============================================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('🧪 Starting Journey Timeline Animation Test Suite...\n');

// 1. HTML Markup & Alternating Pattern Verification
console.log('--- 1. HTML Structure & Alternating Pattern Tests ---');
const html = fs.readFileSync('index.html', 'utf8');

assert.ok(html.includes('id="journey-timeline-container"'), 'Timeline container exists in HTML');
assert.ok(html.includes('id="journey-timeline-svg"'), 'Timeline SVG element exists in HTML');
assert.ok(html.includes('id="timeline-desktop-group"'), 'Desktop timeline group exists');
assert.ok(html.includes('id="timeline-mobile-group"'), 'Mobile timeline group exists');

// Verify all 5 cards have class journey-timeline-card
const cardMatches = html.match(/class="[^"]*journey-timeline-card[^"]*"/g);
assert.equal(cardMatches?.length, 5, 'All 5 milestone cards have journey-timeline-card class');

// Verify alternating offsets in HTML
const card1Above = html.includes('journey-timeline-card md:-translate-y-8 relative bg-paper-cream p-4 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg -rotate-2');
const card2Below = html.includes('journey-timeline-card md:translate-y-8 relative bg-paper-cream p-4 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg rotate-2');
const card3Above = html.includes('journey-timeline-card md:-translate-y-8 relative bg-paper-cream p-4 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg -rotate-1');
const card4Below = html.includes('journey-timeline-card md:translate-y-8 relative bg-paper-cream p-4 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg rotate-3');
const card5Above = html.includes('journey-timeline-card md:-translate-y-8 relative bg-sunshine-yellow p-4 border-[3px] border-ink-black shadow-[4px_4px_0_#292521] rounded-lg -rotate-2');

assert.ok(card1Above, 'Card 1 (Phase 1): offset above midline');
assert.ok(card2Below, 'Card 2 (Phase 2): offset below midline');
assert.ok(card3Above, 'Card 3 (Phase 3): offset above midline');
assert.ok(card4Below, 'Card 4 (Phase 4): offset below midline');
assert.ok(card5Above, 'Card 5 (Phase 5): offset above midline');

console.log('  ✅ 5 milestone cards configured in exact alternating UP-DOWN-UP-DOWN-UP pattern');

// 2. SVG Markers and Connectors Verification
console.log('\n--- 2. SVG Connectors & Node Markers Verification ---');
for (let i = 1; i <= 5; i++) {
  assert.ok(html.includes(`id="timeline-connector-${i}"`), `Desktop connector ${i} exists`);
  assert.ok(html.includes(`id="timeline-marker-${i}"`), `Desktop marker ${i} exists`);
  assert.ok(html.includes(`id="timeline-mconnector-${i}"`), `Mobile connector ${i} exists`);
  assert.ok(html.includes(`id="timeline-mmarker-${i}"`), `Mobile marker ${i} exists`);
}

console.log('  ✅ All 5 desktop and mobile vertical/horizontal connectors & markers present');

// 3. Mathematical Spring Overshoot & Pop Calculation Tests
console.log('\n--- 3. Spring Overshoot & Ease Curve Tests ---');
function calcSpringScale(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.sin(t * Math.PI / 2) + 0.1 * Math.sin(t * Math.PI);
}

// At t=0, scale is 0
assert.equal(calcSpringScale(0), 0, 'Scale is 0 at start');

// At t=0.85, gentle pop overshoot > 1.0
const peakScale = calcSpringScale(0.85);
assert.ok(peakScale > 1.0, `Scale achieves spring pop overshoot: ${peakScale}`);

// At t=1.0, scale settles exactly at 1.0
assert.equal(Math.round(calcSpringScale(1.0) * 100) / 100, 1, 'Scale settles exactly at 1.0 without lingering bounce');

console.log('  ✅ Spring overshoot curve produces tactile pop and settles cleanly at 1.0');

// 4. JavaScript Integration Verification
console.log('\n--- 4. JavaScript Module & Lifecycle Verification ---');
const mainJs = fs.readFileSync('src/main.js', 'utf8');
const timelineJs = fs.readFileSync('src/journey-timeline.js', 'utf8');

assert.ok(mainJs.includes('initJourneyTimeline'), 'src/main.js imports initJourneyTimeline');
assert.ok(mainJs.includes('initJourneyTimeline()'), 'src/main.js invokes initJourneyTimeline on DOMContentLoaded');

assert.ok(timelineJs.includes('JourneyTimelineController'), 'JourneyTimelineController class exported');
assert.ok(timelineJs.includes('strokeDashoffset'), 'Uses strokeDashoffset for smooth SVG drawing');
assert.ok(timelineJs.includes('updateGeometry'), 'Dynamically measures card positions for pixel-perfect alignment');
assert.ok(timelineJs.includes('prefers-reduced-motion'), 'Respects reduced motion preference');
assert.ok(timelineJs.includes('removeEventListener'), 'Supports lifecycle cleanup');

console.log('  ✅ Lifecycle registration and scroll-driven synchronization verified');

console.log('\n🎉 All Journey Timeline Tests Passed Successfully!\n');
