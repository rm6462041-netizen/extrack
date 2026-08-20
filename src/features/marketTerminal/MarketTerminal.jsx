import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  RefreshCw,
  Settings,
  X,
} from '../../icons/lucideIcons';
import MainContentWrapper from '../../components/Layout/MainContentWrapper';
import PageHeader from '../../components/Layout/PageHeader';
import SymbolWithIcon from '../../components/Common/SymbolWithIcon/SymbolWithIcon';
import { ChartLayoutPicker } from '../../components/Common/TradingChartChrome/TradingChartChrome';
import { useAppDialog } from '../../context/AppDialogContext';
import api from '../../utils/common/serve';
import { formatTradePrice } from '../../utils/trading/tradeCalculations';
import { subscribeMarketStream } from './marketStream';

// Alerts Module Imports
import PriceAlertsDrawer from './alerts/components/PriceAlertsDrawer';
import { ALERTS_STORAGE_KEY } from './alerts/constants/alertConstants';
import { loadSavedAlerts } from './alerts/utils/alertStorage';
import { playAlertSound } from './alerts/utils/alertAudio';

// Terminal Custom Hooks & Utilities
import { useInstruments } from '../../hooks/useInstruments';
import useResizableTerminalLayout from './hooks/useResizableTerminalLayout';
import {
  DEFAULT_SYMBOL,
  LAYOUTS,
  MAX_CHARTS,
  WATCHLIST_SYMBOLS_STORAGE_KEY,
} from './utils/marketTerminalConstants';
import {
  getDatabaseInstrumentDigits,
  readInstrumentDigits,
} from './utils/instrumentDigits';
import {
  buildPrioritizedSymbolOptions,
  buildWatchlistSections,
  createChartId,
  enrichQuoteTodayDirection,
  getLocalDateKey,
  getPointerDropTarget,
  getRequestSymbol,
  normalizeStreamQuote,
  normalizeStreamSymbol,
  readDraggedSymbol,
  readStoredWatchlistSymbols,
  resolveWatchlistSymbols,
} from './utils/terminalHelpers';

// Sub-components
import { Chart } from '../../components/Markets';
import AddChartSymbolPicker from './components/ChartPane/AddChartSymbolPicker';
import WatchlistPanel from './components/Watchlist/WatchlistPanel';
import OrderPanel from './components/OrderPanel/OrderPanel';
import PositionsPanel from './components/PositionsPanel/PositionsPanel';
import ResizeHandle from './components/Common/ResizeHandle';
import TerminalSettingsModal from './components/Settings/TerminalSettingsModal';

