const WebSocket = require('ws');
const { normalizeStoredSymbol } = require('../../shared/utils/symbols');
const {
  CTRADER_INTERVALS,
  CTRADER_PERIODS,
  MAX_RECONNECT_ATTEMPTS,
  PRICE_SCALE,
} = require('./constants');
const { getAccounts } = require('./accounts.service');
const { loadProtos: loadProtobufRoot } = require('./proto.service');
const { createProtocolClient } = require('./protocol.client');
const {
  cacheSymbols,
  cacheSymbolDetails,
  resolveSymbolId,
} = require('./symbols.service');
const {
  buildCurrentCandle,
  buildDepth,
  buildQuote,
  buildWatchlistQuotes,
  getClosedHistoryEndTime,
  getLatestTrendbarCandle,
  getSymbolName,
  normalizeCandles,
  normalizeDepthEvent,
  normalizeSpotEvent,
  trendbarToCandle,
} = require('./market-data.service');
const { connectionState, ctraderConfig, tokenState } = require('./state');
const {
  ensureCtraderTokenStore,
  ensureValidToken,
} = require('./token.service');

const protocol = createProtocolClient({
  getRoot: () => connectionState.root,
  getSocket: () => connectionState.ws,
});

async function loadProtos() {
  connectionState.root = await loadProtobufRoot();
  return connectionState.root;
}

function toPlain(typeName, value) {
  try {
    const Type = connectionState.root.lookupType(typeName);
    return Type.toObject(value, {
      defaults: false,
      enums: String,
      json: true,
      longs: String,
    });
  } catch {
    return value;
  }
}

function getAccountIdPayload() {
  if (!ctraderConfig.accountId) {
    const error = new Error('No cTrader account ID available');
    error.status = 503;
    throw error;
  }

  return {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId, 10),
  };
}

function makeSubscriptionKey(symbolId, interval) {
  return interval ? `${Number(symbolId)}:${interval}` : String(Number(symbolId));
}

function parseFiniteInteger(value, fallback = undefined) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function parseTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function createHttpError(message, status = 400, payload = null) {
  const error = new Error(message);
  error.status = status;
  if (payload) error.payload = payload;
  return error;
}

async function ensureSymbolId(symbol) {
  await ensureCtraderReady();

  let symbolId = resolveSymbolId(symbol);
  if (!symbolId) {
    await requestSymbolsAsync();
    symbolId = resolveSymbolId(symbol);
  }

  if (!symbolId) {
    const normalizedSymbol = normalizeStoredSymbol(symbol);
    throw createHttpError(`cTrader symbol not found: ${symbol}`, 404, {
      success: false,
      error: `cTrader symbol not found: ${symbol}`,
      symbol,
      normalizedSymbol,
      availableSymbolCount: ctraderConfig.symbols.size,
    });
  }

  await ensureSymbolDetails(symbolId);
  return Number(symbolId);
}

async function ensureSymbolDetails(symbolId) {
  const numericSymbolId = Number(symbolId);
  const cached = ctraderConfig.symbols.get(numericSymbolId);
  const cachedDigits = Number(cached?.digits);

  if (Number.isFinite(cachedDigits) && cachedDigits > 0) {
    return cached;
  }

  const raw = await protocol.requestMessage(2116, {
    ...getAccountIdPayload(),
    symbolId: [numericSymbolId],
  });
  const symbols = raw.symbol || raw.symbols || [];
  cacheSymbolDetails(symbols);
  return ctraderConfig.symbols.get(numericSymbolId) || cached || null;
}

function normalizeTrendbarEvent(spotEvent) {
  const symbolId = Number(spotEvent.symbolId);
  const trendbars = (spotEvent.trendbar || []).map((trendbar) => ({
    symbolId,
    symbolName: getSymbolName(symbolId),
    period: trendbar.period || null,
    candle: trendbarToCandle(trendbar, symbolId),
    raw: toPlain('ProtoOATrendbar', trendbar),
    receivedAt: new Date().toISOString(),
  }));

  trendbars.forEach((trendbar) => {
    const key = makeSubscriptionKey(symbolId, trendbar.period);
    ctraderConfig.latestTrendbars.set(key, trendbar);
  });
}

