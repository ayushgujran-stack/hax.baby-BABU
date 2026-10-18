import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Stonks Candlestick Live Engine & Interactive Controls', async (t) => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const stonksSrc = fs.readFileSync(path.join(rootDir, 'src/stonks-chart.js'), 'utf8');
  const mainJs = fs.readFileSync(path.join(rootDir, 'src/main.js'), 'utf8');

  await t.test('1. HTML Markup contains canvas, live status, and PUMP IT button', () => {
    assert.match(indexHtml, /id="stonks-canvas"/, 'Should have stonks-canvas element');
    assert.match(indexHtml, /id="stonks-pump-btn"/, 'Should have PUMP IT button');
    assert.match(indexHtml, /id="stonks-status-pill"/, 'Should have live status pill');
    assert.match(indexHtml, /id="stonks-live-price"/, 'Should have live price ticker');
    assert.match(indexHtml, /id="stonks-tooltip"/, 'Should have cartoon scrubber tooltip');
    assert.match(indexHtml, /id="stonks-ath-val"/, 'Should have dynamic ATH badge');
  });

  await t.test('2. Engine module defines StonksEngine class and initStonksChart', () => {
    assert.match(stonksSrc, /export class StonksEngine/, 'Should export StonksEngine');
    assert.match(stonksSrc, /export function initStonksChart/, 'Should export initStonksChart');
    assert.match(stonksSrc, /pumpStock\(\)/, 'Should have pumpStock handler');
    assert.match(stonksSrc, /tick\(\)/, 'Should have tick loop generator');
    assert.match(stonksSrc, /drawPatternCandle/, 'Should render candy striped candles');
  });

  await t.test('3. main.js registers initStonksChart on startup', () => {
    assert.match(mainJs, /import \{ initStonksChart \} from '\.\/stonks-chart\.js';/, 'Imports initStonksChart');
    assert.match(mainJs, /initStonksChart\(\);/, 'Calls initStonksChart on DOMContentLoaded');
  });
});
