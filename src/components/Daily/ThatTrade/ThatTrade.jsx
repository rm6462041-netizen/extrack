import React, { useState, useMemo, useCallback } from "react";

import { Chart } from "@/components/Markets";
import PerformanceChart from "../../MainContent/PerformanceChart";
import SymbolWithIcon from "../../Common/SymbolWithIcon/SymbolWithIcon";
import MainContentWrapper from "../../Layout/MainContentWrapper";
import PageHeader from "../../Layout/PageHeader";
import { Card, RichTextNotes } from "@/components/Common/base";

import { getTradeCloseDate } from "@/utils/trading/tradeTime";
import { formatTradeDateTime, getBinanceSymbol } from "./utils/tradeFormatters";
import { useTradeData } from "./hooks/useTradeData";
import { useTradeDraftSync } from "./hooks/useTradeDraftSync";
import { useTradeCalculations } from "./hooks/useTradeCalculations";

import TradeBasicsCard from "./components/TradeBasics/TradeBasicsCard";
import TradeStrategySection from "./components/TradeStrategy/TradeStrategySection";
import TradeAttachmentsSection from "./components/TradeAttachments/TradeAttachmentsSection";
import TradeReviewPanel from "./components/TradeReviewPanel/TradeReviewPanel";
import TradeAiReviewCard from "./components/TradeAiReview/TradeAiReviewCard";

function ThatTrade({ trades = [] }) {
  const { trade, setFetchedTrade, isLoading, targetId, goBack } = useTradeData({ trades });

  const [chartCandles, setChartCandles] = useState([]);
  const [replayCandle, setReplayCandle] = useState(null);

  // Draft Sync Hook
  const { saveLocalDraft } = useTradeDraftSync({ targetId });

  // Calculations Hook
  const {
    chartMarket,
    chartTrades,
    runningPnlTrades,
    displayedPnl,
    pnlCurrency,
    isProfit,
    durationMinutes,
    marketDetailRows,
    isOptionTrade,
    iconSymbol,
    qualityScore,
    resultRating,
    executionScore,
    reviewMetrics,
  } = useTradeCalculations({
    trade,
    chartCandles,
    replayCandle,
  });

  // Break potential candle feedback loop: only set state if candle data actually changed
  const handleCandleData = useCallback((candles) => {
    setChartCandles((prev) => {
      if (prev === candles) return prev;
      if (Array.isArray(prev) && Array.isArray(candles)) {
        if (
          prev.length === candles.length &&
          prev[0]?.time === candles[0]?.time &&
          prev[prev.length - 1]?.time === candles[candles.length - 1]?.time
        ) {
          return prev;
        }
      }
      return candles;
    });
  }, []);

  const handleReplayChange = useCallback(({ active, candle }) => {
    setReplayCandle(active ? candle : null);
  }, []);

  const tradeDateTime = useMemo(
    () => formatTradeDateTime(trade),
    [trade?.entry_timestamp, trade?.exit_timestamp]
  );
  const { date, time, dateObj } = tradeDateTime;

  const closeDateObj = useMemo(
    () => getTradeCloseDate(trade),
    [trade?.exit_timestamp]
  );

  if (isLoading && !trade) {
    return (
      <MainContentWrapper>
        <PageHeader title="Trade Detail" onBack={goBack} />
        <div className="py-15 px-5 text-center text-[var(--text-secondary)]">Loading trade details...</div>
      </MainContentWrapper>
    );
  }

  if (!trade) {
    return (
      <MainContentWrapper>
        <PageHeader title="Trade Detail" onBack={goBack} />
        <div className="py-15 px-5 text-center text-[var(--text-secondary)]">Trade not found.</div>
      </MainContentWrapper>
    );
  }

  return (
    <MainContentWrapper>
      <PageHeader
        title="Trade Detail"
        onBack={goBack}
        actions={(
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <SymbolWithIcon symbol={iconSymbol} size="md" showLabel={false} preferAssetIcon={isOptionTrade} />
            <span>{trade.symbol}</span>
            <span>{date}</span>
          </div>
        )}
      />

      {/* Top 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)_380px] gap-3 mt-3 h-auto lg:h-[calc(100dvh-var(--app-shell-header-height)-28px)] max-h-none lg:max-h-[calc(100dvh-var(--app-shell-header-height)-28px)] min-h-0 items-stretch bg-transparent">
        {/* Left Column: Stats & Basics */}
        <Card variant="default" padding="sm" className="overflow-x-hidden overflow-y-auto h-full shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:h-auto max-lg:overflow-visible">
          <div className="mb-3">
            <h3 className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)] m-0 mb-3">
              <div className="flex items-center gap-1.5">
                <SymbolWithIcon symbol={iconSymbol} size="lg" showLabel={false} preferAssetIcon={isOptionTrade} />
                <span>{trade.symbol}</span>
              </div>
              <span className="text-[var(--text-secondary)] font-normal text-xs"> · {date}</span>
            </h3>
          </div>

          <TradeBasicsCard
            trade={trade}
            displayedPnl={displayedPnl}
            pnlCurrency={pnlCurrency}
            isProfit={isProfit}
            time={time}
            date={date}
            closeDateObj={closeDateObj}
            durationMinutes={durationMinutes}
            marketDetailRows={marketDetailRows}
            onTradeUpdated={setFetchedTrade}
          />

          <TradeStrategySection
            trade={trade}
            onSaveDraft={saveLocalDraft}
          />

          <TradeAttachmentsSection
            trade={trade}
          />
        </Card>

        {/* Center Column: Interactive Chart */}
        <Card variant="default" padding="none" className="flex flex-col min-h-[380px] h-[520px] lg:h-full w-full min-w-0 overflow-hidden shadow-sm">
          <Chart
            symbol={trade.productType === "option" ? trade.symbol : getBinanceSymbol(trade.symbol)}
            live={false}
            priceDigits={trade.instrument_digits}
            anchorTime={dateObj ? Math.floor(dateObj.getTime() / 1000) : undefined}
            trades={chartTrades}
            onCandleData={handleCandleData}
            onReplayChange={handleReplayChange}
          />
        </Card>

        {/* Right Column: Performance & Quality Reviews */}
        <TradeReviewPanel
          trade={trade}
          reviewMetrics={reviewMetrics}
          qualityScore={qualityScore}
          resultRating={resultRating}
          executionScore={executionScore}
          onSaveDraft={saveLocalDraft}
        />
      </div>

      {/* Bottom Layout: Running P&L Dashboard + Notes + AI Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 pb-6">
        <div className="lg:col-span-4 min-h-[300px] h-[300px] max-lg:h-auto">
          <PerformanceChart trades={runningPnlTrades} currencyCode="USD" title="Running P&L" groupBy="trade" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-8 gap-5 h-auto lg:h-[300px]">
          <RichTextNotes uniqueId={trade.unique_id} selectedDate={tradeDateTime.isoDate} />

          <TradeAiReviewCard
            trade={trade}
            pnlCurrency={pnlCurrency}
            onSaveDraft={saveLocalDraft}
          />
        </div>
      </div>
    </MainContentWrapper>
  );
}

export default ThatTrade;
