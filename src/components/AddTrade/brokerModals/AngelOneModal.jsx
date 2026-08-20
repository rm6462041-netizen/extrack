import React from 'react';
import { Button } from "@/components/Common/base/buttons/button";

function AngelHistoryNotice() {
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Angel One Sync Limitations</span>
        <button type="button" className="text-xs font-semibold text-[var(--text-muted)] opacity-60 cursor-not-allowed" disabled title="Learn more guide coming soon">
          Learn more
        </button>
      </div>
      <ul className="m-0 pl-4 text-xs text-[var(--text-secondary)] leading-relaxed flex flex-col gap-1.5">
        <li>
          <strong className="text-[var(--heading)]">Same-Day API Sync:</strong> SmartAPI only provides access to trades executed during your current active session (today&apos;s trades). Past historical trades cannot be fetched directly via API.
        </li>
        <li>
          <strong className="text-[var(--heading)]">Past History Import:</strong> To import past trade history, download your Tradebook statement from the Angel One portal and upload it via the <strong className="text-[var(--heading)]">File Upload</strong> tab.
        </li>
      </ul>
    </div>
  );
}

export default function AngelOneModal({
  selected,
  showAngelCredentials,
  setShowAngelCredentials,
  angelApiKey,
  setAngelApiKey,
  angelClientCode,
  setAngelClientCode,
  angelPassword,
  setAngelPassword,
  angelTotpSecret,
  setAngelTotpSecret,
  angelConnecting,
  connectAngelOne,
  syncAngelOne,
  syncing,
  formatBalance,
}) {
  const isConnected = selected.status === 'connected' && selected.tradeMethod === 'api_sync';

  return (
    <section className="flex flex-col gap-6 w-full p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <header className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)] flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center size-11 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
            {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : 'AO'}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-muted)]">Angel One account</span>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-base font-bold text-[var(--heading)]">{selected.accountName || 'Angel One'}</strong>
              {isConnected && selected.accountBalance != null ? (
                <span className="text-xs text-[var(--text-secondary)]">
                  Available cash balance <b className="text-[var(--heading)]">{formatBalance(selected.accountBalance, 'INR')}</b>
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`} role="status">
            <i className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
            {isConnected ? 'Connected' : 'Connection required'}
          </span>
          {isConnected && !showAngelCredentials ? (
            <Button color="secondary" size="sm" onClick={() => setShowAngelCredentials(true)}>
              Update API access
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT SIDE: FORM / ACTION PANEL */}
        {isConnected && !showAngelCredentials ? (
          <form className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]" onSubmit={syncAngelOne}>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Sync method</span>
              <h3 className="text-base font-bold text-[var(--heading)] m-0">Import Angel One trade book</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Syncs executed fills from your active Angel One trading session into Entrack.</p>
            </div>
            <Button color="primary" size="md" className="w-full" type="submit" isDisabled={syncing} isLoading={syncing}>
              {syncing ? 'Syncing trade book...' : 'Import trade history'}
            </Button>

            {/* Special Note for Angel One Same-Day limitation & Past File Upload */}
            <AngelHistoryNotice />
          </form>
        ) : (
          <form className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]" onSubmit={connectAngelOne}>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">SmartAPI credentials</span>
              <h3 className="text-base font-bold text-[var(--heading)] m-0">{isConnected ? 'Update Angel One access' : 'Connect Angel One'}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0 leading-relaxed">
                Generate an API Key at <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--divider-strong)] text-[11px] font-mono text-[var(--heading)]">smartapi.angelbroking.com</code>. Enter your Client Code, Password/PIN, and 2FA TOTP Secret Key.
              </p>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">API Key</span>
              <input className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] focus:outline-none focus:border-brand-solid" type="text" value={angelApiKey} onChange={(event) => setAngelApiKey(event.target.value)} autoComplete="off" spellCheck="false" maxLength="256" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Client Code</span>
              <input className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] focus:outline-none focus:border-brand-solid" type="text" value={angelClientCode} onChange={(event) => setAngelClientCode(event.target.value)} autoComplete="off" spellCheck="false" maxLength="64" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Password / PIN</span>
              <input className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] focus:outline-none focus:border-brand-solid" type="password" value={angelPassword} onChange={(event) => setAngelPassword(event.target.value)} autoComplete="new-password" spellCheck="false" maxLength="128" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">TOTP Secret Key</span>
              <input className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] focus:outline-none focus:border-brand-solid" type="password" value={angelTotpSecret} onChange={(event) => setAngelTotpSecret(event.target.value)} autoComplete="off" spellCheck="false" maxLength="256" required />
            </label>
            <div className="flex items-center gap-2 pt-2">
              {isConnected ? (
                <Button color="secondary" size="md" className="flex-1" onClick={() => { setShowAngelCredentials(false); setAngelApiKey(''); setAngelClientCode(''); setAngelPassword(''); setAngelTotpSecret(''); }}>
                  Cancel
                </Button>
              ) : null}
              <Button color="primary" size="md" className="flex-1" type="submit" isDisabled={angelConnecting || !angelApiKey.trim() || !angelClientCode.trim() || !angelPassword.trim() || !angelTotpSecret.trim()} isLoading={angelConnecting}>
                {angelConnecting ? 'Connecting...' : isConnected ? 'Update access' : 'Connect'}
              </Button>
            </div>

            {/* Special Note for Angel One Same-Day limitation & Past File Upload */}
            <AngelHistoryNotice />
          </form>
        )}

        {/* RIGHT SIDE: GUIDANCE & SECURITY PANEL */}
        <section className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--divider-strong)]">
            <span className="flex items-center justify-center size-10 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
              {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : 'AO'}
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Angel One connection</span>
              <h3 className="text-sm font-bold text-[var(--heading)] m-0 truncate">SmartAPI Security & permissions</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">Read-only</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Need help?</span>
              <strong className="text-xs font-bold text-[var(--heading)]">SmartAPI connection guide</strong>
            </div>
            <button type="button" className="text-xs font-semibold text-[var(--text-muted)] opacity-60 cursor-not-allowed" disabled title="Guide coming soon">
              How to connect
            </button>
          </div>

          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)]">
            <strong className="text-xs font-bold text-[var(--heading)]">Security & flexibility</strong>
            <ul className="m-0 pl-4 text-xs text-[var(--text-secondary)] leading-relaxed flex flex-col gap-1">
              <li>API connection is optional — only required for automatic live trade sync.</li>
              <li>You can upload CSV/Excel files or add trades manually anytime without connecting API credentials.</li>
              <li>Your API Key, Client Code, and TOTP secret are encrypted securely.</li>
              <li>Entrack verifies read-only access to your trade book. Trading and withdrawals remain disabled.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">Available markets</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">FnO</span>
              <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">Equity</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">Other ways to add trades</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">Csv Upload</span>
              <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">Manual Entry</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
