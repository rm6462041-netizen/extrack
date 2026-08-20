require('dotenv').config();

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
const { getData, getStatus, recordTick, seedCandles } = require('./src/feed-cache.service');
const { requireInternalKey, verifyInternalKey } = require('./src/security');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

const HOST = process.env.FEED_HOST || '127.0.0.1';
const PORT = Number(process.env.FEED_PORT || 8020);
const PRESUBSCRIBED_SYMBOLS = String(process.env.CTRADER_PRESUBSCRIBED_SYMBOLS || process.env.PRESUBSCRIBED_SYMBOLS || 'EURUSD,GBPUSD,USDJPY,AUDUSD,USDCAD,USDCHF,NZDUSD,XAUUSD,XAGUSD,US30,NAS100,SPX500')
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
  const startTime = endTime - (4 * 60 * 60 * 1000);

  for (const interval of BOOTSTRAP_INTERVALS) {
    try {
      const result = await fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit: 1000,
      });

      seedCandles(symbolInfo.id, interval, result.candles || []);
    } catch (_error) {
      // Suppress bootstrap candle error
    }
  }
}

async function startFeed() {
  const missing = ['CTRADER_CLIENT_ID', 'CTRADER_CLIENT_SECRET'].filter((key) => !process.env[key]);
  if (!process.env.CTRADER_ACCESS_TOKEN && !process.env.CTRADER_REFRESH_TOKEN) {
    missing.push('CTRADER_ACCESS_TOKEN or CTRADER_REFRESH_TOKEN');
  }

  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }

  await connectSocket();
  await ensureCtraderReady();

  // 24/7 subscribe ALL symbols across cTrader in gentle 50-item batches
  await subscribeAllSymbols(50, 60);

  // Bootstrap initial recent candle buffer for key watchlist symbols
  const symbols = await getSymbols();
  const byNormalized = new Map(
    symbols.map((symbol) => [
      String(symbol.normalizedName || symbol.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase(),
      symbol,
    ])
  );

  for (const requested of PRESUBSCRIBED_SYMBOLS) {
    const normalized = requested.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const match = byNormalized.get(normalized);
    if (!match) continue;

    try {
      await bootstrapCandlesForSymbol(match.name, match);
    } catch (_error) {
      // Suppress bootstrap error
    }
  }
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

app.get('/internal/symbols', requireInternalKey, async (req, res) => {
  try {
    const symbols = await getSymbols();
    return res.json({
      success: true,
      symbols,
    });
  } catch (error) {
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
    });
  } catch (error) {
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
      return res.status(404).json({
        success: false,
        error: 'Symbol not found or not loaded',
        symbol,
      });
    }

    return res.json({
      success: true,
      ...snapshot,
      serverTime: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
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
      return res.status(400).json({ success: false, error: 'Invalid symbol' });
    }

    const result = await fetchCtraderKlines({
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });

    return res.json({
      success: true,
      ...result,
      serverTime: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Market klines unavailable',
    });
  }
});

app.get('/internal/quote/:symbol', requireInternalKey, async (req, res) => {
  const symbol = String(req.params.symbol || '').trim();

  try {
    await ensureCtraderReady();
    const snapshot = getData(symbol, { limitTicks: 1, limitCandles: 1 });

    if (!snapshot.found) {
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
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: 'Market feed unavailable',
    });
  }
});

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

server.listen(PORT, HOST, async () => {
  console.log(`ctrader-feed-service listening on http://${HOST}:${PORT}`);
  try {
    await startFeed();
    console.log('ctrader-feed-service ready');
  } catch (error) {
    console.error('ctrader-feed-service failed to start feed', error.message);
  }
});

