import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Camera,
  ChartCandlestick,
  ChartLine,
  ChevronDown,
  CloudUpload,
  Maximize2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
} from '../../../icons/lucideIcons';
import { formatTradePrice } from '../../../utils/trading/tradeCalculations';
import { useInstruments, useDebouncedValue } from '../../../hooks/useInstruments';
import { DropdownSelect as CustomSelect } from "@/components/Common/base/dropdown/dropdown";

const formatPrice = (value, digits) => formatTradePrice(value, digits);

export function LayoutIcon({ layout = '1', size = 16, className = '' }) {
  const s = size;
  switch (layout) {
    case '2v':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="9" y1="1" x2="9" y2="17" />
        </svg>
      );
    case '2h':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="1" y1="9" x2="17" y2="9" />
        </svg>
      );
    case '3v':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="6.3" y1="1" x2="6.3" y2="17" />
          <line x1="11.7" y1="1" x2="11.7" y2="17" />
        </svg>
      );
    case '3h':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="1" y1="6.3" x2="17" y2="6.3" />
          <line x1="1" y1="11.7" x2="17" y2="11.7" />
        </svg>
      );
    case '3':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="1" y1="9" x2="17" y2="9" />
          <line x1="9" y1="9" x2="9" y2="17" />
        </svg>
      );
    case '4':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="1" y1="9" x2="17" y2="9" />
          <line x1="9" y1="9" x2="9" y2="17" />
        </svg>
      );
    case '5':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="1" y1="9" x2="17" y2="9" />
          <line x1="6.3" y1="1" x2="6.3" y2="17" />
          <line x1="11.7" y1="1" x2="11.7" y2="9" />
        </svg>
      );
    case '6':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
          <line x1="1" y1="9" x2="17" y2="9" />
          <line x1="6.3" y1="1" x2="6.3" y2="17" />
          <line x1="11.7" y1="1" x2="11.7" y2="17" />
        </svg>
      );
    case '1':
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
          <rect x="1" y="1" width="16" height="16" rx="2" />
        </svg>
      );
  }
}

export const DEFAULT_LAYOUTS = [
  { value: '1', label: '1 Chart' },
  { value: '2v', label: '2 Vertical' },
  { value: '2h', label: '2 Horizontal' },
  { value: '3v', label: '3 Vertical' },
  { value: '3h', label: '3 Horizontal' },
  { value: '3', label: '3 Grid' },
  { value: '4', label: '4 Grid' },
  { value: '5', label: '5 Grid' },
  { value: '6', label: '6 Grid' },
];

