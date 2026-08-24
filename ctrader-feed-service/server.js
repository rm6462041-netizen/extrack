const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const {
  cleanup,
  connectSocket,
  ensureCtraderReady,
  fetchCtraderKlines,
  getSymbols,
  getWatchlistQuotes,
  subscribeAllSymbols,
  subscribeLiveTicks,
} = require('./src/ctrader/socket.client');
const { connectionState, ctraderConfig, tokenState } = require('./src/ctrader/state');
const { loadCtraderTokensFromStore } = require('./src/ctrader/token.service');
const { getData, getStatus, getSymbolByName, recordTick, seedCandles } = require('./src/feed-cache.service');
const { requireInternalKey, verifyInternalKey } = require('./src/security');
const logger = require('./src/logger.service');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Global Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration, {
      candlesCount: res.locals?.candlesCount,
      source: res.locals?.source,
      errorReason: res.locals?.errorReason,
    });
  });
  next();
});

const HOST = process.env.FEED_HOST || '127.0.0.1';
const PORT = Number(process.env.FEED_PORT || 8020);
const PRESUBSCRIBED_SYMBOLS = String(process.env.CTRADER_PRESUBSCRIBED_SYMBOLS || process.env.PRESUBSCRIBED_SYMBOLS || 'EURUSD,GBPUSD,USDJPY,AUDUSD,USDCAD,USDCHF,NZDUSD,XAUUSD,XAGUSD,BTCUSD,ETHUSD,US30,NAS100,SPX500')
  .split(',')
  .map((symbol) => symbol.trim())
  .filter(Boolean);
const BOOTSTRAP_INTERVALS = String(process.env.FEED_BOOTSTRAP_INTERVALS || '1m')
  .split(',')
  .map((interval) => interval.trim())
  .filter(Boolean);
const BOOTSTRAP_CANDLES = String(process.env.FEED_BOOTSTRAP_CANDLES || 'true') === 'true';

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

function normalizeSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function broadcastTickToClients(tick) {
  if (!tick || !tick.symbolName) return;
  const rawSymbol = normalizeSymbol(tick.symbolName);

  const payload = JSON.stringify({
    type: 'MARKET_TICK',
    tick: {
      ...tick,
      symbolName: tick.symbolName,
    },
  });

  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (client.subscribedSymbols && client.subscribedSymbols.has(rawSymbol)) {
      client.send(payload);
    }
  }
}

global.__ctraderFeedOnTick = (tick) => {
  recordTick(tick);
  broadcastTickToClients(tick);
};

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/internal/stream' || url.pathname === '/internal/stream/') {
    if (!verifyInternalKey(request)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  ws.subscribedSymbols = new Set();

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString('utf8'));
      if (message.type === 'MARKET_SUBSCRIBE' && Array.isArray(message.symbols)) {
        for (const sym of message.symbols) {
          const norm = normalizeSymbol(sym);
          if (norm) {
            ws.subscribedSymbols.add(norm);
            // Auto subscribe on cTrader if not already subscribed
            subscribeLiveTicks(sym).catch(() => null);
          }
        }
      } else if (message.type === 'MARKET_UNSUBSCRIBE' && Array.isArray(message.symbols)) {
        for (const sym of message.symbols) {
          const norm = normalizeSymbol(sym);
          if (norm) ws.subscribedSymbols.delete(norm);
        }
      }
    } catch (_err) {
      // Ignore malformed client frames
    }
  });
});

function connected() {
  return Boolean(
    connectionState.ws &&
    connectionState.ws.readyState === connectionState.ws.OPEN &&
    ctraderConfig.isAppAuthed &&
    ctraderConfig.isAccountAuthed
  );
}

function getPublicTokenStatus() {
  const expiresAt = Number(ctraderConfig.expiresAt || 0);
  return {
    hasAccessToken: Boolean(ctraderConfig.accessToken),
    hasRefreshToken: Boolean(ctraderConfig.refreshToken),
    hasClientId: Boolean(ctraderConfig.clientId),
    hasClientSecret: Boolean(ctraderConfig.clientSecret),
    expiresAtIso: expiresAt ? new Date(expiresAt).toISOString() : null,
    expiresInSeconds: expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : null,
    lastTokenRefreshError: tokenState.lastRefreshError || null,
  };
}

async function bootstrapCandlesForSymbol(symbol, symbolInfo) {
  if (!BOOTSTRAP_CANDLES || !symbolInfo) return;

  const endTime = Date.now();
  const todayUtcStart = new Date().setUTCHours(0, 0, 0, 0);
  const startTime = Math.min(todayUtcStart, endTime - (24 * 60 * 60 * 1000));

  for (const interval of BOOTSTRAP_INTERVALS) {
    try {
      const result = await fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit: 1500,
      });

      const count = result?.candles?.length || 0;
      seedCandles(symbolInfo.id, interval, result.candles || []);
      logger.info('BOOTSTRAP', `Seeded ${symbol} (${interval}): ${count} candles in RAM cache`);
    } catch (err) {
      logger.warn('BOOTSTRAP_ERROR', `Failed to seed ${symbol} (${interval}): ${err.message}`);
    }
  }
}

