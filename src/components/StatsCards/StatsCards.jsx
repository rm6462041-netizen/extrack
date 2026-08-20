import React, { useMemo, useState } from 'react';
import { CircleDollarSign, Sigma } from '../../icons/lucideIcons';
import { formatCurrency as formatDashboardCurrency } from '../../utils/user/Currency';
import { decodeStorageValue, encodeStorageValue } from '../../utils/storage/obfuscatedStorage';
import { getTradeDisplayDate } from '../../utils/trading/tradeTime';
import InfoTooltip from '../Common/InfoTooltip/InfoTooltip';
import { Card } from '@/components/Common/base';

const STATS_CACHE_KEY = 'm5$ds.4';
const LEGACY_STATS_CACHE_KEY = 'entrack:dashboard_stats';
const PREVIOUS_STATS_CACHE_KEY = ['ex', 'track:dashboard_stats'].join('');
const DEFAULT_STATS_SCOPE = 'dashboard:all';

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0.00';
  return num.toFixed(2);
}

const emptyStats = {
  totalPnL: 0,
  winRate: 0,
  winningTrades: 0,
  losingTrades: 0,
  totalTrades: 0,
  winningDays: 0,
  losingDays: 0,
  totalTradingDays: 0,
  dayWinRate: 0,
  profitFactor: 0,
  grossProfit: 0,
  grossLoss: 0,
  avgPnL: 0,
};

