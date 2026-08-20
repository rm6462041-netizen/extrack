import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarIcon,
  ChevronDown,
  CircleUserRound,
  Clock,
  CurrencyIcon,
  EllipsisVertical,
  FilterIcon,
  Globe,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  X,
} from '@/icons';
import { useAuth } from '../../context/AuthContext';
import { useAppDialog } from '../../context/AppDialogContext';
import PageHeader from '../Layout/PageHeader';
import Logo from '../Common/Logo/Logo';
import CurrencyFilterDropdown from './CurrencyFilterDropdown';
import { DASHBOARD_CURRENCIES, getCurrencyMeta } from '../../utils/user/Currency';
import { formatDisplayDate, getTradeDisplayDate, getTradeDisplayTime } from '../../utils/trading/tradeTime';
import { getUserAvatar } from '../../utils/user/userAvatar';
import api from '../../utils/common/serve';
import { API_URL } from '../../utils/common/constants';
import { clearClientStorage } from '../../utils/storage/clientStorage';
import { loadCachedUserSettings, saveUserSettings } from '../../utils/user/userSettings';
import { BROWSER_TIME_ZONE, TIME_ZONES } from '../../utils/trading/tradeTime';
import { SubmenuTrigger, Button as AriaButton } from 'react-aria-components';
import { DropdownAccountCardXS } from '../user/DropdownAccountCard/DropdownAccountCardXS';
import { Button, Dropdown } from '../Common/base';
import SettingsModal from '../Settings/SettingsModal';
const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));
const Profile = lazy(() => import('../user/Profile/Profile'));
import { DateRangePicker as UntitledDateRangePicker } from '../application/date-picker/date-range-picker';
import { jsDateRangeToCalendarRange, calendarRangeToJsDateRange } from '../../utils/common/dateConversions';

const formatDateLabel = (value) => formatDisplayDate(value);

