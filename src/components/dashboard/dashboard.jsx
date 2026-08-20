import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header/Header';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import StatsCards from '@/components/StatsCards/StatsCards';
import TradesList from '@/components/MainContent/TradesList';
import ProgressTracker from '@/components/MainContent/ProgressTracker';
import { markPerf, measurePerf } from '@/utils/common/perfMarks';
import { loadCachedUserSettings } from '../../utils/user/userSettings';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Card } from '@/components/Common/base';

const ActivityChart = lazy(() => import('@/components/MainContent/ActivityChart'));
const Radar = lazy(() => import('@/components/MainContent/Radar'));
const PerformanceChart = lazy(() => import('@/components/MainContent/PerformanceChart'));
const PnLCalendar = lazy(() => import('@/components/MainContent/PnLCalendar'));


// Global tracker to persist loaded state across page switches
const LOADED_SECTIONS = new Set();
const DEFAULT_DASHBOARD_LAYOUT = {
  rowOrder: 'overview-first',
  columnOrder: 'normal',
};

const getCachedDashboardLayout = () => {
  const cachedLayout = loadCachedUserSettings()?.dashboard || {};

  return {
    rowOrder: cachedLayout.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
    columnOrder: cachedLayout.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
  };
};

const getDateScopePart = (value) => {
  if (!value) return 'all';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'all' : date.toISOString().slice(0, 10);
};

function LazyDashboardSection({ children, sectionKey, fallback, perfName, delay = 100 }) {
  const sectionRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(LOADED_SECTIONS.has(sectionKey));

  useEffect(() => {
    if (shouldRender) return undefined;

    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      const frameId = window.requestAnimationFrame(() => {
        setShouldRender(true);
        if (sectionKey) LOADED_SECTIONS.add(sectionKey);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => {
            setShouldRender(true);
            if (sectionKey) LOADED_SECTIONS.add(sectionKey);
          }, delay);
          observer.disconnect();
          return () => clearTimeout(timer);
        }
      },
      { 
        rootMargin: '100px 0px 100px 0px', 
        threshold: 0.01 
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [shouldRender, delay, sectionKey]);

  useEffect(() => {
    if (!shouldRender || !perfName) return;

    markPerf(perfName);
    if (perfName === 'charts-ready') {
      measurePerf('charts-from-start', 'app-start', 'charts-ready');
    }
  }, [perfName, shouldRender]);

  return <div className="w-full h-full min-w-0" ref={sectionRef}>{shouldRender ? children : fallback}</div>;
}

const SkeletonChartCard = () => (
  <Card className="w-full h-full min-h-[340px] sm:min-h-[360px] lg:min-h-0 flex flex-col p-4 animate-pulse" padding="none">
    <div className="w-36 h-5 rounded-lg bg-[var(--surface-subtle)] mb-5" />
    <div className="flex-1 rounded-xl bg-[var(--surface-subtle)]" />
  </Card>
);

const SkeletonTradesList = () => (
  <Card className="w-full h-full min-h-[380px] sm:min-h-[420px] lg:min-h-0 flex flex-col p-4 animate-pulse" padding="none">
    <div className="w-28 h-5 rounded-lg bg-[var(--surface-subtle)] mb-4" />
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="w-full h-3.5 rounded bg-[var(--surface-subtle)] mb-2.5"
      />
    ))}
  </Card>
);

const SkeletonPnLCalendar = () => (
  <Card className="w-full h-full min-h-[420px] lg:h-[590px] flex flex-col p-4 animate-pulse" padding="none">
    <div className="w-32 h-5 rounded-lg bg-[var(--surface-subtle)] mb-5" />
    <div className="grid grid-cols-7 gap-2 flex-1">
      {[...Array(35)].map((_, i) => (
        <div key={i} className="rounded-lg bg-[var(--surface-subtle)]" />
      ))}
    </div>
  </Card>
);

