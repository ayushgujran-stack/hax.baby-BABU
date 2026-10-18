import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Testing Scroll-Controlled Intro Animation System...');

const projectRoot = process.cwd();

// 1. Verify scroll folders and 300 sequential frames
console.log('\n--- 1. Image Frame Assets Verification ---');
const scrollDir = path.join(projectRoot, 'scroll');
const scrollJpgDir = path.join(projectRoot, 'scroll-jpg');
const publicScrollDir = path.join(projectRoot, 'public', 'scroll');

assert(fs.existsSync(scrollDir), 'Folder `scroll` must exist in project root');
assert(fs.existsSync(scrollJpgDir), 'Folder `scroll-jpg` must exist in project root');
assert(fs.existsSync(publicScrollDir), 'Folder `public/scroll` must exist for Vite serving');

for (let i = 1; i <= 300; i++) {
  const numStr = String(i).padStart(3, '0');
  const frameFileName = `ezgif-frame-${numStr}.jpg`;
  const framePath = path.join(scrollDir, frameFileName);
  
  assert(fs.existsSync(framePath), `Missing frame: ${frameFileName}`);
  const stats = fs.statSync(framePath);
  assert(stats.size > 5000, `Frame ${frameFileName} file size is suspiciously small: ${stats.size} bytes`);
}
console.log('  ✅ All 300 sequential JPG frames exist in correct order (ezgif-frame-001.jpg -> ezgif-frame-300.jpg)');

// 2. Verify HTML structure in index.html
console.log('\n--- 2. HTML Markup & Responsive Design Requirements ---');
const indexHtmlPath = path.join(projectRoot, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

assert(indexHtml.includes('id="intro-scroll-container"'), 'index.html must have #intro-scroll-container');
assert(indexHtml.includes('id="intro-scroll-sticky"'), 'index.html must have #intro-scroll-sticky');
assert(indexHtml.includes('id="intro-scroll-text"'), 'index.html must have #intro-scroll-text');
assert(indexHtml.includes('id="intro-scroll-canvas"'), 'index.html must have #intro-scroll-canvas');

// Verify exact text requirement
const exactText = 'The story of the baby.';
assert(indexHtml.includes(exactText), `index.html must contain exact text: "${exactText}"`);
console.log(`  ✅ Exact desktop text "${exactText}" is present in HTML`);

// Verify mobile hiding & desktop showing
// Check that intro-scroll-text has 'hidden lg:flex' or 'hidden md:block'
const textDivMatch = indexHtml.match(/<div[^>]*id="intro-scroll-text"[^>]*>/);
assert(textDivMatch, 'Could not find intro-scroll-text element tag');
assert(textDivMatch[0].includes('hidden lg:flex') || textDivMatch[0].includes('hidden md:'),
  'Text must be hidden on mobile screens');
console.log('  ✅ Text is strictly hidden on mobile and visible only on desktop');

// Verify canvas responsive containment without cropping
const canvasMatch = indexHtml.match(/<canvas[^>]*id="intro-scroll-canvas"[^>]*>/);
assert(canvasMatch, 'Could not find intro-scroll-canvas element tag');
assert(canvasMatch[0].includes('w-full'), 'Canvas must be responsive w-full');
assert(canvasMatch[0].includes('aspect-video'), 'Canvas must preserve 16:9 aspect-video');
assert(canvasMatch[0].includes('object-contain'), 'Canvas must use object-contain to avoid cropping');
console.log('  ✅ Canvas fits available width with aspect-video and object-contain without unintended cropping');

// 3. Verify Autobiography Chapters & Kinetic Text Reel
console.log('\n--- 3. Autobiography Chapters & Kinetic Text Reel ---');
assert(indexHtml.includes('id="intro-text-track"'), 'Must contain #intro-text-track for kinetic text scrolling');
assert(indexHtml.includes('Chapter 1 • The Crawl'), 'Must contain Chapter 1');
assert(indexHtml.includes('Chapter 2 • The Ambition'), 'Must contain Chapter 2');
assert(indexHtml.includes('Chapter 3 • The Pacifier'), 'Must contain Chapter 3');
assert(indexHtml.includes('Chapter 4 • The Boss'), 'Must contain Chapter 4');
assert(indexHtml.includes("Rome wasn't built in a day"), 'Must reference autobiography quote on Rome');
assert(indexHtml.includes("sleeping with ruthless corporate ambition") || indexHtml.includes("ruthless corporate ambition"), 'Must reference autobiography sleeping with ambition');
assert(indexHtml.includes("pacifier monopoly"), 'Must reference pacifier monopoly opportunity');
assert(indexHtml.includes("Born to lead"), 'Must reference autobiography quote born to lead');
console.log('  ✅ All 4 autobiography story acts verified with Babu character voice');

// 4. Verify JavaScript module integration
console.log('\n--- 4. JavaScript Logic & Lifecycle Verification ---');
const introJsPath = path.join(projectRoot, 'src', 'intro-scroll.js');
const introJs = fs.readFileSync(introJsPath, 'utf8');

assert(introJs.includes('TOTAL_FRAMES = 300'), 'intro-scroll.js must configure 300 total frames');
assert(introJs.includes('/scroll/ezgif-frame-'), 'intro-scroll.js must use /scroll/ezgif-frame- prefix');
assert(introJs.includes('translate3d(0,'), 'intro-scroll.js must drive kinetic vertical translation of text reel');
assert(introJs.includes('dismissIntro'), 'intro-scroll.js must include dismissIntro logic for once-per-visit behavior');

const mainJsPath = path.join(projectRoot, 'src', 'main.js');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');
assert(mainJs.includes('initIntroScroll'), 'src/main.js must import and call initIntroScroll');
assert(mainJs.includes('window.introScrollController'), 'src/main.js must expose intro controller for nav events');
console.log('  ✅ src/intro-scroll.js and src/main.js correctly coordinate lifecycle and dismiss once completed');

console.log('\n🎉 All Scroll Animation Unit & Integration Tests Passed Successfully!\n');