function Header({
  tradeMode,
  setTradeMode,
  trades = [],
  dateRange,
  setDateRange,
  currencyCode = 'USD',
  defaultCurrencyCode = 'USD',
  onCurrencyChange,
}) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [_mobileActionPanel, setMobileActionPanel] = useState(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cachedPreferences = loadCachedUserSettings()?.preferences || {};
  const [timeZone, setTimeZone] = useState(cachedPreferences.timeZone || BROWSER_TIME_ZONE);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isTablet, setIsTablet] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [_isSmallMobile, setIsSmallMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 480 : false);
  const [dashboardSyncing, setDashboardSyncing] = useState(false);
  const filterRef = useRef(null);

  const mobileActionsRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user: currentUser, setUser } = useAuth();
  const { notify } = useAppDialog();
  const googleProfilePicture = getUserAvatar(currentUser);

  const modes = [
    { value: 'all', label: 'All Trades' },
    { value: 'manual', label: 'Manual Trades' },
    { value: 'api', label: 'Sync Trades' },
  ];

  const currentLabel =
    modes.find((mode) => mode.value === tradeMode)?.label || 'All Trades';
  const _compactTradeLabel = tradeMode === 'manual' ? 'Manual' : tradeMode === 'api' ? 'Sync' : 'Trades';
  const _selectedCurrency = getCurrencyMeta(currencyCode);
  const _defaultCurrency = getCurrencyMeta(defaultCurrencyCode);
  const hasPopupOpen = filterOpen || mobileActionsOpen;
  const shouldHideHeader = isHeaderHidden && !hasPopupOpen && !profileOpen && !settingsOpen && !showLoginModal;
  const _profileName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim();
  const _profileInitials = `${currentUser?.firstName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`.trim() || 'U';

  const latestTradeDate = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return null;
    }

    const sortedTrades = [...trades].sort(
      (left, right) => getTradeDisplayTime(right) - getTradeDisplayTime(left)
    );

    return getTradeDisplayDate(sortedTrades[0]);
  }, [trades]);

  const latestTradeLabel = useMemo(() => {
    if (!latestTradeDate) {
      return 'No imports yet';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(latestTradeDate);
  }, [latestTradeDate]);

  const compactLatestTradeLabel = useMemo(() => {
    if (!latestTradeDate) {
      return 'No imports yet';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(latestTradeDate);
  }, [latestTradeDate]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${formatDateLabel(dateRange.from)} - ${formatDateLabel(dateRange.to)}`;
    }

    return 'All time';
  }, [dateRange]);

  const syncFromDashboard = async () => {
    if (dashboardSyncing) return;
    setDashboardSyncing(true);
    try {
      const { data } = await api.get('/broker-connections');
      const connections = (data?.connections || []).filter((connection) => (
        connection.brokerSlug === 'ctrader' && connection.tradeMethod === 'oauth_sync' && connection.status === 'connected'
      ));
      const requests = connections.flatMap((connection) => {
        const accountIds = connection.metadata?.authorizedAccountIds || [];
        return accountIds.map((accountId) => ({ connectionId: connection.id, accountId }));
      });
      if (!requests.length) {
        notify('No connected sync account found', 'warning');
        return;
      }
      const fromTimestamp = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : 0;
      const toTimestamp = dateRange?.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : Date.now();
      const results = await Promise.all(requests.map(async ({ connectionId, accountId }) => {
        const response = await api.post(`/broker-connections/ctrader/${connectionId}/sync`, { accountId: String(accountId), fromTimestamp, toTimestamp });
        return response.data;
      }));
      const fetched = results.reduce((total, result) => total + (Number(result.fetchedCount) || 0), 0);
      const newSaved = results.reduce((total, result) => total + (Number(result.newTradesCount) || 0), 0);
      const updated = results.reduce((total, result) => total + (Number(result.updatedTradesCount) || 0), 0);

      if (fetched === 0) {
        notify('Sync complete: No trades found', 'info');
      } else if (newSaved === 0) {
        notify(`Sync complete: No new trades found (${updated} trade${updated === 1 ? '' : 's'} up to date)`, 'info');
      } else {
        notify(`Sync complete: ${newSaved} new trade${newSaved === 1 ? '' : 's'} saved${updated > 0 ? ` (${updated} up to date)` : ''}`, 'success');
      }
      if (currentUser?.ID) await queryClient.invalidateQueries({ queryKey: ['trades', currentUser.ID] });
    } catch {
      notify('Sync failed. Please try again', 'error');
    } finally {
      setDashboardSyncing(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
      setIsSmallMobile(window.innerWidth <= 480);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }

      if (mobileActionsOpen && mobileActionsRef.current && !mobileActionsRef.current.contains(event.target)) {
        setMobileActionsOpen(false);
        setMobileActionPanel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterOpen, mobileActionsOpen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setMobileActionsOpen(false);
        setMobileActionPanel(null);
      }
    };

    if (profileOpen || mobileActionsOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileActionsOpen, profileOpen]);

  useEffect(() => {
    document.body.classList.toggle('dashboard-popup-open', hasPopupOpen);

    return () => {
      document.body.classList.remove('dashboard-popup-open');
    };
  }, [hasPopupOpen]);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    const getScrollY = () => Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, mainContent?.scrollTop || 0);

    lastScrollYRef.current = getScrollY();

    const handleScroll = () => {
      if (hasPopupOpen || profileOpen || showLoginModal) {
        setIsHeaderHidden(false);
        return;
      }

      const currentScrollY = getScrollY();
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 8) {
        setIsHeaderHidden(false);
      } else if (delta > 4) {
        setIsHeaderHidden(true);
      } else if (delta < -4) {
        setIsHeaderHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    mainContent?.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainContent?.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [hasPopupOpen, profileOpen, showLoginModal]);

  return (
    <>
      {hasPopupOpen && (
        <div
          className="fixed top-[var(--app-shell-header-height)] inset-x-0 bottom-0 z-[9000] bg-slate-900/20 backdrop-blur-[4px]"
          onClick={() => {
            setFilterOpen(false);
            setMobileActionsOpen(false);
            setMobileActionPanel(null);
          }}
        />
      )}

      <PageHeader
        title="Dashboard"
        className={`transition-transform duration-200 ease-out ${shouldHideHeader ? '-translate-y-[calc(100%+10px)] opacity-0 pointer-events-none' : ''}`}
        keepVisible={hasPopupOpen || profileOpen || settingsOpen || showLoginModal}
        left={isTablet ? (
          <div className="flex items-center gap-2">
            <Logo compact showText={false} className="shrink-0" />
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-[17px] font-bold text-[var(--heading)] truncate leading-tight">Dashboard</h1>
            </div>
          </div>
        ) : undefined}
        actions={(
          <div className="flex items-center justify-end gap-2 w-full min-w-0 overflow-visible">
            <div className="flex items-center justify-end flex-nowrap gap-1.5 min-w-0 overflow-visible">
              {!isTablet && (
                <>
                  <div className="shrink-0 relative z-[9001]">
                    <UntitledDateRangePicker
                      size="sm"
                      buttonClassName="whitespace-nowrap"
                      value={jsDateRangeToCalendarRange(dateRange)}
                      onChange={(range) => {
                        setDateRange?.(calendarRangeToJsDateRange(range));
                      }}
                      onApply={() => {}}
                    />
                  </div>

                  <div className="shrink-0 relative z-[9001]">
                    <Dropdown.Root>
                      <Button
                        color="secondary"
                        size="sm"
                        iconLeading={<FilterIcon size={15} aria-hidden="true" />}
                        iconTrailing={<ChevronDown size={15} aria-hidden="true" />}
                        className="min-h-[32px] px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap"
                        aria-label={`Trade filter: ${currentLabel}`}
                      >
                        {currentLabel}
                      </Button>

                      <Dropdown.Popover placement="bottom start" className="w-44 p-1">
                        <Dropdown.Menu
                          selectionMode="single"
                          selectedKeys={new Set([tradeMode])}
                          onAction={(key) => setTradeMode(String(key))}
                        >
                          {modes.map((mode) => (
                            <Dropdown.Item
                              key={mode.value}
                              id={mode.value}
                              label={mode.label}
                              textValue={mode.label}
                            >
                              {mode.label}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown.Root>
                  </div>

                  <div className="shrink-0">
                    <CurrencyFilterDropdown
                      currencyCode={currencyCode}
                      defaultCurrencyCode={defaultCurrencyCode}
                      onCurrencyChange={onCurrencyChange}
                    />
                  </div>

                  <div className="flex items-center gap-2 min-w-[80px] max-w-[160px] lg:max-w-[240px] flex-1 min-h-[32px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0d0d0d] border border-[var(--border-light)] dark:border-[#242424] text-[var(--text-muted)] dark:text-gray-300 shadow-xs shrink">
                    <Search size={16} aria-hidden="true" className="shrink-0" />
                    <input
                      type="text"
                      placeholder="Search"
                      aria-label="Search trades"
                      className="w-full border-none outline-none bg-transparent text-[var(--text-primary)] text-[13px] placeholder:text-[#95a3bd]"
                    />
                  </div>

                  <button
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg min-h-[32px] px-2.5 py-1.5 text-[13px] font-semibold bg-[var(--button-bg)] text-[var(--button-text)] hover:opacity-90 transition-all shadow-xs cursor-pointer shrink-0 border-none"
                    type="button"
                    onClick={() => navigate('/add-trade')}
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span className="whitespace-nowrap">Import trades</span>
                  </button>
                </>
              )}

              {currentUser ? (
                <div className="shrink-0">
                  <DropdownAccountCardXS
                    user={{
                      firstName: currentUser.firstName,
                      lastName: currentUser.lastName,
                      email: currentUser.email,
                      avatarUrl: googleProfilePicture,
                    }}
                    timeZone={timeZone}
                    onTimeZoneChange={async (nextTimeZone) => {
                      if (!TIME_ZONES.includes(nextTimeZone) || nextTimeZone === timeZone) return;
                      const previousTimeZone = timeZone;
                      setTimeZone(nextTimeZone);
                      try {
                        await saveUserSettings({ preferences: { timeZone: nextTimeZone } });
                        notify('Timezone updated', 'success');
                      } catch {
                        setTimeZone(previousTimeZone);
                        notify('Timezone could not be updated', 'error');
                      }
                    }}
                    onOpenProfile={() => setProfileOpen(true)}
                    onOpenDashboardLayout={() => setLayoutOpen(true)}
                    onOpenSettings={() => setSettingsOpen(true)}
                    onSignOut={() => {
                      fetch(`${API_URL}/api/auth/logout`, {
                        method: 'POST',
                        credentials: 'include'
                      })
                        .catch(() => null)
                        .finally(() => {
                          clearClientStorage();
                          setUser(null);
                          window.dispatchEvent(new Event('auth:logout'));
                          notify('Logged out successfully', 'success');
                        });
                    }}
                    isMobile={isTablet}
                    dateRangeLabel={dateRangeLabel}
                    onOpenDateRange={() => {
                      setFilterOpen(false);
                    }}
                    tradeMode={tradeMode}
                    tradeModeLabel={currentLabel}
                    tradeModeOptions={modes}
                    onTradeModeChange={(mode) => setTradeMode(mode)}
                    currencyCode={currencyCode}
                    currencyOptions={DASHBOARD_CURRENCIES}
                    onCurrencyChange={onCurrencyChange}
                  />
                </div>
              ) : (
                <button
                  className="inline-flex items-center gap-2 min-w-0 min-h-[32px] px-2 py-1 rounded-[10px] bg-white/90 dark:bg-[#0d0d0d] border border-black/10 dark:border-[#242424] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">U</div>
                  <div className="flex flex-col text-left min-w-0 leading-tight">
                    <span className="max-w-[112px] truncate text-[13px] font-bold text-[var(--text-primary)]">Login</span>
                    <span className="max-w-[112px] truncate text-xs text-[#7b89a5]">Access your account</span>
                  </div>
                </button>
              )}

              {isTablet && (
                <button
                  className="flex size-9 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors p-0 border-0 bg-transparent cursor-pointer shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new Event('sidebar:toggle'));
                  }}
                  aria-label="Open navigation menu"
                  title="Open navigation menu"
                >
                  <Menu size={22} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      />

      <div className={`min-h-[22px] flex items-center justify-between gap-3 relative px-1 mb-2 bg-transparent border-0 transition-all duration-200 ${
        shouldHideHeader ? '-translate-y-[72px] opacity-0 pointer-events-none' : ''
      }`}>
        <div className="flex flex-wrap items-center justify-start gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] dark:text-[#c4cee2] text-[13px] font-semibold truncate">
            {isMobile ? `Last import ${compactLatestTradeLabel}` : `Last import was made: ${latestTradeLabel}`}
          </span>
          <Button
            color="secondary"
            size="xs"
            iconLeading={dashboardSyncing ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
            isLoading={dashboardSyncing}
            isDisabled={dashboardSyncing}
            className="min-h-[24px] shrink-0"
            onClick={syncFromDashboard}
          >
            {dashboardSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
        {!isMobile && (
          <Button
            color="secondary"
            size="sm"
            iconLeading={<Rocket size={16} aria-hidden="true" />}
            className="min-h-[28px] font-bold shrink-0"
            onClick={() => navigate('/day-review')}
          >
            Start my day
          </Button>
        )}
      </div>

      {isMobile && (
        <div className="px-3 py-2 flex items-center justify-center bg-[var(--bg-card)] border-b border-[var(--border-light)]">
          <Button
            color="secondary"
            size="sm"
            iconLeading={<Rocket size={16} aria-hidden="true" />}
            className="w-full justify-center"
            onClick={() => navigate('/day-review')}
          >
            Start my day
          </Button>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 bg-black/45 z-[9999] flex justify-center items-center p-5 overflow-y-auto">
          <div className="w-full max-w-[800px] bg-[#f5f7fb] dark:bg-[#121212] rounded-2xl shadow-2xl overflow-hidden">
            <Suspense fallback={null}>
              <Profile user={currentUser} onClose={() => setProfileOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timeZone={timeZone}
        setTimeZone={setTimeZone}
      />

      {layoutOpen && (
        <>
          <div className="layout-overlay" onClick={() => setLayoutOpen(false)} />
          <div className="layout-panel">
            <div className="layout-panel-header">
              <span>Dashboard Layout</span>
              <button onClick={() => setLayoutOpen(false)} aria-label="Close dashboard layout">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <Suspense fallback={null}>
              <DashboardSettings />
            </Suspense>
          </div>
        </>
      )}

      <Suspense fallback={null}>
        <UserLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </Suspense>
    </>
  );
}

export default Header;