function MarketTerminal({ pageActive = true }) {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState([]);
  const [selectedWatchlistSymbols, setSelectedWatchlistSymbols] = useState(readStoredWatchlistSymbols);
  const [instrumentDigitsBySymbol, setInstrumentDigitsBySymbol] = useState({});
  const [charts, setCharts] = useState([{ id: createChartId(), symbol: DEFAULT_SYMBOL, interval: '1m' }]);
  const [activeChartId, setActiveChartId] = useState(charts[0].id);
  const [layout, setLayout] = useState('1');
  const [fitNonce, setFitNonce] = useState(0);
  const [quotes, setQuotes] = useState({});
  const [chartAreaDragActive, setChartAreaDragActive] = useState(false);
  const [pointerDrag, setPointerDrag] = useState(null);
  const pointerDragRef = useRef(null);
  const suppressWatchlistClickRef = useRef(false);
  const { sizes, beginResize, resetSizes } = useResizableTerminalLayout();
  const watchlistQuoteBufferRef = useRef({});
  const watchlistQuoteFlushTimerRef = useRef(null);
  const watchlistTodayBaselineRef = useRef({ dateKey: getLocalDateKey(), prices: {}, dailyReferences: {} });

  const [showWatchlist, setShowWatchlist] = useState(() => {
    try {
      const saved = window.localStorage.getItem('market_terminal_show_watchlist');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [showOrderPanel, setShowOrderPanel] = useState(() => {
    try {
      const saved = window.localStorage.getItem('market_terminal_show_order');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [showPositionsPanel, setShowPositionsPanel] = useState(() => {
    try {
      const saved = window.localStorage.getItem('market_terminal_show_positions');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [alerts, setAlerts] = useState(loadSavedAlerts);
  const alertsRef = useRef(alerts);
  const prevPricesRef = useRef({});
  const { notify } = useAppDialog();

  useEffect(() => {
    alertsRef.current = alerts;
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // Ignore storage failures
    }
  }, [alerts]);

  useEffect(() => {
    try {
      window.localStorage.setItem('market_terminal_show_watchlist', JSON.stringify(showWatchlist));
      window.localStorage.setItem('market_terminal_show_order', JSON.stringify(showOrderPanel));
      window.localStorage.setItem('market_terminal_show_positions', JSON.stringify(showPositionsPanel));
    } catch {
      // Ignore storage failures
    }
  }, [showWatchlist, showOrderPanel, showPositionsPanel]);

  const activeChart = charts.find((item) => item.id === activeChartId) || charts[0];
  const activeSymbol = activeChart?.symbol || DEFAULT_SYMBOL;
  const activeQuote = quotes[activeSymbol];
  const selectedLayout = LAYOUTS.find((item) => item.value === layout) || LAYOUTS[0];
  const visibleCharts = useMemo(() => {
    if (charts.length <= selectedLayout.capacity) return charts;
    const activeIndex = charts.findIndex((item) => item.id === activeChartId);
    if (activeIndex >= 0 && activeIndex < selectedLayout.capacity) {
      return charts.slice(0, selectedLayout.capacity);
    }
    if (selectedLayout.capacity === 1) return activeChart ? [activeChart] : charts.slice(0, 1);
    return [...charts.slice(0, selectedLayout.capacity - 1), activeChart].filter(Boolean);
  }, [activeChart, activeChartId, charts, selectedLayout.capacity]);
  const compact = visibleCharts.length > 1;
  const { data: dbInstruments = [] } = useInstruments('', { limit: 250 });
  const allAvailableSymbols = useMemo(() => {
    const bySymbol = new Map();
    dbInstruments.forEach((item) => {
      const key = normalizeStreamSymbol(getRequestSymbol(item));
      if (key && !bySymbol.has(key)) bySymbol.set(key, item);
    });
    symbols.forEach((item) => {
      const key = normalizeStreamSymbol(getRequestSymbol(item));
      if (key && !bySymbol.has(key)) bySymbol.set(key, item);
    });
    return Array.from(bySymbol.values());
  }, [dbInstruments, symbols]);

  const selectedWatchlistItems = useMemo(() => (
    resolveWatchlistSymbols(allAvailableSymbols, selectedWatchlistSymbols)
  ), [allAvailableSymbols, selectedWatchlistSymbols]);
  const watchlistSections = useMemo(() => (
    buildWatchlistSections(selectedWatchlistItems)
  ), [selectedWatchlistItems]);
  const quoteSymbols = useMemo(() => Array.from(new Set([
    activeSymbol,
    ...watchlistSections.flatMap((section) => section.rows.map((row) => row.requestSymbol)),
  ].filter(Boolean))), [activeSymbol, watchlistSections]);
  const addChartSymbolOptions = useMemo(() => (
    buildPrioritizedSymbolOptions(allAvailableSymbols, selectedWatchlistSymbols, '')
  ), [allAvailableSymbols, selectedWatchlistSymbols]);

  const handleAddAlert = useCallback(({ symbol, targetPrice, condition, note }) => {
    const priceNum = Number(targetPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;

    const currentQuote = quotes[symbol] || (activeSymbol === symbol ? activeQuote : null);
    const currPrice = Number(currentQuote?.last ?? currentQuote?.bid ?? currentQuote?.ask ?? 0);
    const finalCondition = condition || (priceNum >= currPrice ? 'ABOVE' : 'BELOW');

    const newAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      symbol,
      targetPrice: priceNum,
      condition: finalCondition,
      createdAt: Date.now(),
      status: 'ACTIVE',
      triggeredAt: null,
      note: note || '',
    };

    setAlerts((prev) => [newAlert, ...prev]);
    const digits = readInstrumentDigits(instrumentDigitsBySymbol, symbol);
    notify?.(`🔔 Alert created for ${symbol} at ${formatTradePrice(priceNum, digits)}`, 'info');
  }, [activeQuote, activeSymbol, instrumentDigitsBySymbol, notify, quotes]);

  const handleDeleteAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const handleClearTriggeredAlerts = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => a.status !== 'TRIGGERED'));
  }, []);

  const handleUpdateAlertPrice = useCallback((alertId, newTargetPrice) => {
    const priceNum = Number(newTargetPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, targetPrice: priceNum } : a)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(quoteSymbols.map(async (symbol) => [
      normalizeStreamSymbol(symbol),
      await getDatabaseInstrumentDigits(symbol),
    ])).then((entries) => {
      if (!cancelled) setInstrumentDigitsBySymbol((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [quoteSymbols]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHLIST_SYMBOLS_STORAGE_KEY, JSON.stringify(selectedWatchlistSymbols));
    } catch {
      // Ignore storage failures and keep the current in-memory watchlist.
    }
  }, [selectedWatchlistSymbols]);

  const updateActiveChart = useCallback((patch) => {
    setCharts((currentCharts) => currentCharts.map((item) => (
      item.id === activeChartId ? { ...item, ...patch } : item
    )));
  }, [activeChartId]);

  const handleSymbols = useCallback((nextSymbols) => {
    setSymbols((currentSymbols) => (currentSymbols.length ? currentSymbols : nextSymbols));
  }, []);

  const handleQuote = useCallback((symbol, tick) => {
    if (!symbol || !tick) return;
    const nextQuote = enrichQuoteTodayDirection(symbol, tick, watchlistTodayBaselineRef);
    setQuotes((currentQuotes) => ({ ...currentQuotes, [symbol]: nextQuote }));
  }, []);

  const addWatchlistSymbol = useCallback((symbol) => {
    const normalizedSymbol = normalizeStreamSymbol(symbol);
    if (!normalizedSymbol) return;
    setSelectedWatchlistSymbols((currentSymbols) => (
      currentSymbols.some((item) => normalizeStreamSymbol(item) === normalizedSymbol)
        ? currentSymbols
        : [...currentSymbols, normalizedSymbol]
    ));
  }, []);

  const removeWatchlistSymbol = useCallback((symbol) => {
    const normalizedSymbol = normalizeStreamSymbol(symbol);
    if (!normalizedSymbol) return;
    setSelectedWatchlistSymbols((currentSymbols) => (
      currentSymbols.filter((item) => normalizeStreamSymbol(item) !== normalizedSymbol)
    ));
  }, []);

  const flushWatchlistQuotes = useCallback(() => {
    watchlistQuoteFlushTimerRef.current = null;
    const bufferedQuotes = watchlistQuoteBufferRef.current;
    watchlistQuoteBufferRef.current = {};

    if (Object.keys(bufferedQuotes).length === 0) return;
    setQuotes((currentQuotes) => ({ ...currentQuotes, ...bufferedQuotes }));
  }, []);

  const queueWatchlistQuote = useCallback((symbol, quote) => {
    const enriched = enrichQuoteTodayDirection(symbol, quote, watchlistTodayBaselineRef);
    watchlistQuoteBufferRef.current[symbol] = enriched;
    if (watchlistQuoteFlushTimerRef.current) return;
    watchlistQuoteFlushTimerRef.current = window.setTimeout(flushWatchlistQuotes, 80);
  }, [flushWatchlistQuotes]);

  useEffect(() => () => {
    if (watchlistQuoteFlushTimerRef.current) {
      window.clearTimeout(watchlistQuoteFlushTimerRef.current);
      watchlistQuoteFlushTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    pointerDragRef.current = null;
  }, []);

  useEffect(() => {
    if (!pageActive || symbols.length > 0) return undefined;
    const activeKey = normalizeStreamSymbol(activeSymbol);
    if (!Object.hasOwn(instrumentDigitsBySymbol, activeKey)) return undefined;
    let cancelled = false;

    api.get('/market-chart/live', {
      params: {
        symbol: activeSymbol,
        interval: activeChart?.interval || '1m',
        subscribe: false,
      },
    }).then((response) => {
      if (cancelled) return;
      if (Array.isArray(response.data?.symbols)) handleSymbols(response.data.symbols);
      if (response.data?.quote) {
        handleQuote(activeSymbol, normalizeStreamQuote(
          response.data.quote,
          readInstrumentDigits(instrumentDigitsBySymbol, activeSymbol)
        ));
      }
    }).catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [activeChart?.interval, activeSymbol, handleQuote, handleSymbols, instrumentDigitsBySymbol, pageActive, symbols.length]);

  useEffect(() => {
    if (!pageActive || watchlistSections.length === 0) return undefined;

    const requestSymbols = quoteSymbols;
    const requestKeyBySymbol = new Map(
      requestSymbols.map((symbol) => [normalizeStreamSymbol(symbol), symbol])
    );
    let cancelled = false;

    api.get('/market-chart/watchlist-quotes', {
      params: { symbols: requestSymbols.join(',') },
    }).then((response) => {
      if (cancelled || !response.data?.quotes) return;
      const nextQuotes = {};
      for (const [key, value] of Object.entries(response.data.quotes)) {
        const requestSymbol = requestKeyBySymbol.get(normalizeStreamSymbol(key)) || key;
        nextQuotes[requestSymbol] = value
          ? enrichQuoteTodayDirection(requestSymbol, normalizeStreamQuote(
            value,
            readInstrumentDigits(instrumentDigitsBySymbol, requestSymbol)
          ), watchlistTodayBaselineRef)
          : null;
      }
      setQuotes((currentQuotes) => ({ ...currentQuotes, ...nextQuotes }));
    }).catch(() => null);

    const unsubscribe = subscribeMarketStream({
      symbols: requestSymbols,
      onTick: (tick) => {
        const requestSymbol = requestKeyBySymbol.get(normalizeStreamSymbol(tick?.symbolName));
        if (!requestSymbol) return;
        const nextQuote = normalizeStreamQuote(
          tick,
          readInstrumentDigits(instrumentDigitsBySymbol, requestSymbol)
        );
        queueWatchlistQuote(requestSymbol, nextQuote);

        const currentPrice = Number(nextQuote.last ?? nextQuote.bid ?? nextQuote.ask);
        if (Number.isFinite(currentPrice) && currentPrice > 0) {
          const prevPrice = prevPricesRef.current[requestSymbol];
          prevPricesRef.current[requestSymbol] = currentPrice;

          if (Number.isFinite(prevPrice) && prevPrice > 0 && prevPrice !== currentPrice) {
            const currentAlerts = alertsRef.current;
            let triggeredAny = false;
            const updatedAlerts = currentAlerts.map((alert) => {
              if (alert.status !== 'ACTIVE' || alert.symbol !== requestSymbol) return alert;

              const target = Number(alert.targetPrice);
              if (!Number.isFinite(target)) return alert;

              let isTriggered = false;
              if (alert.condition === 'ABOVE' && prevPrice < target && currentPrice >= target) {
                isTriggered = true;
              } else if (alert.condition === 'BELOW' && prevPrice > target && currentPrice <= target) {
                isTriggered = true;
              } else if (
                (prevPrice < target && currentPrice >= target) ||
                (prevPrice > target && currentPrice <= target)
              ) {
                isTriggered = true;
              }

              if (isTriggered) {
                triggeredAny = true;
                playAlertSound();
                const displayPrice = formatTradePrice(
                  target,
                  readInstrumentDigits(instrumentDigitsBySymbol, requestSymbol)
                );
                notify?.(`🔔 ALERT: ${alert.symbol} hit target price ${displayPrice}!`, 'warning');
                return {
                  ...alert,
                  status: 'TRIGGERED',
                  triggeredAt: Date.now(),
                  triggeredPrice: currentPrice,
                };
              }
              return alert;
            });

            if (triggeredAny) {
              setAlerts(updatedAlerts);
            }
          }
        }
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [instrumentDigitsBySymbol, notify, pageActive, queueWatchlistQuote, quoteSymbols, watchlistSections.length]);

  const addChart = useCallback((symbol) => {
    const normalizedSymbol = normalizeStreamSymbol(symbol);
    if (!normalizedSymbol) return;
    setCharts((currentCharts) => {
      if (currentCharts.length >= MAX_CHARTS) return currentCharts;
      const nextChart = {
        id: createChartId(),
        symbol: normalizedSymbol,
        interval: activeChart?.interval || '1m',
      };
      setActiveChartId(nextChart.id);
      return [...currentCharts, nextChart];
    });
  }, [activeChart]);

  const replaceChartSymbol = useCallback((chartId, symbol) => {
    const normalizedSymbol = normalizeStreamSymbol(symbol);
    if (!normalizedSymbol) return;
    setActiveChartId(chartId);
    setCharts((currentCharts) => currentCharts.map((chart) => (
      chart.id === chartId ? { ...chart, symbol: normalizedSymbol } : chart
    )));
  }, []);

  const handlePointerDragStart = useCallback((event, symbol, label) => {
    const normalizedSymbol = normalizeStreamSymbol(symbol);
    if (!normalizedSymbol) return;
    if (pointerDragRef.current) return;
    const startX = event.clientX;
    const startY = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerDragRef.current = {
      active: false,
      label: label || normalizedSymbol,
      symbol: normalizedSymbol,
      startX,
      startY,
      x: startX,
      y: startY,
    };

    const handleMove = (moveEvent) => {
      const drag = pointerDragRef.current;
      if (!drag) return;
      const moved = Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY);
      if (!drag.active && moved < 6) return;
      moveEvent.preventDefault?.();
      const nextDrag = {
        ...drag,
        active: true,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      };
      pointerDragRef.current = nextDrag;
      setPointerDrag(nextDrag);
      setChartAreaDragActive(Boolean(getPointerDropTarget(moveEvent.clientX, moveEvent.clientY)));
    };

    const cleanupDragListeners = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('blur', handleCancel);
    };

    const finishDrag = (clientX, clientY) => {
      const drag = pointerDragRef.current;
      pointerDragRef.current = null;
      cleanupDragListeners();
      setPointerDrag(null);
      setChartAreaDragActive(false);
      if (!drag?.active) return;
      suppressWatchlistClickRef.current = true;
      window.setTimeout(() => {
        suppressWatchlistClickRef.current = false;
      }, 0);
      const target = getPointerDropTarget(clientX, clientY);
      if (!target) return;
      const targetChartId = target.getAttribute('data-chart-id');
      if (targetChartId) {
        replaceChartSymbol(targetChartId, drag.symbol);
      } else {
        addChart(drag.symbol);
      }
    };

    function handleUp(upEvent) {
      finishDrag(upEvent.clientX, upEvent.clientY);
    }

    function handleCancel() {
      pointerDragRef.current = null;
      cleanupDragListeners();
      setPointerDrag(null);
      setChartAreaDragActive(false);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('blur', handleCancel);
  }, [addChart, replaceChartSymbol]);

  const handleChartAreaDrop = useCallback((event) => {
    const symbol = readDraggedSymbol(event);
    if (!symbol) return;
    event.preventDefault();
    setChartAreaDragActive(false);
    addChart(symbol);
  }, [addChart]);

  const closeChart = useCallback((chartId) => {
    setCharts((currentCharts) => {
      if (currentCharts.length === 1) return currentCharts;
      const nextCharts = currentCharts.filter((item) => item.id !== chartId);
      if (activeChartId === chartId) setActiveChartId(nextCharts[0].id);
      return nextCharts;
    });
  }, [activeChartId]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/dashboard');
  }, [navigate]);

  const workspaceStyle = {
    '--market-grid-columns': selectedLayout.columns,
    '--market-grid-rows': selectedLayout.rows,
    '--watchlist-width': showWatchlist ? `${sizes.watchlistWidth}px` : '0px',
    '--watchlist-handle-width': showWatchlist ? '3px' : '0px',
    '--order-width': showOrderPanel ? `${sizes.orderWidth}px` : '0px',
    '--order-handle-width': showOrderPanel ? '3px' : '0px',
    '--bottom-height': showPositionsPanel ? `${sizes.bottomHeight}px` : '0px',
    '--positions-handle-height': showPositionsPanel ? '3px' : '0px',
  };

  return (
    <MainContentWrapper className="flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden box-border pt-0 px-2.5 pb-2.5 max-[768px]:pt-[60px] max-[768px]:px-2 max-[768px]:pb-2 max-[520px]:px-1.5 max-[480px]:pb-[calc(82px+env(safe-area-inset-bottom,0px))]">
      <PageHeader
        title="Market Terminal"
        onBack={goBack}
        keepVisible
        className="relative z-10 mb-1.5 shrink-0"
        actions={(
          <div className="flex items-center gap-1.5">
            <ChartLayoutPicker layout={layout} layouts={LAYOUTS} onLayoutChange={setLayout} />
            <button className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => setFitNonce((value) => value + 1)} title="Fit active chart" type="button">
              <RefreshCw size={14} aria-hidden="true" />
            </button>
            <button
              className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${showAlertsDrawer ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-medium,#94a3b8)]' : ''}`}
              onClick={() => setShowAlertsDrawer((prev) => !prev)}
              title="Price Alerts"
              type="button"
            >
              <Bell size={14} aria-hidden="true" />
              {alerts.filter((a) => a.status === 'ACTIVE').length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent-danger,#ef4444)] text-white text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-sm">
                  {alerts.filter((a) => a.status === 'ACTIVE').length}
                </span>
              )}
            </button>
            <button
              className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${showSettingsModal ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-medium,#94a3b8)]' : ''}`}
              onClick={() => setShowSettingsModal((prev) => !prev)}
              title="Terminal Settings"
              type="button"
            >
              <Settings size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      />
      <div className="relative flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl">
        <header className="flex items-center justify-between min-h-[38px] border-b border-[var(--border-light)] bg-[var(--bg-card)] shrink-0 overflow-x-auto scrollbar-none z-10">
          <div className="flex items-center min-w-0 flex-1 overflow-x-auto scrollbar-none">
            {charts.map((item) => {
              const tabQuote = quotes[item.symbol || DEFAULT_SYMBOL];
              const tabDirection = tabQuote?.todayDirection === 'down' ? 'down' : 'up';
              const tabPrice = tabQuote?.lastText || tabQuote?.bidText || '-';
              const tabChange = tabQuote?.todayChangePercentText || '0.00%';
              return (
                <button
                  className={`flex items-center gap-2 h-[38px] px-3 border-r border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors select-none shrink-0 group hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${
                    item.id === activeChartId ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border-b-2 border-b-[var(--primary,#2563eb)]' : ''
                  }`}
                  key={item.id}
                  onClick={() => setActiveChartId(item.id)}
                  type="button"
                >
                  <span className="flex items-center shrink-0">
                    <SymbolWithIcon symbol={item.symbol} size="md" showLabel={false} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <strong className="text-xs font-bold text-[var(--text-primary)]">{item.symbol}</strong>
                      <span className={`w-1.5 h-1.5 rounded-full ${tabDirection === 'down' ? 'bg-[var(--bear-candle,#f23645)]' : 'bg-[var(--bull-candle,#089981)]'}`} aria-hidden="true" />
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] tabular-nums font-medium text-[var(--text-muted)]">
                      <span>{tabPrice}</span>
                      <span>{tabChange}</span>
                    </span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1 py-0.5 rounded bg-[var(--surface-muted-strong)] text-[var(--text-secondary)]">{item.interval}</span>
                  {charts.length > 1 && (
                    <i
                      role="button"
                      tabIndex={0}
                      title="Close chart"
                      className="flex items-center justify-center w-4 h-4 rounded text-[var(--text-muted)] hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors not-italic ml-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeChart(item.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          closeChart(item.id);
                        }
                      }}
                    >
                      <X size={12} aria-hidden="true" />
                    </i>
                  )}
                </button>
              );
            })}
          </div>

          <AddChartSymbolPicker
            disabled={charts.length >= MAX_CHARTS}
            onSelect={addChart}
            options={addChartSymbolOptions}
          />
        </header>

        <div className="grid min-w-0 min-h-0 flex-1 overflow-hidden relative grid-cols-[var(--watchlist-width,240px)_var(--watchlist-handle-width,3px)_minmax(0,1fr)_var(--order-handle-width,3px)_var(--order-width,260px)] grid-rows-[1fr_var(--positions-handle-height,3px)_var(--bottom-height,140px)]" style={workspaceStyle}>
          {showWatchlist && (
            <>
              <WatchlistPanel
                activeSymbol={activeSymbol}
                availableSymbols={allAvailableSymbols}
                onAddSymbol={addWatchlistSymbol}
                onPointerDragStart={handlePointerDragStart}
                onRemoveSymbol={removeWatchlistSymbol}
                onSelectSymbol={(symbol) => {
                  if (suppressWatchlistClickRef.current) return;
                  updateActiveChart({ symbol });
                }}
                quotes={quotes}
                sections={watchlistSections}
                onClose={() => setShowWatchlist(false)}
              />
              <ResizeHandle
                axis="vertical"
                label="Resize instruments panel"
                onPointerDown={(event) => beginResize('watchlist', event)}
              />
            </>
          )}
          <main
            className={`col-start-3 row-start-1 min-w-0 min-h-0 overflow-hidden relative flex flex-col bg-[var(--bg-main)] ${chartAreaDragActive ? 'ring-2 ring-inset ring-[var(--primary,#2563eb)] bg-[var(--accent-info-soft)]/20' : ''}`}
            data-chart-drop-target="area"
            onDragEnter={(event) => {
              if (readDraggedSymbol(event)) setChartAreaDragActive(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setChartAreaDragActive(false);
            }}
            onDragOver={(event) => {
              if (!readDraggedSymbol(event)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={handleChartAreaDrop}
          >
            <div className="grid grid-cols-[repeat(var(--market-grid-columns,1),minmax(0,1fr))] grid-rows-[repeat(var(--market-grid-rows,1),minmax(0,1fr))] gap-px bg-[var(--border-light)] w-full h-full min-w-0 min-h-0 overflow-hidden">
              {visibleCharts.map((item) => (
                <Chart
                  active={item.id === activeChartId}
                  alerts={alerts}
                  availableSymbols={allAvailableSymbols}
                  chart={item}
                  compact={compact}
                  fitNonce={fitNonce}
                  initialQuote={quotes[item.symbol || DEFAULT_SYMBOL]}
                  key={item.id}
                  layout={layout}
                  onAddAlert={handleAddAlert}
                  onUpdateAlertPrice={handleUpdateAlertPrice}
                  onDeleteAlert={handleDeleteAlert}
                  onLayoutChange={setLayout}
                  pageActive={pageActive}
                  prioritySymbols={selectedWatchlistSymbols}
                  onActivate={() => setActiveChartId(item.id)}
                  onDropSymbol={(symbol) => replaceChartSymbol(item.id, symbol)}
                  onIntervalChange={(interval) => {
                    setActiveChartId(item.id);
                    setCharts((currentCharts) => currentCharts.map((chart) => (
                      chart.id === item.id ? { ...chart, interval } : chart
                    )));
                  }}
                  onSymbolChange={(symbol) => {
                    replaceChartSymbol(item.id, symbol);
                  }}
                  onQuote={handleQuote}
                />
              ))}
            </div>
          </main>
          {showOrderPanel && (
            <>
              <ResizeHandle
                axis="vertical"
                label="Resize order panel"
                onPointerDown={(event) => beginResize('order', event)}
              />
              <OrderPanel symbol={activeSymbol} quote={activeQuote} onClose={() => setShowOrderPanel(false)} />
            </>
          )}
          {showPositionsPanel && (
            <>
              <ResizeHandle
                axis="horizontal"
                label="Resize positions panel"
                onPointerDown={(event) => beginResize('bottom', event)}
              />
              <PositionsPanel quote={activeQuote} onClose={() => setShowPositionsPanel(false)} />
            </>
          )}
        </div>
        {pointerDrag?.active && (
          <div
            className="fixed top-0 left-0 z-[99999] pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium,#94a3b8)] shadow-lg text-xs font-bold text-[var(--text-primary)]"
            style={{
              transform: `translate(${pointerDrag.x + 12}px, ${pointerDrag.y + 12}px)`,
            }}
          >
            <SymbolWithIcon symbol={pointerDrag.label} size="md" showLabel={false} />
            <span>{pointerDrag.label}</span>
          </div>
        )}
        <TerminalSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          showWatchlist={showWatchlist}
          setShowWatchlist={setShowWatchlist}
          showOrderPanel={showOrderPanel}
          setShowOrderPanel={setShowOrderPanel}
          showPositionsPanel={showPositionsPanel}
          setShowPositionsPanel={setShowPositionsPanel}
          onResetLayout={resetSizes}
        />
        <PriceAlertsDrawer
          isOpen={showAlertsDrawer}
          onClose={() => setShowAlertsDrawer(false)}
          alerts={alerts}
          symbols={symbols}
          activeSymbol={activeSymbol}
          activeQuote={activeQuote}
          onAddAlert={handleAddAlert}
          onDeleteAlert={handleDeleteAlert}
          onClearTriggered={handleClearTriggeredAlerts}
          formatPrice={(price, sym) => formatTradePrice(price, readInstrumentDigits(instrumentDigitsBySymbol, sym || activeSymbol))}
        />
      </div>
    </MainContentWrapper>
  );
}

export default MarketTerminal;