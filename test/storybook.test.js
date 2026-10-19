// ============================================================================
// STORYBOOK & VIRTUAL FLIPBOOK TEST SUITE
// Tests page assets, HTML markup, ordering relative to #biography and #empire,
// DearFlip script registration, and JS module interface.
// ============================================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Virtual Storybook Test Suite...\n');

// --- 1. Page Assets Verification ---
console.log('--- 1. Page Assets Verification ---');

const storybookDir = path.join(rootDir, 'public', 'storybook');
assert.ok(fs.existsSync(storybookDir), 'public/storybook directory must exist');

const expectedPages = [
  'page-01.jpg',
  'page-02.jpg',
  'page-03.jpg',
  'page-04.jpg',
  'page-05.jpg',
  'page-06.jpg',
  'page-07.jpg',
  'page-08.jpg',
  'page-09.jpg',
  'page-10.jpg',
  'page-11.jpg',
  'page-12.jpg'
];

for (const pageName of expectedPages) {
  const pagePath = path.join(storybookDir, pageName);
  assert.ok(fs.existsSync(pagePath), `Page file ${pageName} must exist in public/storybook/`);
  const stat = fs.statSync(pagePath);
  assert.ok(stat.size > 50000, `Page file ${pageName} must be non-empty and reasonably sized (was ${stat.size} bytes)`);
}
console.log('  ✅ All 12 storybook pages exist with crisp high-resolution sizes');

// --- 2. HTML Markup & Section Placement ---
console.log('\n--- 2. HTML Markup & Section Placement ---');
const indexPath = path.join(rootDir, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

const bioIndex = indexHtml.indexOf('id="biography"');
const storybookIndex = indexHtml.indexOf('id="storybook-section"');
const stonksIndex = indexHtml.indexOf('id="stonks-section"');
const empireIndex = indexHtml.indexOf('id="empire"');

assert.ok(bioIndex !== -1, '#biography section must exist in index.html');
assert.ok(storybookIndex !== -1, '#storybook-section must exist in index.html');
assert.ok(stonksIndex !== -1, '#stonks-section must exist in index.html');
assert.equal(empireIndex, -1, '#empire section must be removed completely as requested');

assert.ok(
  storybookIndex > bioIndex,
  `#storybook-section (index ${storybookIndex}) must be placed AFTER #biography (index ${bioIndex})`
);
assert.ok(
  stonksIndex > storybookIndex,
  `#stonks-section (index ${stonksIndex}) must be placed AFTER #storybook-section (index ${storybookIndex})`
);
console.log('  ✅ #storybook-section placed after #biography; #empire removed; #stonks-section positioned cleanly');

// Verify clean frameless stage and section title
assert.ok(indexHtml.includes('THE LEGEND OF BABU'), 'index.html must include THE LEGEND OF BABU section title');
assert.ok(indexHtml.includes('id="flipbook-viewer"'), 'index.html must include #flipbook-viewer container');
assert.ok(indexHtml.includes('id="storybook-stage-wrapper"'), 'index.html must include #storybook-stage-wrapper');
assert.ok(indexHtml.includes('"STONKS ONLY GO UP."'), 'index.html must include giant STONKS ONLY GO UP section');
console.log('  ✅ Frameless book stage, THE LEGEND OF BABU title, and giant Stonks section verified');

const storybookJsPath = path.join(rootDir, 'src', 'storybook.js');
const storybookCode = fs.readFileSync(storybookJsPath, 'utf-8');

// --- 3. DearFlip CSS & Scripts ---
console.log('\n--- 3. DearFlip CSS & Scripts ---');
assert.ok(indexHtml.includes('dflip.min.css'), 'index.html must include dflip.min.css');
// jQuery and DearFlip are now loaded dynamically on-demand by src/storybook.js
assert.ok(storybookCode.includes('jquery-3.7.1.min.js'), 'src/storybook.js must include dynamic loader for jQuery');
assert.ok(storybookCode.includes('dflip.min.js'), 'src/storybook.js must include dynamic loader for dflip.min.js');
console.log('  ✅ DearFlip stylesheets and runtime scripts correctly embedded');

// --- 4. JavaScript Module Interface ---
console.log('\n--- 4. JavaScript Module Interface ---');
assert.ok(fs.existsSync(storybookJsPath), 'src/storybook.js must exist');
assert.ok(storybookCode.includes('export const STORYBOOK_PAGES'), 'src/storybook.js must export STORYBOOK_PAGES');
assert.ok(storybookCode.includes('export const STORYBOOK_CONFIG'), 'src/storybook.js must export STORYBOOK_CONFIG');
assert.ok(storybookCode.includes('export function initStorybook'), 'src/storybook.js must export initStorybook');

// Verify all 12 pages in STORYBOOK_PAGES
for (let i = 1; i <= 12; i++) {
  const pad = String(i).padStart(2, '0');
  assert.ok(
    storybookCode.includes(`/storybook/page-${pad}.jpg`),
    `STORYBOOK_PAGES must include /storybook/page-${pad}.jpg`
  );
}

// Verify that fullScreen, pageNumber, and layout change controls are removed
assert.ok(storybookCode.includes('allControls: "altPrev,altNext"'), 'allControls must only contain altPrev,altNext');
assert.ok(storybookCode.includes('hideControls: "fullScreen,pageNumber,pageMode,'), 'hideControls must hide fullScreen, pageNumber, and pageMode');

// Verify main.js imports and invokes initStorybook
const mainJsPath = path.join(rootDir, 'src', 'main.js');
const mainCode = fs.readFileSync(mainJsPath, 'utf-8');
assert.ok(mainCode.includes("import { initStorybook } from './storybook.js'"), 'src/main.js must import initStorybook');
assert.ok(mainCode.includes('initStorybook()'), 'src/main.js must call initStorybook()');
console.log('  ✅ JavaScript module exports 12 pages and integrates with main.js lifecycle');

console.log('\n🎉 All Virtual Storybook Tests Passed Successfully!\n');