function normalizeTickData(tickData = []) {
  let currentTimestamp = null;

  return tickData.map((tick, index) => {
    const rawTimestamp = Number(tick.timestamp);
    if (index === 0 || currentTimestamp === null) {
      currentTimestamp = rawTimestamp;
    } else {
      currentTimestamp -= rawTimestamp;
    }

    return {
      timestamp: currentTimestamp,
      price: Number(tick.tick) / PRICE_SCALE,
      raw: toPlain('ProtoOATickData', tick),
    };
  });
}

function sendAppAuth() {
  protocol.sendMessage(2100, {
    clientId: ctraderConfig.clientId,
    clientSecret: ctraderConfig.clientSecret,
  });
}

function sendAccountAuth() {
  if (!ctraderConfig.accountId) return;

  protocol.sendMessage(2102, {
    ...getAccountIdPayload(),
    accessToken: ctraderConfig.accessToken,
  });
}

async function requestSymbolsAsync() {
  const symbolsData = await protocol.requestMessage(2114, getAccountIdPayload());

  cacheSymbols(symbolsData);
  return Array.from(ctraderConfig.symbols.values());
}

function requestCandles(symbolId = null, period = CTRADER_PERIODS.M1, count = 100) {
  const targetSymbolId = symbolId || ctraderConfig.currentSymbolId;

  if (!targetSymbolId || !ctraderConfig.accountId) return;

  protocol.sendMessage(2137, {
    ...getAccountIdPayload(),
    symbolId: targetSymbolId,
    period,
    count,
  });
}

async function requestTrendbars(symbolId, period, count, fromTimestamp, toTimestamp) {
  if (!symbolId) {
    throw new Error('No cTrader symbol ID available');
  }

  const payload = {
    ...getAccountIdPayload(),
    symbolId: Number(symbolId),
    period,
  };

  if (Number.isFinite(fromTimestamp)) {
    payload.fromTimestamp = fromTimestamp;
  }

  if (Number.isFinite(toTimestamp)) {
    payload.toTimestamp = toTimestamp;
  }

  if (Number.isFinite(count)) {
    payload.count = count;
  }

  return protocol.requestMessage(2137, payload);
}

function sendHeartbeat() {
  try {
    protocol.sendMessage(51, {});
  } catch (err) {
  }
}

function startHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
  }

  connectionState.heartbeatInterval = setInterval(() => {
    if (connectionState.ws && connectionState.ws.readyState === WebSocket.OPEN) {
      sendHeartbeat();
    }
  }, 30000);
}

function stopHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
    connectionState.heartbeatInterval = null;
  }
}

