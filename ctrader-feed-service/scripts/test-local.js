/**
 * Local Verification Test for cTrader Feed Service
 * Validates module imports, tick merging, decimal precision, and candle calculations.
 */

const path = require('path');
const assert = require('assert');

console.log('=== cTrader Feed Service Local Diagnostic Test ===\n');

// 1. Check all modules load
console.log('1. Checking module integrity...');
const modules = [
  './src/ctrader/state',
  './src/ctrader/constants',
  './src/ctrader/symbols.service',
  './src/ctrader/token.service',
  './src/ctrader/market-data.service',
  './src/ctrader/protocol.client',
  './src/ctrader/socket.client',
  './src/feed-cache.service',
  './src/security',
];

for (const mod of modules) {
  try {
    require(path.resolve(__dirname, '..', mod));
    console.log(`  [PASS] ${mod}`);
  } catch (err) {
    console.error(`  [FAIL] ${mod}: ${err.message}`);
    process.exit(1);
  }
}

// 2. Test Market Data Service Tick Normalization & Decimal Precision
console.log('\n2. Testing Tick Normalization & Decimal Precision...');
const { ctraderConfig } = require('../src/ctrader/state');
const {
  buildQuote,
  formatPrice,
  inferPriceDigits,
  normalizeSpotEvent,
} = require('../src/ctrader/market-data.service');
const { recordTick, getData } = require('../src/feed-cache.service');

// Register mock EURUSD symbol
ctraderConfig.symbols.set(1, {
  id: 1,
  name: 'EURUSD',
  displayName: 'EURUSD',
  normalizedName: 'EURUSD',
  digits: null, // Test fallback inference when digits is null
});

// Simulate initial tick with both bid and ask
const tick1 = normalizeSpotEvent({
  symbolId: 1,
  bid: 116880, // scaled by 100,000 -> 1.16880
  ask: 116885, // scaled by 100,000 -> 1.16885
  timestamp: Date.now(),
}, () => ({}));

assert.strictEqual(tick1.bid, 1.16880, 'Initial bid should be 1.16880');
assert.strictEqual(tick1.ask, 1.16885, 'Initial ask should be 1.16885');
ctraderConfig.latestTicks.set(1, tick1);
recordTick(tick1);
console.log('  [PASS] Initial tick parsed:', { bid: tick1.bid, ask: tick1.ask, bidText: tick1.bidText, askText: tick1.askText });

// Simulate subsequent spot tick where ONLY ask changed (bid omitted / 0)
const tick2 = normalizeSpotEvent({
  symbolId: 1,
  bid: 0, // omitted / zero in cTrader delta event
  ask: 116890,
  timestamp: Date.now() + 1000,
}, () => ({}));

assert.strictEqual(tick2.bid, 1.16880, 'Bid should preserve previous valid value (1.16880) and not become 0');
assert.strictEqual(tick2.ask, 1.16890, 'Ask should update to new value (1.16890)');
ctraderConfig.latestTicks.set(1, tick2);
recordTick(tick2);
console.log('  [PASS] Delta tick (bid preserved):', { bid: tick2.bid, ask: tick2.ask, bidText: tick2.bidText, askText: tick2.askText });

// Verify quote formatting does not drop decimals
const quote = buildQuote(tick2);
assert.strictEqual(quote.bidText, '1.16880', 'bidText should preserve precision');
assert.strictEqual(quote.askText, '1.16890', 'askText should preserve precision');
assert.ok(quote.last > 1.1, `Quote last price should be around 1.16885, got: ${quote.last}`);
console.log('  [PASS] Quote formatting verified:', { bidText: quote.bidText, askText: quote.askText, last: quote.last });

// 3. Test Candle Generation
console.log('\n3. Testing Candle Generation (No 50% Price Spikes)...');
const snapshot = getData('EURUSD', { interval: '1m' });
assert.ok(snapshot.found, 'Snapshot for EURUSD should be found');
assert.ok(snapshot.ticks.length >= 2, 'Should contain cached ticks');

for (const candle of snapshot.candles) {
  const close = Array.isArray(candle) ? candle[4] : candle.close;
  const open = Array.isArray(candle) ? candle[1] : candle.open;
  assert.ok(close > 1.0, `Candle close should NOT have dropped to 0.58, got: ${close}`);
  assert.ok(open > 1.0, `Candle open should NOT have dropped to 0.58, got: ${open}`);
}
console.log('  [PASS] Candle prices verified cleanly without 50% drop spikes.');

// 4. Test 250 Candle Seeding with Array-of-Arrays and Object Formats
console.log('\n4. Testing 250 Candle Seed Cache (Array & Object format parsing)...');
const { seedCandles } = require('../src/feed-cache.service');
const nowSec = Math.floor(Date.now() / 1000);

// Generate 250 mock 1m candles spanning 250 minutes (Array format from cTrader fetch)
const mockArrayCandles = [];
for (let i = 250; i >= 1; i--) {
  const time = nowSec - (i * 60);
  mockArrayCandles.push([time, 1.1650, 1.1690, 1.1640, 1.1680, 100]);
}

seedCandles(1, '1m', mockArrayCandles);
const seededSnapshot = getData('EURUSD', { interval: '1m', limitCandles: 250 });
assert.strictEqual(seededSnapshot.candles.length, 250, `Expected 250 candles from seed cache, got: ${seededSnapshot.candles.length}`);
const firstOpen = Array.isArray(seededSnapshot.candles[0]) ? seededSnapshot.candles[0][1] : seededSnapshot.candles[0].open;
const lastClose = Array.isArray(seededSnapshot.candles[249]) ? seededSnapshot.candles[249][4] : seededSnapshot.candles[249].close;
assert.strictEqual(firstOpen, 1.1650, 'First candle open price should match');
assert.ok(Number.isFinite(lastClose) && lastClose >= 1.168, 'Last candle close price should match or merge live tick');
console.log(`  [PASS] Successfully seeded and retrieved ${seededSnapshot.candles.length} candles from Array-of-Arrays format.`);

// Test Object format
const mockObjectCandles = [];
for (let i = 250; i >= 1; i--) {
  const time = nowSec - (i * 60);
  mockObjectCandles.push({ time, open: 1.1700, high: 1.1750, low: 1.1690, close: 1.1720 });
}
seedCandles(1, '5m', mockObjectCandles);
const objectSnapshot = getData('EURUSD', { interval: '5m', limitCandles: 250 });
assert.strictEqual(objectSnapshot.candles.length, 250, `Expected 250 candles from seed cache, got: ${objectSnapshot.candles.length}`);
console.log(`  [PASS] Successfully seeded and retrieved ${objectSnapshot.candles.length} candles from Object format.`);

console.log('\n=== ALL LOCAL DIAGNOSTIC CHECKS PASSED ===\n');