const calculateStats = (trades = []) => {
  let totalPnL = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const dayPnLMap = new Map();

  trades.forEach((trade) => {
    const pnl = Number(trade?.pnl);

    if (Number.isNaN(pnl)) return;
    totalPnL += pnl;

    if (pnl > 0) {
      winningTrades += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losingTrades += 1;
      grossLoss += Math.abs(pnl);
    }

    const tradeDate = getTradeDisplayDate(trade);
    if (tradeDate) {
      const key = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(tradeDate.getDate()).padStart(2, '0')}`;
      dayPnLMap.set(key, (dayPnLMap.get(key) || 0) + pnl);
    }
  });

  let winningDays = 0;
  let losingDays = 0;
  dayPnLMap.forEach((dayPnL) => {
    if (dayPnL > 0) winningDays += 1;
    else if (dayPnL < 0) losingDays += 1;
  });

  const totalTradingDays = winningDays + losingDays;
  const dayWinRate = totalTradingDays > 0 ? (winningDays / totalTradingDays) * 100 : 0;
  const totalTrades = trades.length;
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;

  return {
    totalPnL,
    winRate,
    winningTrades,
    losingTrades,
    totalTrades,
    winningDays,
    losingDays,
    totalTradingDays,
    dayWinRate,
    profitFactor,
    grossProfit,
    grossLoss,
    avgPnL,
  };
};

const readStatsCache = () => {
  try {
    const saved = localStorage.getItem(STATS_CACHE_KEY);
    if (saved) {
      const decoded = decodeStorageValue(saved);
      return decoded?.scopes ? decoded : { scopes: { [DEFAULT_STATS_SCOPE]: decoded } };
    }

    const legacySaved =
      localStorage.getItem(LEGACY_STATS_CACHE_KEY) ||
      localStorage.getItem(PREVIOUS_STATS_CACHE_KEY);
    if (legacySaved) {
      const stats = JSON.parse(legacySaved);
      const nextCache = { scopes: { [DEFAULT_STATS_SCOPE]: stats } };
      localStorage.setItem(STATS_CACHE_KEY, encodeStorageValue(nextCache));
      localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
      localStorage.removeItem(PREVIOUS_STATS_CACHE_KEY);
      return nextCache;
    }

    return { scopes: {} };
  } catch {
    localStorage.removeItem(STATS_CACHE_KEY);
    localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
    localStorage.removeItem(PREVIOUS_STATS_CACHE_KEY);
    return { scopes: {} };
  }
};

const writeStatsCache = (scopeKey, stats) => {
  try {
    const cache = readStatsCache();
    const nextCache = {
      ...cache,
      scopes: {
        ...(cache.scopes || {}),
        [scopeKey]: stats,
      },
    };
    localStorage.setItem(STATS_CACHE_KEY, encodeStorageValue(nextCache));
    localStorage.removeItem(LEGACY_STATS_CACHE_KEY);
    localStorage.removeItem(PREVIOUS_STATS_CACHE_KEY);
  } catch {
    // Cache is a performance hint only.
  }
};

function StatsCards({ trades, currencyCode = 'USD', isLoading = false, statsScopeKey = DEFAULT_STATS_SCOPE }) {
  const [initialCache] = useState(() => readStatsCache());

  const cachedStats = useMemo(() => (
    readStatsCache().scopes?.[statsScopeKey] || initialCache.scopes?.[statsScopeKey] || null
  ), [initialCache.scopes, statsScopeKey]);

  const stats = useMemo(() => {
    if (Array.isArray(trades) && (!isLoading || trades.length > 0)) {
      const result = calculateStats(trades);
      writeStatsCache(statsScopeKey, result);
      return result;
    }

    if (isLoading && cachedStats) {
      return cachedStats;
    }

    return {
      ...emptyStats,
      isPlaceholder: true,
    };
  }, [trades, cachedStats, isLoading, statsScopeKey]);

  const netPnlTone = stats.totalPnL >= 0 ? 'positive' : 'negative';
  const avgTone = stats.avgPnL >= 0 ? 'positive' : 'negative';

  const showSkeleton = isLoading && !cachedStats;

  const winPercent = Math.min(100, Math.max(0, Number(stats.winRate) || 0));
  const dayWinPercent = Math.min(100, Math.max(0, Number(stats.dayWinRate) || 0));

  // Conic Gradient calculations for Profitable Trade %
  const totalTradesCount = (stats.winningTrades || 0) + (stats.losingTrades || 0);
  const lossRatio = totalTradesCount > 0
    ? (stats.losingTrades || 0) / totalTradesCount
    : (stats.winRate > 0 ? (100 - stats.winRate) / 100 : 0.5);
  const lossConicPercent = (lossRatio * 50).toFixed(2);

  const tradeArcConicStyle = {
    background: `conic-gradient(from 0.75turn at 50% 100%, #ef4444 0% ${lossConicPercent}%, #00e676 ${lossConicPercent}% 50%, transparent 50% 100%)`,
    WebkitMaskImage: 'radial-gradient(at 50% 100%, rgba(0, 0, 0, 0) 48%, rgb(0, 0, 0) 45.5%)',
    maskImage: 'radial-gradient(at 50% 100%, rgba(0, 0, 0, 0) 48%, rgb(0, 0, 0) 45.5%)',
    WebkitMaskMode: 'alpha',
    maskMode: 'alpha',
  };

  // Conic Gradient calculations for Profitable Day %
  const totalDaysCount = (stats.winningDays || 0) + (stats.losingDays || 0);
  const lossDayRatio = totalDaysCount > 0
    ? (stats.losingDays || 0) / totalDaysCount
    : (stats.dayWinRate > 0 ? (100 - stats.dayWinRate) / 100 : 0.5);
  const lossDayConicPercent = (lossDayRatio * 50).toFixed(2);

  const dayArcConicStyle = {
    background: `conic-gradient(from 0.75turn at 50% 100%, #ef4444 0% ${lossDayConicPercent}%, #00e676 ${lossDayConicPercent}% 50%, transparent 50% 100%)`,
    WebkitMaskImage: 'radial-gradient(at 50% 100%, rgba(0, 0, 0, 0) 48%, rgb(0, 0, 0) 45.5%)',
    maskImage: 'radial-gradient(at 50% 100%, rgba(0, 0, 0, 0) 48%, rgb(0, 0, 0) 45.5%)',
    WebkitMaskMode: 'alpha',
    maskMode: 'alpha',
  };

  const totalGross = (Number(stats.grossProfit) || 0) + (Number(stats.grossLoss) || 0);
  const profitRatio = totalGross > 0
    ? (Number(stats.grossProfit) || 0) / totalGross
    : (stats.profitFactor > 0 ? 0.5 : 0);
  const profitConicPercent = (profitRatio * 100).toFixed(2);

  const donutConicStyle = {
    background: `conic-gradient(#00e676 0% ${profitConicPercent}%, #ef4444 ${profitConicPercent}% 100%)`,
    WebkitMaskImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 0) 52%, rgb(0, 0, 0) 50%)',
    maskImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 0) 52%, rgb(0, 0, 0) 50%)',
    WebkitMaskMode: 'alpha',
    maskMode: 'alpha',
  };

  const cards = [
    {
      key: 'net',
      title: 'Total P&L',
      value: formatDashboardCurrency(stats.totalPnL, currencyCode),
      tone: netPnlTone,
      icon: CircleDollarSign,
      info: 'Total profit or loss from all trades in the current filter.',
    },
    {
      key: 'day-win-rate',
      title: 'Profitable Day %',
      value: `${dayWinPercent.toFixed(1)}%`,
      tone: 'neutral',
      info: 'Percentage of trading days that closed with net positive P&L.',
      gauge: (
        <div className="group/gauge relative flex flex-col items-center justify-center shrink-0 cursor-pointer" tabIndex={0} role="group" aria-label="Profitable Day Breakdown">
          <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 translate-y-1 group-hover/gauge:translate-y-0 opacity-0 invisible group-hover/gauge:opacity-100 group-hover/gauge:visible transition-all duration-150 flex flex-col gap-1 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--divider-strong)] text-[var(--heading)] shadow-xl text-[11px] font-bold whitespace-nowrap z-50 pointer-events-none" role="tooltip">
            <span className="text-emerald-500">{stats.winningDays || 0} Profitable Days</span>
            <span className="text-rose-500">{stats.losingDays || 0} Losing Days</span>
          </div>
          <div className="relative w-[60px] h-[30px] rounded-t-[60px] overflow-hidden">
            <div className="absolute inset-0 rounded-t-[60px]" style={dayArcConicStyle} />
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-extrabold bg-rose-500/15 text-rose-500 leading-none">{stats.losingDays || 0}</span>
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-extrabold bg-emerald-500/15 text-emerald-500 leading-none">{stats.winningDays || 0} DAYS</span>
          </div>
        </div>
      ),
    },
    {
      key: 'win-rate',
      title: 'Profitable Trade %',
      value: `${winPercent.toFixed(1)}%`,
      tone: 'neutral',
      info: 'Percentage of trades that closed with positive P&L.',
      gauge: (
        <div className="group/gauge relative flex flex-col items-center justify-center shrink-0 cursor-pointer" tabIndex={0} role="group" aria-label="Trade Win Breakdown">
          <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 translate-y-1 group-hover/gauge:translate-y-0 opacity-0 invisible group-hover/gauge:opacity-100 group-hover/gauge:visible transition-all duration-150 flex flex-col gap-1 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--divider-strong)] text-[var(--heading)] shadow-xl text-[11px] font-bold whitespace-nowrap z-50 pointer-events-none" role="tooltip">
            <span className="text-emerald-500">{stats.winningTrades || 0} Profitable Trades</span>
            <span className="text-rose-500">{stats.losingTrades || 0} Losing Trades</span>
          </div>
          <div className="relative w-[60px] h-[30px] rounded-t-[60px] overflow-hidden">
            <div className="absolute inset-0 rounded-t-[60px]" style={tradeArcConicStyle} />
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-extrabold bg-rose-500/15 text-rose-500 leading-none">{stats.losingTrades || 0}</span>
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-extrabold bg-emerald-500/15 text-emerald-500 leading-none">{stats.winningTrades || 0} TRADES</span>
          </div>
        </div>
      ),
    },
    {
      key: 'factor',
      title: 'Profit Factor',
      value: formatNumber(stats.profitFactor),
      tone: 'neutral',
      info: 'Gross profit divided by gross loss; above 1 means profit is beating loss.',
      gauge: (
        <div className="group/gauge relative flex flex-col items-center justify-center shrink-0 cursor-pointer" tabIndex={0} role="group" aria-label="Profit Factor Breakdown">
          <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 translate-y-1 group-hover/gauge:translate-y-0 opacity-0 invisible group-hover/gauge:opacity-100 group-hover/gauge:visible transition-all duration-150 flex flex-col gap-1 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--divider-strong)] text-[var(--heading)] shadow-xl text-[11px] font-bold whitespace-nowrap z-50 pointer-events-none" role="tooltip">
            <span className="text-emerald-500">Gross Profit: +{formatDashboardCurrency(stats.grossProfit, currencyCode)}</span>
            <span className="text-rose-500">Gross Loss: -{formatDashboardCurrency(stats.grossLoss, currencyCode)}</span>
          </div>
          <div className="relative size-9 rounded-full overflow-hidden">
            <div className="absolute inset-0" style={donutConicStyle} />
          </div>
        </div>
      ),
    },
    {
      key: 'avg',
      title: 'Avg P&L',
      value: formatDashboardCurrency(stats.avgPnL, currencyCode),
      tone: avgTone,
      icon: Sigma,
      info: 'Average P&L per trade in the current filter.',
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full mb-2.5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            as="article"
            key={card.key}
            padding="none"
            className={`relative flex flex-col justify-between p-3.5 min-h-[82px] hover:-translate-y-0.5 transition-all duration-150 ${
              card.tone === 'positive'
                ? 'hover:border-emerald-500/40'
                : card.tone === 'negative'
                ? 'hover:border-rose-500/40'
                : 'hover:border-brand-solid/40'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-fluid-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] m-0 truncate">
                    {card.title}
                  </p>
                  <InfoTooltip text={card.info} size={12} side="bottom-left" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {showSkeleton ? (
                  <span className="inline-block w-24 h-7 rounded-lg bg-[var(--surface-subtle)] animate-pulse" />
                ) : (
                  <span className={`text-fluid-lg font-bold tracking-tight truncate ${
                    card.tone === 'positive'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : card.tone === 'negative'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[var(--heading)]'
                  }`}>
                    {card.value}
                  </span>
                )}
                {card.gauge ? (
                  card.gauge
                ) : Icon ? (
                  <span className={`flex items-center justify-center size-8 rounded-xl shrink-0 ${
                    card.tone === 'positive'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : card.tone === 'negative'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-brand-solid/10 text-brand-solid'
                  }`}>
                    <Icon size={16} />
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

export default StatsCards;