async function reconnect() {
  if (connectionState.isConnecting) return;
  if (connectionState.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  connectionState.reconnectAttempts += 1;

  setTimeout(async () => {
    await connectSocket();
  }, 5000);
}

async function connectSocket() {
  if (connectionState.isConnecting) return;

  connectionState.isConnecting = true;

  try {
    if (!connectionState.root) {
      await loadProtos();
    }

    if (connectionState.ws) {
      connectionState.ws.removeAllListeners();
      connectionState.ws.close();
      connectionState.ws = null;
    }

    ctraderConfig.isAppAuthed = false;
    ctraderConfig.isAccountAuthed = false;
    stopHeartbeat();

    const tokenReady = await ensureValidToken();
    if (!tokenReady) {
      throw new Error('cTrader access token could not be refreshed');
    }

    await getAccounts();

    if (!ctraderConfig.accountId) {
      connectionState.isConnecting = false;
      return;
    }

    const url = ctraderConfig.isDemo
      ? 'wss://demo.ctraderapi.com:5035'
      : 'wss://live.ctraderapi.com:5035';

    connectionState.ws = new WebSocket(url);

    connectionState.ws.on('open', () => {
      connectionState.reconnectAttempts = 0;
      connectionState.isConnecting = false;
      sendAppAuth();
      startHeartbeat();
    });

    connectionState.ws.on('message', (data) => {
      handleMessage(data);
    });

    connectionState.ws.on('error', () => {});

    connectionState.ws.on('close', () => {
      connectionState.isConnecting = false;
      stopHeartbeat();
      reconnect();
    });
  } catch (err) {
    connectionState.isConnecting = false;
    if (err.message.includes('access token could not be refreshed')) {
      return;
    }
    reconnect();
  }
}

async function waitForSocketReady(timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (
      connectionState.ws &&
      connectionState.ws.readyState === WebSocket.OPEN &&
      ctraderConfig.isAppAuthed &&
      ctraderConfig.isAccountAuthed
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('cTrader connection is not ready');
}

async function ensureCtraderReady() {
  if (!connectionState.root) {
    await loadProtos();
  }

  if (
    !connectionState.ws ||
    connectionState.ws.readyState !== WebSocket.OPEN ||
    !ctraderConfig.isAppAuthed ||
    !ctraderConfig.isAccountAuthed
  ) {
    await connectSocket();
  }

  await waitForSocketReady();

  if (ctraderConfig.symbols.size === 0) {
    await requestSymbolsAsync();
  }
}

async function fetchCtraderKlines({ symbol, interval = '1m', startTime, endTime, limit = 1000 }) {
  const period = CTRADER_INTERVALS[interval];

  if (!period) {
    const error = new Error(`Unsupported cTrader interval: ${interval}`);
    error.status = 400;
    throw error;
  }

  await ensureCtraderReady();

  const symbolId = await ensureSymbolId(symbol);

  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 1000, 1), 1000);
  const numericStartTime = startTime ? Number(startTime) : undefined;
  const intervalMs = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 31 * 24 * 60 * 60 * 1000,
  }[interval] || 60 * 1000;
  const hasExplicitEndTime = endTime !== undefined && endTime !== null && endTime !== '';
  const numericEndTime = hasExplicitEndTime ? Number(endTime) : undefined;
  const resolvedStartTime = Number.isFinite(numericStartTime)
    ? (numericStartTime > 1e11 ? numericStartTime : numericStartTime * 1000)
    : undefined;
  const resolvedEndTime = Number.isFinite(numericEndTime)
    ? (numericEndTime > 1e11 ? numericEndTime : numericEndTime * 1000)
    : undefined;
  const requestEndTime = Number.isFinite(resolvedEndTime)
    ? resolvedEndTime
    : (Number.isFinite(resolvedStartTime) ? getClosedHistoryEndTime(interval) : Date.now());
  const requestedRangeCount = Number.isFinite(resolvedStartTime) && Number.isFinite(requestEndTime)
    ? Math.ceil((requestEndTime - resolvedStartTime) / intervalMs) + 5
    : normalizedLimit;
  const targetCount = Math.min(Math.max(requestedRangeCount, normalizedLimit), 5000);
  const rawTrendbars = [];
  let cursorEndTime = requestEndTime;

  while (rawTrendbars.length < targetCount) {
    const chunkLimit = Math.min(1000, targetCount - rawTrendbars.length);
    const trendData = await requestTrendbars(
      symbolId,
      period,
      chunkLimit,
      undefined,
      Number.isFinite(cursorEndTime) ? cursorEndTime : Date.now()
    );
    const chunk = trendData?.trendbar || trendData?.trendbars || [];

    if (!chunk.length) break;

    rawTrendbars.push(...chunk);

    const oldestMinute = Math.min(
      ...chunk
        .map((trendbar) => Number(trendbar.utcTimestampInMinutes))
        .filter(Number.isFinite)
    );

    if (!Number.isFinite(oldestMinute)) break;

    const oldestOpenTime = oldestMinute * 60 * 1000;
    if (Number.isFinite(resolvedStartTime) && oldestOpenTime <= resolvedStartTime) break;

    cursorEndTime = oldestOpenTime - 1;
  }

  const candles = rawTrendbars
    .map((trendbar) => trendbarToCandle(trendbar, symbolId))
    .filter((kline) => {
      const openTime = Number(kline.time) * 1000;
      if (!Number.isFinite(openTime)) return false;
      if (Number.isFinite(resolvedStartTime) && openTime < resolvedStartTime) return false;
      if (Number.isFinite(requestEndTime) && openTime > requestEndTime) return false;
      return true;
    })
    .sort((a, b) => Number(a.time) - Number(b.time));

  const normalizedCandles = normalizeCandles(candles);
  if (!hasExplicitEndTime && normalizedCandles.length > 0) {
    const latestTick = ctraderConfig.latestTicks.get(symbolId);
    if (latestTick) {
      const price = Number(latestTick.last ?? latestTick.bid ?? latestTick.ask);
      const tickTime = Number(latestTick.time || Math.floor(Date.now() / 1000));
      const bucketSize = intervalMs / 1000;
      const currentBucketTime = Math.floor(tickTime / bucketSize) * bucketSize;
      const lastCandle = normalizedCandles[normalizedCandles.length - 1];

      if (lastCandle && lastCandle[0] === currentBucketTime && Number.isFinite(price) && price > 0) {
        lastCandle[2] = Math.max(lastCandle[2], price);
        lastCandle[3] = Math.min(lastCandle[3], price);
        lastCandle[4] = price;
      }
    }
  }

  const symbolInfo = ctraderConfig.symbols.get(symbolId) || null;

  return {
    symbol: symbolInfo?.name || symbol,
    interval,
    candles: normalizedCandles,
  };
}