async function startFeed() {
  await loadCtraderTokensFromStore();

  const missing = [];
  if (!ctraderConfig.clientId && !process.env.CTRADER_CLIENT_ID) missing.push('CTRADER_CLIENT_ID');
  if (!ctraderConfig.clientSecret && !process.env.CTRADER_CLIENT_SECRET) missing.push('CTRADER_CLIENT_SECRET');
  if (!ctraderConfig.accessToken && !ctraderConfig.refreshToken) {
    missing.push('CTRADER_ACCESS_TOKEN or CTRADER_REFRESH_TOKEN');
  }

  if (missing.length) {
    const errorMsg = `Missing env: ${missing.join(', ')}`;
    logger.error('STARTUP', errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('cTrader', 'Connecting WebSocket client...');
  await connectSocket();

  // Retry loop for ready state
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await ensureCtraderReady();
      logger.info('cTrader', `cTrader ready on attempt ${attempt + 1}`);
      break;
    } catch (err) {
      logger.warn('cTrader', `Waiting for ready state attempt ${attempt + 1}/10: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Subscribe key watchlist symbols without flooding the connection
  if (PRESUBSCRIBED_SYMBOLS.some((s) => s.toUpperCase() === 'ALL')) {
    try {
      logger.info('cTrader', 'Subscribing all available symbols...');
      await subscribeAllSymbols(Number(process.env.CTRADER_SUBSCRIBE_BATCH_SIZE || 50), 50);
      logger.info('cTrader', `All symbols subscribed. Total: ${ctraderConfig.liveTickSubscriptions.size}`);
    } catch (err) {
      logger.warn('cTrader', `Error subscribing all symbols: ${err.message}`);
    }
  } else {
    for (const requested of PRESUBSCRIBED_SYMBOLS) {
      try {
        await subscribeLiveTicks(requested);
      } catch (err) {
        logger.warn('cTrader', `Failed to subscribe live ticks for ${requested}: ${err.message}`);
      }
    }
  }

  // Bootstrap initial recent candle buffer for key watchlist symbols (top 50 symbols if ALL)
  const symbols = await getSymbols();
  const byNormalized = new Map(
    symbols.map((symbol) => [
      String(symbol.normalizedName || symbol.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase(),
      symbol,
    ])
  );

  const isAll = PRESUBSCRIBED_SYMBOLS.some((s) => s.toUpperCase() === 'ALL');
  const symbolsToBootstrap = isAll
    ? symbols.slice(0, 50)
    : PRESUBSCRIBED_SYMBOLS.map((s) => byNormalized.get(s.replace(/[^a-z0-9]/gi, '').toUpperCase())).filter(Boolean);

  logger.info('BOOTSTRAP', `Starting candle bootstrap for ${symbolsToBootstrap.length} symbols...`);
  for (const match of symbolsToBootstrap) {
    if (!match?.name) continue;
    try {
      await bootstrapCandlesForSymbol(match.name, match);
    } catch (error) {
      logger.warn('BOOTSTRAP_ERROR', `Bootstrap error for ${match.name}: ${error.message}`);
    }
  }
  logger.info('BOOTSTRAP', `Candle bootstrap complete.`);
}

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ctrader-feed-service',
    connected: connected(),
  });
});

app.get('/internal/status', requireInternalKey, (req, res) => {
  res.json({
    success: true,
    connected: connected(),
    accountId: ctraderConfig.accountId,
    isDemo: ctraderConfig.isDemo,
    symbolCount: ctraderConfig.symbols.size,
    liveTickSubscriptionCount: ctraderConfig.liveTickSubscriptions.size,
    subscriptions: Array.from(ctraderConfig.liveTickSubscriptions.values()),
    presubscribedSymbols: PRESUBSCRIBED_SYMBOLS,
    token: getPublicTokenStatus(),
    cache: getStatus(),
  });
});

app.get('/internal/logs', (req, res) => {
  const lineCount = Number(req.query.lines) || 200;
  const logs = logger.getRecentLogs(lineCount);
  if (req.query.format === 'json') {
    return res.json({ success: true, count: logs.length, logs });
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(logs.join('\n'));
});

app.get('/internal/symbols', requireInternalKey, async (req, res) => {
  try {
    const symbols = await getSymbols();
    return res.json({
      success: true,
      symbols,
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Symbols unavailable',
    });
  }
});

app.get('/internal/quotes', requireInternalKey, async (req, res) => {
  const symbols = String(req.query.symbols || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const result = await getWatchlistQuotes(symbols);
    return res.json({
      success: true,
      connected: connected(),
      ...result,
      serverTime: Math.floor(Date.now() / 1000),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Quotes unavailable',
    });
  }
});

app.get('/internal/data/:symbol', requireInternalKey, async (req, res) => {
  const symbol = String(req.params.symbol || '').trim();
  const interval = String(req.query.interval || '1m');
  const limitTicks = Number(req.query.limitTicks || 2000);
  const limitCandles = Number(req.query.limitCandles || 500);

  try {
    await ensureCtraderReady();

    const snapshot = getData(symbol, {
      interval,
      limitTicks,
      limitCandles,
    });

    if (!snapshot.found) {
      res.locals.errorReason = `Symbol ${symbol} not found or not loaded in cache`;
      return res.status(404).json({
        success: false,
        error: 'Symbol not found or not loaded',
        symbol,
      });
    }

    res.locals.candlesCount = snapshot.candles?.length || 0;
    res.locals.source = 'cache';

    return res.json({
      success: true,
      ...snapshot,
      serverTime: Math.floor(Date.now() / 1000),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 500).json({
      success: false,
      error: 'Market feed unavailable',
    });
  }
});

app.get('/internal/klines', requireInternalKey, async (req, res) => {
  const symbol = String(req.query.symbol || req.query.symbolName || '').trim();
  const interval = String(req.query.interval || '1m');
  const startTime = req.query.startTime ? Number(req.query.startTime) : undefined;
  const endTime = req.query.endTime ? Number(req.query.endTime) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 1000;

  try {
    if (!symbol) {
      res.locals.errorReason = 'Missing symbol query param';
      return res.status(400).json({ success: false, error: 'Invalid symbol' });
    }

    // 1. If memory cache has sufficient rolling candles and no specific historical range requested, return RAM cache instantly (< 1ms)
    const minRequired = Math.min(Number(limit) || 250, 200);
    if (!startTime && !endTime) {
      const snapshot = getData(symbol, { interval, limitCandles: limit });
      if (snapshot?.found && Array.isArray(snapshot?.candles) && snapshot.candles.length >= minRequired) {
        res.locals.candlesCount = snapshot.candles.length;
        res.locals.source = 'cache';
        return res.json({
          success: true,
          symbol,
          interval,
          candles: snapshot.candles,
          source: 'cache',
          serverTime: Math.floor(Date.now() / 1000),
          serverTimeMs: Date.now(),
        });
      }
    }

    // 2. Fetch from cTrader API for cold cache, insufficient cache, or explicit historical range
    const result = await fetchCtraderKlines({
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });

    // Populate seed cache with newly fetched candles for rolling live aggregation
    if (!endTime && Array.isArray(result?.candles) && result.candles.length > 0) {
      const symbolInfo = getSymbolByName(symbol);
      if (symbolInfo?.id) {
        seedCandles(symbolInfo.id, interval, result.candles);
      }
    }

    const candleCount = result?.candles?.length || 0;
    res.locals.candlesCount = candleCount;
    res.locals.source = 'ctrader-api';

    return res.json({
      success: true,
      symbol,
      interval,
      candles: result?.candles || [],
      source: 'ctrader-api',
      serverTime: Math.floor(Date.now() / 1000),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    res.locals.errorReason = error.message || 'Market klines unavailable';
    logger.error('KLINES_ERROR', `Failed fetching klines for ${symbol}: ${error.message}`, {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Market klines unavailable',
    });
  }
});

app.get('/internal/historical-candles', requireInternalKey, (req, res) => {
  req.url = '/internal/klines' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  app.handle(req, res);
});

app.get('/internal/quote/:symbol', requireInternalKey, async (req, res) => {
  const symbol = String(req.params.symbol || '').trim();

  try {
    await ensureCtraderReady();
    const snapshot = getData(symbol, { limitTicks: 1, limitCandles: 1 });

    if (!snapshot.found) {
      res.locals.errorReason = `Symbol ${symbol} not found or not loaded`;
      return res.status(404).json({
        success: false,
        error: 'Symbol not found or not loaded',
        symbol,
      });
    }

    return res.json({
      success: true,
      symbol: snapshot.symbol,
      quote: snapshot.quote,
      serverTime: Math.floor(Date.now() / 1000),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 500).json({
      success: false,
      error: 'Market feed unavailable',
    });
  }
});

process.on('SIGINT', () => {
  logger.info('PROCESS', 'SIGINT received. Cleaning up and exiting...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('PROCESS', 'SIGTERM received. Cleaning up and exiting...');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('FATAL', `Uncaught Exception: ${err.message}`, { stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('FATAL', `Unhandled Rejection: ${reason instanceof Error ? reason.message : reason}`, {
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

server.listen(PORT, HOST, async () => {
  logger.info('SERVER', `ctrader-feed-service listening on http://${HOST}:${PORT}`);
  try {
    await startFeed();
    logger.info('SERVER', 'ctrader-feed-service ready and active.');
  } catch (error) {
    logger.error('SERVER', `ctrader-feed-service failed to start feed: ${error.message}`, { stack: error.stack });
  }
});