export function ChartLayoutPicker({ layout = '1', layouts = DEFAULT_LAYOUTS, onLayoutChange, buttonClassName = 'market-icon-button' }) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutDropdownRef = React.useRef(null);

  useEffect(() => {
    if (!layoutOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target)) {
        setLayoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [layoutOpen]);

  return (
    <div className="relative inline-block" ref={layoutDropdownRef}>
      <button
        className={`${buttonClassName}${layoutOpen ? ' is-active' : ''}`}
        type="button"
        title="Select chart layout"
        onClick={() => setLayoutOpen((prev) => !prev)}
      >
        <LayoutIcon layout={layout} size={15} />
      </button>

      {layoutOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] bg-[var(--bg-card,#ffffff)] border border-[var(--border-light,#e2e8f0)] rounded-md shadow-lg p-2 flex flex-col gap-1.5 min-w-[140px]">
          <div className="text-xs font-semibold text-[var(--text-secondary,#64748b)] px-1">Select Layout</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(layouts || DEFAULT_LAYOUTS).map((item) => (
              <button
                key={item.value}
                type="button"
                className={`flex flex-col items-center justify-center p-1.5 rounded text-[10px] text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border ${
                  item.value === layout
                    ? 'border-[var(--primary,#2563eb)] bg-[var(--bg-secondary,#f1f5f9)] text-[var(--primary,#2563eb)] font-semibold'
                    : 'border-transparent'
                }`}
                onClick={() => {
                  onLayoutChange?.(item.value);
                  setLayoutOpen(false);
                }}
                title={item.label}
              >
                <LayoutIcon layout={item.value} size={20} />
                <span>{item.label || item.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TradingChartHeader({
  title,
  timeframe,
  timeframes,
  onTimeframeChange,
  candle,
  quote,
  priceDigits = 4,
  status = 'Autosaved',
  replayActive = false,
  replayDisabled = true,
  onReplay,
  onFullscreen,
  onToggleFullscreen,
  onSnapshot,
  isFullscreen = false,
  onSymbolSearch,
  activeSymbol,
  availableSymbols = [],
  onSelectSymbol,
  layout = '1',
  layouts = DEFAULT_LAYOUTS,
  onLayoutChange,
}) {
  const digits = Number.isInteger(Number(priceDigits)) ? Math.min(Math.max(Number(priceDigits), 0), 8) : 4;

  const symbolTitle = title || activeSymbol || 'EURUSD';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutOpen, setLayoutOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  const layoutDropdownRef = React.useRef(null);

  useEffect(() => {
    if (!searchOpen && !layoutOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target)) {
        setLayoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [searchOpen, layoutOpen]);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const isServerSearch = debouncedSearchQuery.trim().length > 0;
  const { data: serverResults = [] } = useInstruments(debouncedSearchQuery, { limit: 50 });

  const filteredSymbols = React.useMemo(() => {
    if (!isServerSearch) {
      return (availableSymbols || []).slice(0, 50);
    }
    if (serverResults.length > 0) return serverResults.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return (availableSymbols || []).filter((item) => {
      const sym = typeof item === 'string' ? item : (item?.symbol || item?.name || item?.requestSymbol || '');
      return sym.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [availableSymbols, isServerSearch, searchQuery, serverResults]);

  const openPrice = Number(candle?.open ?? quote?.open ?? quote?.last ?? 0);
  const highPrice = Number(candle?.high ?? quote?.high ?? quote?.last ?? 0);
  const lowPrice = Number(candle?.low ?? quote?.low ?? quote?.last ?? 0);
  const closePrice = Number(candle?.close ?? quote?.last ?? quote?.bid ?? 0);
  const changeVal = closePrice && openPrice ? closePrice - openPrice : 0;
  const changePct = openPrice ? (changeVal / openPrice) * 100 : 0;
  const isPositive = changeVal >= 0;

  return (
    <div className="flex flex-col p-0 shrink-0 border-b border-[var(--border-light,#e2e8f0)] bg-[var(--bg-card,#ffffff)] relative z-50 overflow-visible">
      <div className="flex justify-between items-center min-h-[38px] gap-2 px-2.5 py-1 relative z-50 overflow-visible">
        <div className="flex items-center gap-1 flex-nowrap relative z-50">
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-transparent hover:bg-[var(--bg-secondary,#f8fafc)] border border-transparent hover:border-[var(--border-light,#e2e8f0)] text-[var(--text-primary,#0f172a)] cursor-pointer text-[13px] transition-colors"
              type="button"
              onClick={() => {
                if (onSymbolSearch) {
                  onSymbolSearch();
                } else {
                  setSearchOpen((prev) => !prev);
                }
              }}
              title="Symbol Search"
            >
              <Search size={14} />
              <strong className="text-[14px] font-bold text-[var(--text-primary,#0f172a)] m-0 tracking-[0.2px]">{symbolTitle}</strong>
            </button>

            {searchOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] w-[220px] bg-[var(--bg-card,#ffffff)] border border-[var(--border-light,#e2e8f0)] rounded-md shadow-lg p-1.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary,#f8fafc)] border border-[var(--border-light,#e2e8f0)] rounded">
                  <Search size={13} />
                  <input
                    type="text"
                    className="border-none outline-none bg-transparent w-full text-xs text-[var(--text-primary,#1e293b)]"
                    placeholder="Search symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5">
                  {filteredSymbols.length > 0 ? (
                    filteredSymbols.map((item) => {
                      const sym = typeof item === 'string' ? item : (item?.symbol || item?.name || item?.requestSymbol || '');
                      return (
                        <button
                          key={sym}
                          type="button"
                          className={`flex items-center px-2 py-1.5 rounded text-xs text-left cursor-pointer transition-colors text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] ${
                            sym === symbolTitle ? 'bg-[var(--bg-secondary,#e2e8f0)] font-semibold' : ''
                          }`}
                          onClick={() => {
                            onSelectSymbol?.(sym);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <span>{sym}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div style={{ padding: '8px', fontSize: '12px', color: '#64748b' }}>No symbols found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            title="Compare or Add Symbol"
          >
            <Plus size={15} />
          </button>

          <span className="w-[1px] h-[18px] bg-[var(--border-light,#e2e8f0)] mx-1 shrink-0" />

          <CustomSelect
            className="text-xs"
            value={timeframe}
            ariaLabel="Chart timeframe"
            options={timeframes}
            onChange={(event) => onTimeframeChange(event.target.value)}
          />

          <span className="w-[1px] h-[18px] bg-[var(--border-light,#e2e8f0)] mx-1 shrink-0" />

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            title="Chart type (Candles)"
          >
            <ChartCandlestick size={15} />
          </button>

          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border border-[var(--border-light,#e2e8f0)] bg-transparent"
            type="button"
            disabled
            title="Indicators are coming soon"
          >
            <ChartLine size={14} />
            <span>Indicators</span>
          </button>

          <span className="w-[1px] h-[18px] bg-[var(--border-light,#e2e8f0)] mx-1 shrink-0" />

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            disabled
            title="Undo"
          >
            <RotateCcw size={14} />
          </button>

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            disabled
            title="Redo"
          >
            <RotateCw size={14} />
          </button>

          {onReplay && (
            <button
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border ${
                replayActive
                  ? 'bg-[var(--primary,#2563eb)] text-white hover:bg-[var(--primary-dark,#1d4ed8)] border-transparent'
                  : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] border-[var(--border-light,#e2e8f0)] bg-transparent'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              type="button"
              onClick={onReplay}
              disabled={replayDisabled}
              title="Replay"
            >
              <Play size={14} /> {replayActive ? 'Exit replay' : 'Replay'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-nowrap relative z-50">
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border border-[var(--border-medium,#cbd5e1)] bg-transparent"
            type="button"
            title={`Status: ${status}`}
          >
            <CloudUpload size={14} />
            <span>Save</span>
            <ChevronDown size={11} />
          </button>

          <span className="w-[1px] h-[18px] bg-[var(--border-light,#e2e8f0)] mx-1 shrink-0" />

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            title="Chart settings"
          >
            <Settings size={14} />
          </button>

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            onClick={onFullscreen || onToggleFullscreen}
            disabled={!onFullscreen && !onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Maximize2 size={14} />
          </button>

          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent"
            type="button"
            onClick={onSnapshot}
            disabled={!onSnapshot}
            title="Save chart image"
          >
            <Camera size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-2.5 py-1 text-xs text-[var(--text-secondary,#64748b)] border-b border-[var(--border-light,#e2e8f0)]/50 bg-[var(--bg-card,#ffffff)] overflow-x-auto select-none">
        <strong className="font-semibold text-[var(--text-primary,#0f172a)]">{symbolTitle} · {timeframe} · Cboe One</strong>
        <span className="inline-block text-[10px] px-1 py-0.5 rounded bg-[var(--bg-secondary,#f1f5f9)] text-[var(--text-secondary,#64748b)] font-medium">D</span>
        <span>O <b className="font-semibold text-[var(--text-primary,#0f172a)]">{openPrice ? formatPrice(openPrice, digits) : '--'}</b></span>
        <span>H <b className="font-semibold text-[var(--text-primary,#0f172a)]">{highPrice ? formatPrice(highPrice, digits) : '--'}</b></span>
        <span>L <b className="font-semibold text-[var(--text-primary,#0f172a)]">{lowPrice ? formatPrice(lowPrice, digits) : '--'}</b></span>
        <span>C <b className="font-semibold text-[var(--text-primary,#0f172a)]">{closePrice ? formatPrice(closePrice, digits) : '--'}</b></span>
        {closePrice && openPrice ? (
          <span className={`font-medium ${isPositive ? 'text-[var(--pnl-positive,#16a34a)]' : 'text-[var(--loss-color,#b91c1c)]'}`}>
            {isPositive ? '+' : ''}{changeVal.toFixed(digits)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
          </span>
        ) : null}
        {candle?.volume ? (
          <span className="text-[var(--text-secondary,#64748b)] ml-auto text-[11px]">Volume <b>{Number(candle.volume).toLocaleString()}</b></span>
        ) : null}
      </div>
    </div>
  );
}

export function TradingChartFooter({
  timeframe,
  timeframes,
  onTimeframeChange,
  onFit,
  onGoToTrade,
  chartApi,
  onCalendarClick,
  onSettingsClick,
}) {
  const [clock, setClock] = useState(() => new Date());
  const [isPercent, setIsPercent] = useState(false);
  const [isLog, setIsLog] = useState(false);
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const getTimeString = () => {
    const timeStr = clock.toLocaleTimeString([], { hour12: false });
    const offsetMin = -clock.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    const tzStr = mins === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${mins < 10 ? '0' : ''}${mins}`;
    return `${timeStr} (${tzStr})`;
  };

  const rangePresets = ['5y', '1y', '3m', '1m', '5d', '1d'];

  const handlePercentToggle = () => {
    const next = !isPercent;
    setIsPercent(next);
    if (next) setIsLog(false);
    if (chartApi) {
      try {
        chartApi.priceScale('right')?.applyOptions({ mode: next ? 2 : 0 });
      } catch (e) {
        /* ignore */
      }
    }
  };

  const handleLogToggle = () => {
    const next = !isLog;
    setIsLog(next);
    if (next) setIsPercent(false);
    if (chartApi) {
      try {
        chartApi.priceScale('right')?.applyOptions({ mode: next ? 1 : 0 });
      } catch (e) {
        /* ignore */
      }
    }
  };

  const handleAutoToggle = () => {
    const next = !isAuto;
    setIsAuto(next);
    if (chartApi) {
      try {
        chartApi.priceScale('right')?.applyOptions({ autoScale: next });
      } catch (e) {
        /* ignore */
      }
    }
  };

  return (
    <div className="flex justify-between items-center min-h-[30px] px-2 py-0.5 border-t border-[var(--border-light,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-xs text-[var(--text-secondary,#64748b)] select-none">
      <div className="flex items-center gap-1">
        {rangePresets.map((item) => (
          <button
            key={item}
            type="button"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
              timeframe === item
                ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold'
                : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
            }`}
            onClick={() => onTimeframeChange?.(item)}
            title={`Range: ${item}`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
          onClick={onCalendarClick}
          title="Go to date"
        >
          <Calendar size={13} />
        </button>
        {(onFit || onGoToTrade) && <span className="w-[1px] h-[14px] bg-[var(--border-light,#e2e8f0)] mx-1 shrink-0" />}
        {onFit && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            onClick={onFit}
            title="Fit content"
          >
            <RefreshCw size={12} /> Fit
          </button>
        )}
        {onGoToTrade && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            onClick={onGoToTrade}
            title="Go to trade"
          >
            Go to trade
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[var(--text-secondary,#64748b)] px-1.5" title="Time & Timezone">
          {getTimeString()}
        </span>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
            isPercent
              ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold'
              : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
          }`}
          onClick={handlePercentToggle}
          title="Toggle percent scale mode"
        >
          %
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
            isLog
              ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold'
              : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
          }`}
          onClick={handleLogToggle}
          title="Toggle logarithmic scale mode"
        >
          log
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border-0 ${
            isAuto
              ? 'bg-[var(--bg-secondary,#e2e8f0)] text-[var(--text-primary,#0f172a)] font-bold'
              : 'text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] bg-transparent'
          }`}
          onClick={handleAutoToggle}
          title="Toggle auto scale"
        >
          auto
        </button>
        {onSettingsClick && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary,#64748b)] hover:text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-secondary,#f1f5f9)] cursor-pointer transition-colors border-0 bg-transparent"
            onClick={onSettingsClick}
            title="Chart settings"
          >
            <Settings size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