function Dashboard({
  tradeMode,
  setTradeMode,
  trades,
  dateRange,
  setDateRange,
  currencyCode = 'USD',
  defaultCurrencyCode = 'USD',
  onCurrencyChange,
  isLoading = false,
  openPositions = [],
}) {
  const [layout, setLayout] = useState(getCachedDashboardLayout);
  const userSettingsQuery = useUserSettings();
  const layoutChangeVersion = useRef(0);

  useEffect(() => {
    const handleLayoutChange = (event) => {
      layoutChangeVersion.current += 1;
      const eventLayout = event.detail?.layout;

      if (eventLayout) {
        setLayout({
          rowOrder: eventLayout.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
          columnOrder: eventLayout.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
        });
        return;
      }

      setLayout(getCachedDashboardLayout());
    };

    window.addEventListener('dashboard-layout-change', handleLayoutChange);
    return () => {
      window.removeEventListener('dashboard-layout-change', handleLayoutChange);
    };
  }, []);

  useEffect(() => {
    if (!userSettingsQuery.data || layoutChangeVersion.current > 0) return;

    setLayout({
      rowOrder: userSettingsQuery.data?.dashboard?.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
      columnOrder: userSettingsQuery.data?.dashboard?.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
    });
  }, [userSettingsQuery.data]);

  useEffect(() => {
    markPerf('dashboard-shell-visible');
    measurePerf('dashboard-shell-from-start', 'app-start', 'dashboard-shell-visible');
  }, []);

  useEffect(() => {
    if (isLoading) return;

    markPerf('dashboard-visible');
    measurePerf('dashboard-visible-from-start', 'app-start', 'dashboard-visible');
  }, [isLoading]);

  const statsScopeKey = useMemo(() => {
    const from = getDateScopePart(dateRange?.from);
    const to = getDateScopePart(dateRange?.to);
    return `dashboard:${tradeMode}:${currencyCode}:${from}:${to}`;
  }, [currencyCode, dateRange?.from, dateRange?.to, tradeMode]);

  const isChartsFirst = layout.rowOrder === 'charts-first';
  const isFlipped = layout.columnOrder === 'flipped';

  const OverviewSection = useMemo(() => (
    <section className={`grid grid-cols-1 lg:grid-cols-3 gap-2.5 w-full items-stretch lg:h-[590px] ${isChartsFirst ? 'order-2' : 'order-1'}`}>
      {/* 1st Column: Progress Tracker & Trades List */}
      <div className={`col-span-1 flex flex-col gap-2.5 min-w-0 min-h-0 lg:h-[590px] ${isFlipped ? 'lg:order-2' : 'lg:order-1'}`}>
        <div className="min-w-0 min-h-0 h-[340px] sm:h-[360px] lg:h-[288px] shrink-0">
          {isLoading ? (
            <SkeletonChartCard />
          ) : (
            <ProgressTracker trades={trades} />
          )}
        </div>

        <section className="min-w-0 min-h-0 h-[380px] sm:h-[420px] lg:h-[292px] shrink-0 flex">
          {isLoading ? (
            <SkeletonTradesList />
          ) : (
            <LazyDashboardSection sectionKey="trades-list" fallback={<SkeletonTradesList />} delay={0}>
              <TradesList
                trades={trades}
                openPositions={tradeMode === 'manual' ? [] : openPositions}
                currentTradeMode={tradeMode}
                currencyCode={currencyCode}
              />
            </LazyDashboardSection>
          )}
        </section>
      </div>

      {/* 2nd & 3rd Columns: PnL Calendar */}
      <div className={`col-span-1 lg:col-span-2 min-w-0 min-h-0 h-full lg:h-[590px] flex flex-col ${isFlipped ? 'lg:order-1' : 'lg:order-2'}`}>
        {isLoading ? (
          <SkeletonPnLCalendar />
        ) : (
          <LazyDashboardSection sectionKey="pnl-calendar" fallback={<SkeletonPnLCalendar />} delay={0}>
            <Suspense fallback={<SkeletonPnLCalendar />}>
              <PnLCalendar trades={trades} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>
    </section>
  ), [currencyCode, isChartsFirst, isFlipped, isLoading, openPositions, tradeMode, trades]);

  const ChartsSection = useMemo(() => (
    <section className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full items-stretch ${isChartsFirst ? 'order-1' : 'order-2'}`}>
      <div className={`min-w-0 h-[340px] sm:h-[360px] lg:h-[290px] ${isFlipped ? 'lg:order-3' : 'lg:order-1'}`}>
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="performance-chart" fallback={<SkeletonChartCard />} perfName="charts-ready" delay={800}>
            <Suspense fallback={<SkeletonChartCard />}>
              <PerformanceChart trades={trades} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      <div className="min-w-0 h-[340px] sm:h-[360px] lg:h-[290px] lg:order-2">
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="activity-chart" fallback={<SkeletonChartCard />} delay={1000}>
            <Suspense fallback={<SkeletonChartCard />}>
              <ActivityChart trades={trades} currencyCode={currencyCode} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>

      <div className={`min-w-0 h-[340px] sm:h-[360px] lg:h-[290px] md:col-span-2 lg:col-span-1 ${isFlipped ? 'lg:order-1' : 'lg:order-3'}`}>
        {isLoading ? (
          <SkeletonChartCard />
        ) : (
          <LazyDashboardSection sectionKey="radar-chart" fallback={<SkeletonChartCard />} delay={1200}>
            <Suspense fallback={<SkeletonChartCard />}>
              <Radar trades={trades} />
            </Suspense>
          </LazyDashboardSection>
        )}
      </div>
    </section>
  ), [currencyCode, isChartsFirst, isFlipped, isLoading, trades]);

  const MainGrid = useMemo(() => (
    <div className="flex flex-col gap-2.5 w-full">
      {OverviewSection}
      {ChartsSection}
    </div>
  ), [OverviewSection, ChartsSection]);

  return (
    <MainContentWrapper>
      <Header
        tradeMode={tradeMode}
        setTradeMode={setTradeMode}
        trades={trades}
        dateRange={dateRange}
        setDateRange={setDateRange}
        currencyCode={currencyCode}
        defaultCurrencyCode={defaultCurrencyCode}
        onCurrencyChange={onCurrencyChange}
      />

      <StatsCards
        trades={trades}
        currencyCode={currencyCode}
        isLoading={isLoading}
        statsScopeKey={statsScopeKey}
      />

      {MainGrid}

    </MainContentWrapper>
  );
}

export default React.memo(Dashboard);
