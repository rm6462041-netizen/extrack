import React, { useMemo } from 'react';
import InfoTooltip from '../Common/InfoTooltip/InfoTooltip';
import { getTradeDisplayDate, getTradeDisplayTime } from '../../utils/trading/tradeTime';
import { Card, CardHeader, CardTitle } from '@/components/Common/base';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function buildHeatmap(trades = []) {
  const fallbackColumns = 11;
  const cells = Array.from({ length: WEEKDAY_LABELS.length }, () =>
    Array.from({ length: fallbackColumns }, () => 0)
  );

  if (!Array.isArray(trades) || trades.length === 0) {
    return { cells, monthMarkers: [], columns: fallbackColumns };
  }

  const sortedTrades = [...trades]
    .filter((trade) => getTradeDisplayDate(trade))
    .sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right));

  if (sortedTrades.length === 0) {
    return { cells, monthMarkers: [], columns: fallbackColumns };
  }

  const firstTradeDate = getTradeDisplayDate(sortedTrades[0]);
  const startMonday = new Date(firstTradeDate);
  const firstDay = startMonday.getDay();
  const offset = firstDay === 0 ? -6 : 1 - firstDay;
  startMonday.setDate(startMonday.getDate() + offset);
  startMonday.setHours(0, 0, 0, 0);

  const lastTradeDate = getTradeDisplayDate(sortedTrades[sortedTrades.length - 1]);
  const endSunday = new Date(lastTradeDate);
  const endDay = endSunday.getDay();
  const endOffset = endDay === 0 ? 0 : 7 - endDay;
  endSunday.setDate(endSunday.getDate() + endOffset);
  endSunday.setHours(23, 59, 59, 999);

  const columns = Math.max(1, Math.min(20, Math.ceil((endSunday - startMonday + 1) / 604800000)));
  const dynamicCells = Array.from({ length: WEEKDAY_LABELS.length }, () =>
    Array.from({ length: columns }, () => 0)
  );

  const monthMarkers = [];
  let lastMarker = '';

  for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + columnIndex * 7);
    const monthLabel = weekStart.toLocaleString('en-US', { month: 'short' });

    if (monthLabel !== lastMarker) {
      monthMarkers.push({
        label: monthLabel,
        column: columnIndex,
      });
      lastMarker = monthLabel;
    }
  }

  sortedTrades.forEach((trade) => {
    const timestamp = getTradeDisplayDate(trade);
    if (!timestamp) return;

    const diffDays = Math.floor((timestamp - startMonday) / 86400000);
    if (diffDays < 0) return;

    const column = Math.floor(diffDays / 7);
    if (column < 0 || column >= columns) return;

    const jsDay = timestamp.getDay();
    const row = jsDay === 0 ? 6 : jsDay - 1;
    dynamicCells[row][column] += Math.abs(Number(trade.pnl) || 0) > 0 ? 1 : 0.6;
  });

  return { cells: dynamicCells, monthMarkers, columns };
}

function ProgressTracker({ trades, className = '' }) {
  const { cells: heatmap, monthMarkers, columns } = useMemo(() => buildHeatmap(trades), [trades]);
  const hasTrades = Array.isArray(trades) && trades.some((trade) => getTradeDisplayDate(trade));

  return (
    <Card className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${className}`.trim()} padding="sm">
      <CardHeader className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-[var(--divider-strong)] min-h-[var(--title-card-row-height)] flex-nowrap shrink-0">
        <div className="inline-flex items-center gap-2 min-h-[var(--title-card-row-height)] flex-nowrap min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Progress Tracker</CardTitle>
          <InfoTooltip
            text="Shows how consistently you traded across recent weeks."
            size={13}
            side="bottom-left"
          />
        </div>
      </CardHeader>

      <div className="flex flex-col gap-2.5 flex-1 min-h-0">
        {!hasTrades ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)]">
            <strong className="text-[var(--heading)] font-semibold mb-1">No trades yet</strong>
            <span className="text-xs">Trading activity will appear here once trades match the current filter.</span>
          </div>
        ) : (
          <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 flex-1 min-h-0 min-w-0">
            <div className="grid grid-rows-[18px_repeat(7,1fr)] items-center min-w-0 text-[var(--text-secondary)] text-fluid-sm font-semibold">
              <span aria-hidden="true" />
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
              <div className="flex flex-col w-full h-full min-w-0">
                <div className="relative flex-none h-[18px] min-w-0">
                  {monthMarkers.map((marker) => (
                    <span
                      key={`${marker.label}-${marker.column}`}
                      className="absolute top-0 text-[var(--text-secondary)] text-fluid-md font-medium"
                      style={{ left: `${(marker.column / Math.max(columns, 1)) * 100}%` }}
                    >
                      {marker.label}
                    </span>
                  ))}
                </div>
                <div
                  className="grid grid-rows-7 gap-1 h-full min-h-0 min-w-0"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {heatmap.map((row, rowIndex) =>
                    row.map((value, columnIndex) => {
                      let cellColor = 'bg-[var(--bg-card)] border border-[var(--divider-strong)]';
                      if (value >= 3) {
                        cellColor = 'bg-blue-700 dark:bg-blue-500 border border-blue-600';
                      } else if (value >= 2) {
                        cellColor = 'bg-blue-500 dark:bg-blue-600 border border-blue-400';
                      } else if (value >= 1) {
                        cellColor = 'bg-blue-300 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-800';
                      } else if (value > 0) {
                        cellColor = 'bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900';
                      }

                      return (
                        <div
                          key={`${rowIndex}-${columnIndex}`}
                          className={`rounded-[3px] ${cellColor}`}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProgressTracker;