async function getLiveMarketSnapshot({ symbol, interval = '1m', subscribe = true }) {
  await ensureCtraderReady();
  const symbols = await getSymbols();
  const symbolId = symbol ? await ensureSymbolId(symbol) : Number(symbols[0]?.id);
  const match = ctraderConfig.symbols.get(symbolId) || symbols[0] || null;

  if (match && subscribe) {
    if (!ctraderConfig.liveTickSubscriptions.has(String(match.id))) {
      await subscribeLiveTicks(match.name);
    }
    if (!ctraderConfig.depthSubscriptions.has(String(match.id))) {
      await subscribeDepth(match.name);
    }
  }

  const tick = match ? ctraderConfig.latestTicks.get(match.id) : null;
  const depth = match ? buildDepth(ctraderConfig.latestDepth.get(match.id)) : null;
  const previousCandle = match ? getLatestTrendbarCandle(match.id, interval) : null;
  const candle = buildCurrentCandle({ tick, interval, previousCandle });
  const quote = buildQuote(tick);

  return {
    symbol: match,
    symbols,
    quote,
    tick: quote,
    candle,
    depth,
    subscribed: Boolean(match),
    serverTime: Math.floor(Date.now() / 1000),
  };
}

async function getWatchlistQuotes(symbolValues = []) {
  await ensureCtraderReady();
  const allSymbols = await getSymbols();
  const requestedSymbols = symbolValues.length
    ? symbolValues
      .map((value) => resolveSymbolId(value))
      .filter(Boolean)
      .map((symbolId) => ctraderConfig.symbols.get(Number(symbolId)))
      .filter(Boolean)
    : allSymbols.slice(0, 20);

  return {
    quotes: buildWatchlistQuotes(requestedSymbols),
    symbols: requestedSymbols,
  };
}

async function getSymbols() {
  await ensureCtraderReady();
  return Array.from(ctraderConfig.symbols.values());
}

async function getSymbolById(symbolId) {
  await ensureCtraderReady();
  const numericSymbolId = parseFiniteInteger(symbolId);
  if (!numericSymbolId) throw createHttpError('Valid symbolId is required', 400);

  const raw = await protocol.requestMessage(2116, {
    ...getAccountIdPayload(),
    symbolId: [numericSymbolId],
  });
  cacheSymbolDetails(raw.symbol || raw.symbols || []);

  return {
    symbols: raw.symbol || raw.symbols || [],
    raw: toPlain('ProtoOASymbolByIdRes', raw),
  };
}

