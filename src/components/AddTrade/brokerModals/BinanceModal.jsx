import React from 'react';
import { DropdownSelect as CustomSelect } from "@/components/Common/base/dropdown/dropdown";
import { Button } from "@/components/Common/base/buttons/button";

export default function BinanceModal({
  selected,
  showBinanceCredentials,
  setShowBinanceCredentials,
  binanceEnvironment,
  setBinanceEnvironment,
  binanceApiKey,
  setBinanceApiKey,
  binanceSecretKey,
  setBinanceSecretKey,
  binanceMarket,
  setBinanceMarket,
  binanceYear,
  setBinanceYear,
  binanceConnecting,
  connectBinance,
  syncBinance,
  syncing,
  formatBalance,
  setOpenCalendar,
  BINANCE_YEAR_OPTIONS,
}) {
  const capabilities = selected.metadata?.capabilities || {};
  const marketOptions = [
    capabilities.spot ? { value: 'spot', label: 'Spot - Live sync' } : null,
    capabilities.usdmFutures ? { value: 'usdmFutures', label: 'USD-M Futures' } : null,
    capabilities.coinmFutures ? { value: 'coinmFutures', label: 'COIN-M Futures' } : null,
  ].filter(Boolean);
  const hasHistoryExport = binanceMarket !== 'spot';
  const marketLabel = marketOptions.find((option) => option.value === binanceMarket)?.label || 'Binance';
  const activeBalance = selected.binanceBalances?.[binanceMarket];
  const spotHoldings = Array.isArray(selected.binanceHoldings) ? selected.binanceHoldings : [];

  return (
    <section className="flex flex-col gap-6 w-full p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <header className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)] flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center size-11 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
            {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : 'BN'}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-muted)]">
              Binance
              {selected.accountEnvironment ? (
                <>
                  {' '}·{' '}
                  <b className={`font-bold ${selected.accountEnvironment === 'Demo' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {selected.accountEnvironment}
                  </b>
                </>
              ) : null} account
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-base font-bold text-[var(--heading)]">{selected.accountName || 'Binance'}</strong>
              {selected.status === 'connected' && activeBalance ? (
                <span className="text-xs text-[var(--text-secondary)]">
                  Live {marketLabel} balance <b className="text-[var(--heading)]">{formatBalance(activeBalance.balance, activeBalance.currency)}</b>
                </span>
              ) : null}
            </div>
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
          {selected.status === 'connected' && !showBinanceCredentials ? (
            <Button color="secondary" size="sm" onClick={() => setShowBinanceCredentials(true)}>
              Update API access
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT SIDE: FORM / ACTION PANEL */}
        {selected.status === 'connected' && !showBinanceCredentials ? (
          <form className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]" onSubmit={syncBinance}>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Sync method</span>
              <h3 className="text-base font-bold text-[var(--heading)] m-0">{hasHistoryExport ? `Import ${marketLabel} history` : 'Spot live sync'}</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Market</span>
              <CustomSelect
                ariaLabel="Binance market"
                value={binanceMarket}
                onChange={(event) => { setBinanceMarket(event.target.value); setOpenCalendar(null); }}
                options={marketOptions}
              />
            </div>
            {hasHistoryExport ? (
              <>
                <p className="text-xs text-[var(--text-secondary)] m-0 leading-relaxed">Select a calendar year. Completed years include the full available history; the current year includes data through yesterday.</p>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Year</span>
                  <CustomSelect
                    ariaLabel="Binance history year"
                    value={binanceYear}
                    onChange={(event) => setBinanceYear(event.target.value)}
                    options={BINANCE_YEAR_OPTIONS}
                  />
                </div>
                <Button color="primary" size="md" className="w-full mt-2" type="submit" isDisabled={syncing} isLoading={syncing}>
                  {syncing ? 'Preparing history...' : 'Import history'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--text-secondary)] m-0 leading-relaxed">Live Spot fills and holdings update automatically. Historical Spot activity is not available for import.</p>
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)]">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--heading)] pb-2 border-b border-[var(--divider-strong)]">
                    <span>Spot holdings</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-normal">{spotHoldings.length} non-zero asset{spotHoldings.length === 1 ? '' : 's'}</span>
                  </div>
                  {spotHoldings.length ? (
                    <ul className="flex flex-col divide-y divide-[var(--divider-strong)] m-0 p-0 list-none max-h-48 overflow-y-auto">
                      {spotHoldings.map((holding) => (
                        <li key={holding.asset} className="flex items-center justify-between py-1.5 text-xs">
                          <strong className="text-[var(--heading)] font-semibold">{holding.asset}</strong>
                          <span className="text-[var(--text-secondary)] font-mono">{Number(holding.balance).toLocaleString(undefined, { maximumFractionDigits: 12 })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] m-0">No non-zero Spot holdings detected.</p>
                  )}
                </div>
                <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" role="status">Live sync active</div>
              </>
            )}
          </form>
        ) : (
          <form className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]" onSubmit={connectBinance}>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">API credentials</span>
              <h3 className="text-base font-bold text-[var(--heading)] m-0">{selected.status === 'connected' ? 'Update Binance access' : 'Connect Binance'}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0 leading-relaxed">
                {binanceEnvironment === 'demo'
                  ? 'Use API credentials created in Binance USD-M Futures Demo. Real Binance API keys will not work here.'
                  : 'Create a read-only Binance API key. Do not enable trading or withdrawals. Apply the IP restriction shown in your connection settings when available.'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Account type</span>
              <CustomSelect
                ariaLabel="Binance account type"
                value={binanceEnvironment}
                onChange={(event) => setBinanceEnvironment(event.target.value)}
                disabled={selected.status === 'connected'}
                options={[
                  { value: 'real', label: 'Real Account' },
                  { value: 'demo', label: 'Demo Account - USD-M Futures' },
                ]}
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">API Key</span>
              <input className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-solid shadow-xs" type="text" value={binanceApiKey} onChange={(event) => setBinanceApiKey(event.target.value)} autoComplete="off" spellCheck="false" maxLength="256" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Secret Key</span>
              <input className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-solid shadow-xs" type="password" value={binanceSecretKey} onChange={(event) => setBinanceSecretKey(event.target.value)} autoComplete="new-password" spellCheck="false" maxLength="256" required />
            </label>
            <div className="flex items-center gap-2 pt-2">
              {selected.status === 'connected' ? (
                <Button color="secondary" size="md" className="flex-1" onClick={() => { setShowBinanceCredentials(false); setBinanceApiKey(''); setBinanceSecretKey(''); }}>
                  Cancel
                </Button>
              ) : null}
              <Button color="primary" size="md" className="flex-1" type="submit" isDisabled={binanceConnecting || !binanceApiKey.trim() || !binanceSecretKey.trim()} isLoading={binanceConnecting}>
                {binanceConnecting ? 'Connecting...' : selected.status === 'connected' ? 'Update access' : 'Connect'}
              </Button>
            </div>
          </form>
        )}

        {/* RIGHT SIDE: GUIDANCE & SECURITY PANEL */}
        <section className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--divider-strong)]">
            <span className="flex items-center justify-center size-10 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
              {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : 'BN'}
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Binance connection</span>
              <h3 className="text-sm font-bold text-[var(--heading)] m-0 truncate">Security & permissions</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">Read-only</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Need help?</span>
              <strong className="text-xs font-bold text-[var(--heading)]">Binance API connection guide</strong>
            </div>
            <button type="button" className="text-xs font-semibold text-[var(--text-muted)] opacity-60 cursor-not-allowed" disabled title="Guide coming soon">
              How to connect
            </button>
          </div>

          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)]">
            <strong className="text-xs font-bold text-[var(--heading)]">Security & flexibility</strong>
            <ul className="m-0 pl-4 text-xs text-[var(--text-secondary)] leading-relaxed flex flex-col gap-1">
              <li>API connection is optional — only required for automatic live trade sync.</li>
              <li>You can upload trade export files or add trades manually anytime without connecting API credentials.</li>
              <li>
                {selected.metadata?.environment === 'demo'
                  ? 'Entrack verifies USD-M Futures access against Binance Demo.'
                  : 'Entrack independently verifies read-only Spot, USD-M and COIN-M access.'}
              </li>
              <li>Trading, transfers and withdrawals remain strictly disabled.</li>
            </ul>
          </div>

          {selected.status === 'connected' ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">Detected Capabilities</span>
              <div className="flex flex-wrap gap-1.5">
                {capabilities.spot ? <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">Spot: Detected</span> : null}
                {capabilities.usdmFutures ? <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">USD-M Futures: Detected</span> : null}
                {capabilities.coinmFutures ? <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">COIN-M Futures: Detected</span> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
