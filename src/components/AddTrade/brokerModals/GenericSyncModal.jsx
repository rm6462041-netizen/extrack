import React from 'react';

import { Calendar } from '../../application/date-picker/calendar';
import { CalendarIcon } from '@/icons';
import { jsDateToCalendarDate, calendarDateToJsDate } from '../../../utils/common/dateConversions';
import { DropdownSelect as CustomSelect } from "@/components/Common/base/dropdown/dropdown";
import { Button } from "@/components/Common/base/buttons/button";

const formatLabel = (value) => String(value || '')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatSelectedDate = (value) => value ? value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Select date';

export default function GenericSyncModal({
  selected,
  selectedIntegrationId,
  setSelectedIntegrationId,
  supportedPlatforms,
  chosenPlatform,
  isPlatformReady,
  range,
  setRange,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  openCalendar,
  setOpenCalendar,
  calendarMonth,
  setCalendarMonth,
  calendarRef,
  syncing,
  runSync,
}) {
  const instrumentTypes = Array.isArray(selected.supportedInstrumentTypes) ? selected.supportedInstrumentTypes : [];
  const supportedMethods = Array.isArray(selected.supportedTradeMethods) ? selected.supportedTradeMethods : [];
  const today = new Date();

  const todayCalDate = jsDateToCalendarDate(today);

  const dateField = (field) => {
    const isFrom = field === 'from';
    const value = isFrom ? fromDate : toDate;
    const minVal = isFrom ? undefined : (fromDate ? jsDateToCalendarDate(fromDate) : undefined);
    const maxVal = isFrom ? jsDateToCalendarDate(toDate || today) : todayCalDate;
    return (
      <div className="relative flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{isFrom ? 'From date' : 'To date'}</span>
        <button
          type="button"
          className="w-full min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] text-left hover:border-brand-solid focus:outline-none focus:border-brand-solid shadow-xs transition-all cursor-pointer flex items-center gap-2"
          aria-expanded={openCalendar === field}
          onClick={() => { setCalendarMonth(jsDateToCalendarDate(value || new Date())); setOpenCalendar((open) => open === field ? null : field); }}
        >
          <CalendarIcon size={15} className="text-[var(--text-muted)] shrink-0" />
          <span>{formatSelectedDate(value)}</span>
        </button>
        {openCalendar === field ? (
          <div className="absolute z-30 top-[calc(100%+6px)] left-0 w-[280px] max-w-[calc(100vw-48px)] p-2 rounded-2xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shadow-xl">
            <Calendar
              value={jsDateToCalendarDate(value)}
              onChange={(calDate) => { const date = calendarDateToJsDate(calDate); if (isFrom) setFromDate(date); else setToDate(date); setOpenCalendar(null); }}
              focusedValue={calendarMonth}
              onFocusChange={setCalendarMonth}
              minValue={minVal}
              maxValue={maxVal}
            ><span /></Calendar>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-6 w-full p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <header className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)] flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center size-11 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
            {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : String(selected.brokerName || 'Broker').slice(0, 2).toUpperCase()}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-muted)]">{selected.brokerName} account{selected.accountEnvironment ? ` - ${selected.accountEnvironment}` : ''}</span>
            <strong className="text-base font-bold text-[var(--heading)]">{selected.accountName || `Account ${selected.externalAccountId || ''}`}</strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
            selected.status === 'connected'
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`} role="status">
            <i className={`size-1.5 rounded-full ${selected.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
            {selected.status === 'connected' ? 'Connected' : 'Connection required'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Left: Platform & Range Selection */}
        <section className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Import trades</span>
            <h3 className="text-base font-bold text-[var(--heading)] m-0">Choose how to connect</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Select your trading platform and the history you want to add.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Platform</span>
            <CustomSelect
              ariaLabel="Trading platform"
              placeholder="Choose platform"
              value={selectedIntegrationId}
              onChange={(event) => setSelectedIntegrationId(event.target.value)}
              options={supportedPlatforms.map((integration) => ({
                value: integration.id,
                label: `${integration.platformName}${isPlatformReady(integration) ? '' : ' - Coming soon'}`,
                disabled: !isPlatformReady(integration),
              }))}
            />
          </div>

          {!supportedPlatforms.length ? <p className="text-xs text-[var(--text-muted)]">No platform connection is listed for this broker.</p> : null}
          {chosenPlatform && !isPlatformReady(chosenPlatform) ? <p className="text-xs text-amber-500">This platform is coming soon.</p> : null}

          <div className="h-px w-full bg-[var(--divider-strong)] my-1" />

          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">History window</span>
            <h3 className="text-base font-bold text-[var(--heading)] m-0">Choose trade history</h3>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Range</span>
            <CustomSelect
              ariaLabel="Trade history range"
              value={range}
              onChange={(event) => { setRange(event.target.value); setOpenCalendar(null); }}
              options={[
                { value: '1m', label: '1 Month' },
                { value: '3m', label: '3 Months' },
                { value: '6m', label: '6 Months' },
                { value: '1y', label: '1 Year' },
                { value: '2y', label: '2 Years' },
                { value: 'all', label: 'All Time' },
                { value: 'custom', label: 'Custom Date Range' },
              ]}
            />
          </div>

          {range === 'custom' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" ref={calendarRef}>
              {dateField('from')}
              {dateField('to')}
            </div>
          ) : null}

          <div className="pt-2">
            <Button
              color="primary"
              size="md"
              className="w-full"
              isDisabled={syncing || !isPlatformReady(chosenPlatform)}
              isLoading={syncing}
              onClick={runSync}
            >
              {syncing ? 'Please wait...' : selected.integrationId === chosenPlatform?.id && selected.status === 'connected' ? 'Import history' : 'Continue to connect'}
            </Button>
          </div>
        </section>

        {/* Right: Platform Guidance & Security */}
        <section className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--divider-strong)]">
            <span className="flex items-center justify-center size-10 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
              {chosenPlatform?.platformLogoPath ? <img src={chosenPlatform.platformLogoPath} alt="" className="size-6 object-contain" /> : String(chosenPlatform?.platformName || selected.brokerName || 'Platform').slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Selected platform</span>
              <h3 className="text-sm font-bold text-[var(--heading)] m-0 truncate">{chosenPlatform?.platformName || 'Choose a platform'}</h3>
            </div>
            {isPlatformReady(chosenPlatform) ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">Read-only</span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Need help?</span>
              <strong className="text-xs font-bold text-[var(--heading)]">Platform connection guide</strong>
            </div>
            <button type="button" className="text-xs font-semibold text-[var(--text-muted)] opacity-60 cursor-not-allowed" disabled title="Guide coming soon">How to connect</button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">Available markets</span>
            <div className="flex flex-wrap gap-1.5">
              {instrumentTypes.length ? instrumentTypes.map((type) => (
                <span key={type} className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">
                  {formatLabel(type)}
                </span>
              )) : <em className="text-xs text-[var(--text-muted)] not-italic">Market details are not listed</em>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">Other ways to add trades</span>
            <div className="flex flex-wrap gap-1.5">
              {supportedMethods.map((method) => (
                <span key={method} className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">
                  {formatLabel(method)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)]">
            <strong className="text-xs font-bold text-[var(--heading)]">Security & flexibility</strong>
            <ul className="m-0 pl-4 text-xs text-[var(--text-secondary)] leading-relaxed flex flex-col gap-1">
              <li>Direct connection is optional — only required if you want automatic live trade sync.</li>
              <li>You can upload statement/CSV files or enter trades manually anytime without connecting an account.</li>
              <li>Access is strictly read-only; Entrack cannot place, modify, or cancel trades.</li>
              <li>Only your signed-in account can use this connection, and you can disconnect at any time.</li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  );
}