async function fetchOneTickSide(symbolId, type, fromTimestamp, toTimestamp) {
  const raw = await protocol.requestMessage(2145, {
    ...getAccountIdPayload(),
    symbolId,
    type,
    ...(Number.isFinite(fromTimestamp) ? { fromTimestamp } : {}),
    ...(Number.isFinite(toTimestamp) ? { toTimestamp } : {}),
  });

  return {
    ticks: normalizeTickData(raw.tickData || []),
    hasMore: Boolean(raw.hasMore),
    raw: toPlain('ProtoOAGetTickDataRes', raw),
  };
}

async function fetchCtraderTicks({ symbol, fromTimestamp, toTimestamp, type = 'bidask', limit }) {
  await ensureCtraderReady();
  const symbolId = await ensureSymbolId(symbol);
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp) || Date.now();
  const normalizedType = String(type || 'bidask').toLowerCase();
  const maxRows = Math.min(Math.max(parseFiniteInteger(limit, 1000), 1), 5000);

  if (normalizedType === 'bidask' || normalizedType === 'both') {
    const [bid, ask] = await Promise.all([
      fetchOneTickSide(symbolId, 1, from, to),
      fetchOneTickSide(symbolId, 2, from, to),
    ]);

    return {
      symbolId,
      symbolName: getSymbolName(symbolId),
      type: 'bidask',
      bidTicks: (bid.ticks || []).slice(-maxRows),
      askTicks: (ask.ticks || []).slice(-maxRows),
    };
  }

  const sideType = normalizedType === 'ask' ? 2 : 1;
  const result = await fetchOneTickSide(symbolId, sideType, from, to);
  return {
    symbolId,
    symbolName: getSymbolName(symbolId),
    type: normalizedType === 'ask' ? 'ask' : 'bid',
    ticks: (result.ticks || []).slice(-maxRows),
  };
}

async function subscribeSpotsBatch(symbolIds = []) {
  if (!symbolIds.length) return { subscribed: 0 };
  const numericIds = symbolIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (!numericIds.length) return { subscribed: 0 };

  protocol.sendMessage(2127, {
    ...getAccountIdPayload(),
    symbolId: numericIds,
    subscribeToSpotTimestamp: true,
  });

  numericIds.forEach((id) => {
    ctraderConfig.liveTickSubscriptions.add(makeSubscriptionKey(id));
  });

  return { subscribed: numericIds.length };
}

async function subscribeAllSymbols(batchSize = 50, delayMs = 60) {
  await ensureCtraderReady();
  const allSymbols = await getSymbols();
  const allIds = allSymbols.map((s) => Number(s.id || s.symbolId)).filter((id) => Number.isFinite(id) && id > 0);

  console.info(`[cTrader] 24/7 Subscribing ${allIds.length} symbols in batches of ${batchSize}...`);

  for (let i = 0; i < allIds.length; i += batchSize) {
    const chunk = allIds.slice(i, i + batchSize);
    try {
      await subscribeSpotsBatch(chunk);
    } catch (err) {
      console.warn(`[cTrader] Batch subscription error (${i}-${i + chunk.length}): ${err.message}`);
    }
    if (i + batchSize < allIds.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.info(`[cTrader] 24/7 Active Subscriptions: ${ctraderConfig.liveTickSubscriptions.size} symbols live.`);
  return {
    totalSubscribed: ctraderConfig.liveTickSubscriptions.size,
    totalAvailable: allIds.length,
  };
}

async function subscribeLiveTicks(symbol) {
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2127, {
    ...getAccountIdPayload(),
    symbolId: [symbolId],
    subscribeToSpotTimestamp: true,
  });
  ctraderConfig.liveTickSubscriptions.add(makeSubscriptionKey(symbolId));
  return { symbolId, symbolName: getSymbolName(symbolId), subscribed: true, raw: toPlain('ProtoOASubscribeSpotsRes', raw) };
}

async function unsubscribeLiveTicks(symbol) {
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2129, {
    ...getAccountIdPayload(),
    symbolId: [symbolId],
  });
  ctraderConfig.liveTickSubscriptions.delete(makeSubscriptionKey(symbolId));
  return { symbolId, symbolName: getSymbolName(symbolId), subscribed: false, raw: toPlain('ProtoOAUnsubscribeSpotsRes', raw) };
}

