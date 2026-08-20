const { PRICE_SCALE } = require('./constants');
const { ctraderConfig } = require('./state');
const { normalizeStoredSymbol } = require('../../shared/utils/symbols');

function normalizeSymbolName(symbolName) {
  return String(symbolName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function cacheAssets(assetsData) {
  const assets = assetsData?.asset || assetsData?.assets || [];
  assets.forEach((asset) => {
    const id = Number(asset.assetId);
    if (Number.isFinite(id)) {
      ctraderConfig.assets.set(id, asset.name || asset.displayName);
    }
  });
}

function cacheSymbols(symbolsData) {
  if (!symbolsData?.symbols?.length && !symbolsData?.symbol?.length) {
    return;
  }

  const symbols = symbolsData.symbols || symbolsData.symbol || [];
  symbols.forEach((symbol) => {
    const id = Number(symbol.symbolId);

    if (!Number.isFinite(id)) {
      return;
    }

    const baseAsset = symbol.baseAsset || (symbol.baseAssetId ? ctraderConfig.assets.get(Number(symbol.baseAssetId)) : null);
    const quoteAsset = symbol.quoteAsset || (symbol.quoteAssetId ? ctraderConfig.assets.get(Number(symbol.quoteAssetId)) : null);

    ctraderConfig.symbols.set(id, {
      id,
      name: symbol.symbolName,
      displayName: symbol.displayName || symbol.symbolName,
      requestSymbol: symbol.symbolName,
      normalizedName: normalizeSymbolName(symbol.symbolName),
      description: symbol.description,
      baseAsset,
      quoteAsset,
      digits: Number.isFinite(Number(symbol.digits)) ? Number(symbol.digits) : null,
      pipPosition: Number.isFinite(Number(symbol.pipPosition)) ? Number(symbol.pipPosition) : null,
    });

    if (!ctraderConfig.currentSymbolId) {
      ctraderConfig.currentSymbolId = id;
    }
  });
}

function cacheSymbolDetails(symbols = []) {
  symbols.forEach((symbol) => {
    const id = Number(symbol.symbolId);
    if (!Number.isFinite(id)) return;

    const existing = ctraderConfig.symbols.get(id) || {};
    const baseAsset = symbol.baseAsset || (symbol.baseAssetId ? ctraderConfig.assets.get(Number(symbol.baseAssetId)) : existing.baseAsset ?? null);
    const quoteAsset = symbol.quoteAsset || (symbol.quoteAssetId ? ctraderConfig.assets.get(Number(symbol.quoteAssetId)) : existing.quoteAsset ?? null);

    ctraderConfig.symbols.set(id, {
      ...existing,
      id,
      name: existing.name || symbol.symbolName || symbol.name,
      displayName: existing.displayName || symbol.symbolName || symbol.name,
      requestSymbol: existing.requestSymbol || symbol.symbolName || symbol.name,
      normalizedName: existing.normalizedName || normalizeSymbolName(symbol.symbolName || symbol.name),
      description: existing.description || symbol.description,
      baseAsset,
      quoteAsset,
      digits: Number.isFinite(Number(symbol.digits)) ? Number(symbol.digits) : existing.digits ?? null,
      pipPosition: Number.isFinite(Number(symbol.pipPosition)) ? Number(symbol.pipPosition) : existing.pipPosition ?? null,
    });
  });
}

function findExactSymbolMatch(symbol) {
  const normalized = normalizeStoredSymbol(symbol);

  for (const candidate of ctraderConfig.symbols.values()) {
    if (candidate.normalizedName === normalized) {
      return candidate;
    }
  }

  return null;
}

function resolveSymbolId(symbol) {
  return findExactSymbolMatch(symbol)?.id || null;
}

function trendbarToBinanceKline(trendbar) {
  const low = Number(trendbar.low) / PRICE_SCALE;
  const open = (Number(trendbar.low) + Number(trendbar.deltaOpen || 0)) / PRICE_SCALE;
  const close = (Number(trendbar.low) + Number(trendbar.deltaClose || 0)) / PRICE_SCALE;
  const high = (Number(trendbar.low) + Number(trendbar.deltaHigh || 0)) / PRICE_SCALE;
  const openTime = Number(trendbar.utcTimestampInMinutes) * 60 * 1000;
  const volume = Number(trendbar.volume || 0);

  return [
    openTime,
    String(open),
    String(high),
    String(low),
    String(close),
    String(volume),
    openTime,
    '0',
    volume,
    '0',
    '0',
    '0',
  ];
}

module.exports = {
  cacheAssets,
  cacheSymbols,
  cacheSymbolDetails,
  findExactSymbolMatch,
  normalizeSymbolName,
  resolveSymbolId,
  trendbarToBinanceKline,
};