function handleEvent(decoded, typeName, handler) {
  try {
    const EventType = connectionState.root.lookupType(typeName);
    const event = EventType.decode(decoded.payload);
    handler(event);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('ctrader.event_decode_failed', { typeName, error: error.message });
    }
  }
}

function handleMessage(data) {
  try {
    const root = connectionState.root;
    const Message = root.lookupType('ProtoMessage');
    const decoded = Message.decode(new Uint8Array(data));

    if (protocol.resolvePendingResponse(decoded)) {
      return;
    }

    switch (decoded.payloadType) {
      case 2101:
        ctraderConfig.isAppAuthed = true;
        setTimeout(() => sendAccountAuth(), 500);
        break;

      case 2103:
        try {
          const AccAuthRes = root.lookupType('ProtoOAAccountAuthRes');
          AccAuthRes.decode(decoded.payload);
          ctraderConfig.isAccountAuthed = true;
        } catch (_err) {
          ctraderConfig.isAccountAuthed = true;
        }
        break;

      case 2115:
        handleEvent(decoded, 'ProtoOASymbolsListRes', cacheSymbols);
        break;

      case 2131:
        handleEvent(decoded, 'ProtoOASpotEvent', (event) => {
          const tick = normalizeSpotEvent(event, toPlain);
          ctraderConfig.latestTicks.set(tick.symbolId, tick);
          if (typeof global.__ctraderFeedOnTick === 'function') {
            try {
              global.__ctraderFeedOnTick(tick);
            } catch (_error) {}
          }
          normalizeTrendbarEvent(event);
        });
        break;

      case 2142:
        handleEvent(decoded, 'ProtoOAErrorRes', (errorData) => {
          const errorCode = errorData.errorCode || '';
          if (errorCode === 'CH_ACCESS_TOKEN_INVALID' || errorCode === 'OA_AUTH_TOKEN_EXPIRED') {
            tokenState.lastRefreshError = errorCode;
            console.warn('ctrader.account_auth_failed.invalid_token', 'Access token is invalid. Clearing token and forcing refresh.');
            ctraderConfig.accessToken = '';
            ctraderConfig.expiresAt = 0;
            if (connectionState.ws) {
              connectionState.ws.close();
            }
          }
        });
        break;

      case 2147:
        handleEvent(decoded, 'ProtoOAAccountsTokenInvalidatedEvent', (_event) => {
          tokenState.lastRefreshError = 'cTrader accounts token invalidated';
          console.warn('ctrader.token_invalidated_event', 'Access token invalidated event received. Clearing token and forcing refresh.');
          ctraderConfig.accessToken = '';
          ctraderConfig.expiresAt = 0;
          if (connectionState.ws) {
            connectionState.ws.close();
          }
        });
        break;

      default:
        break;
    }
  } catch (_err) {
    // Suppress frame decode errors
  }
}

function cleanup() {
  stopHeartbeat();

  if (connectionState.ws) {
    connectionState.ws.removeAllListeners();
    connectionState.ws.close();
    connectionState.ws = null;
  }

  ctraderConfig.isAppAuthed = false;
  ctraderConfig.isAccountAuthed = false;
  ctraderConfig.liveTickSubscriptions.clear();
  connectionState.isConnecting = false;
  connectionState.reconnectAttempts = 0;
}

module.exports = {
  cleanup,
  connectSocket,
  ensureCtraderReady,
  ensureCtraderTokenStore,
  fetchCtraderKlines,
  fetchCtraderTicks,
  getLiveMarketSnapshot,
  getSymbolById,
  getSymbols,
  getWatchlistQuotes,
  loadProtos,
  requestSymbolsAsync,
  subscribeAllSymbols,
  subscribeLiveTicks,
  subscribeSpotsBatch,
  unsubscribeLiveTicks,
};
