import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { jsDateToCalendarDate } from '../../../utils/common/dateConversions';
import { DropdownSelect as CustomSelect } from "@/components/Common/base/dropdown/dropdown";
import api from '../../../utils/common/serve';
import { useAppDialog } from '../../../context/AppDialogContext';
import { getBrokerModal } from '../brokerModals/brokerModalRegistry';

const PENDING_SYNC_KEY = 'entrack:pending-ctrader-sync';
const BINANCE_YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => {
  const year = new Date().getFullYear() - index;
  return { value: String(year), label: index === 0 ? `${year} (Year to date)` : String(year) };
});
const formatDate = (value) => value ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not synced yet';
const formatBalance = (value, currency) => Number.isFinite(Number(value))
  ? `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`.trim()
  : 'Not available';
const getBinanceEnvironmentLabel = (connection) => {
  if (connection.status !== 'connected') return null;
  return connection.metadata?.environment === 'demo' ? 'Demo' : 'Real';
};
const platformIntegrations = (connection) => Array.isArray(connection?.supportedIntegrations)
  ? connection.supportedIntegrations.filter((integration) => String(integration.tradeMethod || '').endsWith('_sync'))
  : [];
const isPlatformReady = (integration) =>
  (integration?.platformSlug === 'ctrader' && integration?.tradeMethod === 'oauth_sync') ||
  integration?.tradeMethod === 'api_sync';

const preferredBalances = (items = []) => {
  const result = new Map();
  for (const item of items) {
    if (!result.has(item.connectionId) || item.market === 'usdmFutures') result.set(item.connectionId, item);
  }
  return result;
};

function getSyncState(connection) {
  if (['binance', 'angel-one'].includes(connection.brokerSlug)) {
    return connection.status === 'connected' && connection.tradeMethod === 'api_sync'
      ? { label: 'Connection active', tone: 'active', selectable: true }
      : { label: 'Connection required', tone: 'pending', selectable: true };
  }
  const supportsSync = String(connection.tradeMethod || '').endsWith('_sync');
  if (!supportsSync && platformIntegrations(connection).length) return { label: 'Choose platform', tone: 'pending', selectable: true };
  if (!supportsSync) return { label: 'Sync not available', tone: 'unavailable', selectable: false };
  if (connection.status !== 'connected') return { label: 'Connection required', tone: 'pending', selectable: true };
  if (!connection.lastSyncedAt) return { label: 'Sync not started', tone: 'pending', selectable: true };
  if (connection.lastSyncStatus === 'failed') return { label: 'Sync failed', tone: 'failed', selectable: true };
  return { label: 'Sync active', tone: 'active', selectable: true };
}

function getRangeTimestamps(range, fromDate, toDate) {
  const end = new Date();
  const start = new Date(end);
  if (range === '1m') start.setMonth(start.getMonth() - 1);
  if (range === '3m') start.setMonth(start.getMonth() - 3);
  if (range === '6m') start.setMonth(start.getMonth() - 6);
  if (range === '1y') start.setFullYear(start.getFullYear() - 1);
  if (range === '2y') start.setFullYear(start.getFullYear() - 2);
  if (range === 'all') return { fromTimestamp: 0, toTimestamp: end.getTime() };
  if (range === 'custom') {
    if (!fromDate || !toDate) return null;
    return {
      fromTimestamp: new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime(),
      toTimestamp: new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).getTime(),
    };
  }
  return { fromTimestamp: start.getTime(), toTimestamp: end.getTime() };
}

function getBinanceYearTimestamps(value, now = new Date()) {
  const year = Number(value);
  const start = new Date(year, 0, 1).getTime();
  const end = year === now.getFullYear()
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1
    : new Date(year + 1, 0, 1).getTime() - 1;
  return { fromTimestamp: start, toTimestamp: end > start ? end : now.getTime() };
}

const syncResultMessage = (results) => {
  const fetched = results.reduce((total, result) => total + (Number(result.fetchedCount) || 0), 0);
  const newSaved = results.reduce((total, result) => total + (Number(result.newTradesCount) || 0), 0);
  const updated = results.reduce((total, result) => total + (Number(result.updatedTradesCount) || 0), 0);

  if (fetched === 0) {
    return 'Sync complete: No trades found.';
  }
  if (newSaved === 0) {
    return updated > 0
      ? `Sync complete: No new trades found (${updated} trade${updated === 1 ? '' : 's'} already up to date).`
      : 'Sync complete: No new trades found.';
  }
  return `Sync complete: ${newSaved} new trade${newSaved === 1 ? '' : 's'} saved${updated > 0 ? ` (${updated} up to date)` : ''}.`;
};

export default function SyncAccounts({ accounts = [] }) {
  const queryClient = useQueryClient();
  const { notify } = useAppDialog();
  const [savedConnections, setSavedConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [range, setRange] = useState('1m');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [openCalendar, setOpenCalendar] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(jsDateToCalendarDate(new Date()));
  const [syncing, setSyncing] = useState(false);
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceSecretKey, setBinanceSecretKey] = useState('');
  const [binanceConnecting, setBinanceConnecting] = useState(false);
  const [binanceEnvironment, setBinanceEnvironment] = useState('real');
  const [binanceMarket, setBinanceMarket] = useState('usdmFutures');
  const [binanceYear, setBinanceYear] = useState(BINANCE_YEAR_OPTIONS[0].value);
  const [showBinanceCredentials, setShowBinanceCredentials] = useState(false);
  const [angelApiKey, setAngelApiKey] = useState('');
  const [angelClientCode, setAngelClientCode] = useState('');
  const [angelPassword, setAngelPassword] = useState('');
  const [angelTotpSecret, setAngelTotpSecret] = useState('');
  const [angelConnecting, setAngelConnecting] = useState(false);
  const [showAngelCredentials, setShowAngelCredentials] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    let active = true;
    const callbackStatus = new URLSearchParams(window.location.search).get('ctrader');
    let pendingSync = null;
    try { pendingSync = JSON.parse(sessionStorage.getItem(PENDING_SYNC_KEY)); } catch { /* Ignore invalid local state. */ }
    if (callbackStatus) {
      notify(
        callbackStatus === 'connected' ? 'cTrader connected' : callbackStatus === 'cancelled' ? 'cTrader connection cancelled' : 'cTrader connection failed',
        callbackStatus === 'connected' ? 'success' : callbackStatus === 'cancelled' ? 'warning' : 'error'
      );
      sessionStorage.removeItem(PENDING_SYNC_KEY);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('ctrader');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }
    api.get('/broker-connections')
      .then(async ({ data }) => {
        if (!active) return;
        const saved = Array.isArray(data?.connections) ? data.connections : [];
        const balances = new Map((data?.balances || []).map((item) => [`${item.connectionId}:${item.accountId}`, item]));
        const connectionBalances = preferredBalances(data?.balances);
        const expanded = saved.flatMap((connection) => {
          const authorizedAccounts = Array.isArray(connection.metadata?.authorizedAccounts)
            ? connection.metadata.authorizedAccounts
            : (connection.metadata?.authorizedAccountIds || []).map((id) => ({ id }));
          return authorizedAccounts.length
            ? authorizedAccounts.map((account) => ({
              ...connection,
              rowId: `${connection.id}:${account.id}`,
              externalAccountId: String(account.id),
              accountBalance: balances.get(`${connection.id}:${account.id}`)?.balance,
              accountCurrency: balances.get(`${connection.id}:${account.id}`)?.currency || connection.accountCurrency,
              accountEnvironment: account.isLive == null ? null : account.isLive ? 'Live' : 'Demo',
              accountName: authorizedAccounts.length > 1 ? `${connection.accountName} - ${account.login || account.id}` : connection.accountName,
            }))
            : [{
              ...connection,
              rowId: connection.id,
              accountBalance: connectionBalances.get(connection.id)?.balance,
              accountCurrency: connectionBalances.get(connection.id)?.currency || connection.accountCurrency,
              binanceBalances: connection.brokerSlug === 'binance' ? {
                spot: balances.get(`${connection.id}:spot`),
                usdmFutures: balances.get(`${connection.id}:usdmFutures`),
              } : undefined,
              binanceHoldings: connection.brokerSlug === 'binance'
                ? balances.get(`${connection.id}:spot`)?.holdings || []
                : undefined,
              accountEnvironment: connection.brokerSlug === 'binance' ? getBinanceEnvironmentLabel(connection) : null,
            }];
        });
        setSavedConnections(expanded);
        if (callbackStatus === 'connected' && pendingSync?.connectionId) {
          const accountsToSync = expanded.filter((connection) => connection.id === pendingSync.connectionId && connection.externalAccountId);
          if (!accountsToSync.length) throw new Error('Connected account was not returned');
          setSelectedId(accountsToSync[0].rowId);
          setRange(pendingSync.range || '1m');
          setFromDate(pendingSync.fromDate ? new Date(pendingSync.fromDate) : null);
          setToDate(pendingSync.toDate ? new Date(pendingSync.toDate) : null);
          setSyncing(true);
          const results = await Promise.all(accountsToSync.map(async (connection) => {
            const response = await api.post(`/broker-connections/ctrader/${connection.id}/sync`, {
              accountId: connection.externalAccountId,
              fromTimestamp: pendingSync.fromTimestamp,
              toTimestamp: pendingSync.toTimestamp,
            });
            return response.data;
          }));
          if (!active) return;
          const syncedAt = new Date().toISOString();
          setSavedConnections((current) => current.map((connection) => connection.id === pendingSync.connectionId
            ? { ...connection, lastSyncedAt: syncedAt, lastSyncStatus: 'success' }
            : connection));
          notify(syncResultMessage(results), 'success');
          await queryClient.invalidateQueries({ queryKey: ['trades'] });
        }
      })
      .catch(() => {
        if (!active) return;
        if (callbackStatus === 'connected') notify('cTrader connected, but trade history could not be synced', 'error');
        else setError('Saved broker accounts could not be loaded.');
      })
      .finally(() => { if (active) { setLoading(false); setSyncing(false); } });
    return () => { active = false; };
  }, [notify, queryClient]);

  useEffect(() => {
    const updateBalances = (event) => {
      const next = preferredBalances(event.detail);
      const exact = new Map((event.detail || []).map((item) => [`${item.connectionId}:${item.accountId}`, item]));
      const binanceByConnection = new Map();
      for (const item of event.detail || []) {
        if (!item.market) continue;
        binanceByConnection.set(item.connectionId, {
          ...binanceByConnection.get(item.connectionId),
          [item.market]: item,
        });
      }
      setSavedConnections((current) => current.map((connection) => {
        const balance = connection.brokerSlug === 'binance'
          ? next.get(connection.id)
          : exact.get(`${connection.id}:${connection.externalAccountId}`);
        return balance ? {
          ...connection,
          accountBalance: balance.balance,
          accountCurrency: balance.currency,
          ...(connection.brokerSlug === 'binance' ? {
            binanceBalances: { ...connection.binanceBalances, ...binanceByConnection.get(connection.id) },
            binanceHoldings: binanceByConnection.get(connection.id)?.spot?.holdings ?? connection.binanceHoldings,
          } : {}),
          accountEnvironment: connection.brokerSlug === 'binance'
            ? getBinanceEnvironmentLabel(connection)
            : connection.accountEnvironment,
        } : connection;
      }));
    };
    window.addEventListener('broker-balances-updated', updateBalances);
    return () => window.removeEventListener('broker-balances-updated', updateBalances);
  }, []);

  useEffect(() => {
    if (!openCalendar) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!calendarRef.current?.contains(event.target)) setOpenCalendar(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [openCalendar]);

  const localAccounts = accounts
    .filter((account) => !account.brokerConnectionId)
    .map((account) => ({
      rowId: `local:${account.id}`,
      accountName: account.accountName,
      brokerName: account.name,
      brokerLogoPath: account.logoPath,
      status: 'connected',
    }));
  const connections = [...savedConnections, ...localAccounts];
  const selected = connections.find((connection) => connection.rowId === selectedId);

  useEffect(() => {
    setSelectedIntegrationId(selected?.platformId ? selected.integrationId : '');
  }, [selected?.integrationId, selected?.platformId, selected?.rowId]);

  useEffect(() => {
    if (selected?.brokerSlug === 'binance') {
      setBinanceEnvironment(selected.metadata?.environment === 'demo' ? 'demo' : 'real');
    }
  }, [selected?.brokerSlug, selected?.metadata?.environment, selected?.rowId]);

  useEffect(() => {
    const capabilities = selected?.brokerSlug === 'binance' ? selected.metadata?.capabilities || {} : {};
    if (capabilities[binanceMarket]) return;
    if (capabilities.usdmFutures) setBinanceMarket('usdmFutures');
    else if (capabilities.coinmFutures) setBinanceMarket('coinmFutures');
    else if (capabilities.spot) setBinanceMarket('spot');
  }, [binanceMarket, selected?.brokerSlug, selected?.metadata?.capabilities]);

  const connectBinance = async (event) => {
    event.preventDefault();
    if (!binanceApiKey.trim() || !binanceSecretKey.trim() || binanceConnecting) return;
    setBinanceConnecting(true);
    try {
      const { data } = await api.post('/broker-connections/binance/connect', {
        connectionId: selected.id,
        environment: binanceEnvironment,
        apiKey: binanceApiKey,
        secretKey: binanceSecretKey,
      });
      setBinanceApiKey('');
      setBinanceSecretKey('');
      setShowBinanceCredentials(false);
      const connectedId = data.connectionId || selected.id;
      const connected = {
        ...selected,
        id: connectedId,
        rowId: connectedId,
        status: 'connected',
        accountEnvironment: data.environment === 'demo' ? 'Demo' : 'Real',
        metadata: {
          ...selected.metadata,
          provider: 'binance',
          readOnly: true,
          environment: data.environment || binanceEnvironment,
          capabilities: data.capabilities,
        },
      };
      setSavedConnections((current) => [
        ...current.filter((connection) => connection.id !== selected.id && connection.id !== connectedId),
        connected,
      ]);
      setSelectedId(connectedId);
      notify(`Binance ${data.environment === 'demo' ? 'Demo' : 'Real'} account connected`, 'success');
    } catch (error) {
      const code = error.response?.data?.code;
      notify(code === 'INVALID_CREDENTIALS'
        ? 'Binance credentials are invalid'
        : code === 'BINANCE_PERMISSION_REQUIRED'
          ? 'Binance read access or IP permission is required'
          : 'Binance connection is temporarily unavailable', 'error');
    } finally {
      setBinanceConnecting(false);
    }
  };

  const syncBinance = async (event) => {
    event.preventDefault();
    if (syncing) return;
    if (binanceMarket === 'spot') {
      notify('Spot live sync is active. Binance does not provide an account-wide Spot history export.', 'warning');
      return;
    }
    setSyncing(true);
    try {
      const timestamps = getBinanceYearTimestamps(binanceYear);
      const payload = { connectionId: selected.id, startTime: timestamps.fromTimestamp, endTime: timestamps.toTimestamp };
      const marketPath = binanceMarket === 'coinmFutures' ? 'coinm-futures' : 'usdm-futures';
      let { data } = await api.post(`/broker-connections/binance/trades/${marketPath}/history-export`, payload);
      for (let attempt = 0; data.status === 'processing' && attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        ({ data } = await api.post(`/broker-connections/binance/trades/${marketPath}/history-export/poll`, payload));
      }
      if (data.status === 'processing') { notify('Binance is still preparing the export. Click sync again later to resume.', 'warning'); return; }
      const syncedAt = new Date().toISOString();
      setSavedConnections((current) => current.map((connection) => connection.id === selected.id
        ? { ...connection, lastSyncedAt: syncedAt, lastSyncStatus: 'success' }
        : connection));
      notify(syncResultMessage([data]), 'success');
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      notify('Binance trade history could not be synced', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const connectAngelOne = async (event) => {
    event.preventDefault();
    if (!angelApiKey.trim() || !angelClientCode.trim() || !angelPassword.trim() || !angelTotpSecret.trim() || angelConnecting) return;
    setAngelConnecting(true);
    try {
      const { data } = await api.post('/broker-connections/angel-one/connect', {
        connectionId: selected.id,
        apiKey: angelApiKey.trim(),
        clientCode: angelClientCode.trim(),
        password: angelPassword.trim(),
        totpSecret: angelTotpSecret.trim(),
      });
      setAngelApiKey('');
      setAngelClientCode('');
      setAngelPassword('');
      setAngelTotpSecret('');
      setShowAngelCredentials(false);
      setSavedConnections((current) => current.map((connection) => connection.id === selected.id ? {
        ...connection,
        status: 'connected',
        tradeMethod: 'api_sync',
        accountName: data.name || selected.accountName,
      } : connection));
      notify(`Angel One account (${data.clientCode}) connected`, 'success');
    } catch (error) {
      const msg = error.response?.data?.message || 'Angel One credentials (API Key, Client Code, PIN or TOTP) are invalid';
      notify(msg, 'error');
    } finally {
      setAngelConnecting(false);
    }
  };

  const syncAngelOne = async (event) => {
    event.preventDefault();
    if (syncing) return;
    setSyncing(true);
    try {
      const { data } = await api.post('/broker-connections/angel-one/sync', { connectionId: selected.id });
      const syncedAt = new Date().toISOString();
      setSavedConnections((current) => current.map((connection) => connection.id === selected.id
        ? { ...connection, lastSyncedAt: syncedAt, lastSyncStatus: 'success', accountBalance: data.balance }
        : connection));
      notify(syncResultMessage([data]), 'success');
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      notify('Angel One trade history could not be synced', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const runSync = async () => {
    if (!selected || syncing) return;
    const chosenIntegration = platformIntegrations(selected).find((integration) => integration.id === selectedIntegrationId);
    if (!chosenIntegration || !isPlatformReady(chosenIntegration)) return;
    setSyncing(true);
    try {
      let activeConnection = selected;
      if (selected.integrationId !== chosenIntegration.id) {
        const { data } = await api.post(`/broker-connections/${selected.id}/integration`, { integrationId: chosenIntegration.id });
        activeConnection = { ...data.connection, rowId: selected.rowId };
        setSavedConnections((current) => current.map((connection) => connection.id === selected.id
          ? { ...connection, ...data.connection, rowId: connection.rowId }
          : connection));
      }
      const timestamps = getRangeTimestamps(range, fromDate, toDate);
      if (!timestamps) {
        notify('Select both From and To dates', 'warning');
        return;
      }
      if (activeConnection.status !== 'connected') {
        const { data } = await api.get('/broker-connections/ctrader/start', { params: { connectionId: activeConnection.id } });
        if (!data?.authorizationUrl) throw new Error('Missing authorization URL');
        sessionStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({
          connectionId: activeConnection.id,
          range,
          fromDate: fromDate?.toISOString() || null,
          toDate: toDate?.toISOString() || null,
          ...timestamps,
        }));
        window.location.assign(data.authorizationUrl);
        return;
      }
      const { data } = await api.post(`/broker-connections/ctrader/${activeConnection.id}/sync`, {
        accountId: activeConnection.externalAccountId,
        ...timestamps,
      });
      const syncedAt = new Date().toISOString();
      setSavedConnections((current) => current.map((connection) => connection.id === selected.id
        ? { ...connection, lastSyncedAt: syncedAt, lastSyncStatus: 'success' }
        : connection));
      notify(syncResultMessage([data]), 'success');
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      notify(selected.status === 'connected' ? 'Trade history could not be synced' : 'cTrader connection could not be started', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (selected) {
    const BrokerModalComponent = getBrokerModal(selected);
    const supportedPlatforms = platformIntegrations(selected);
    const chosenPlatform = supportedPlatforms.find((integration) => integration.id === selectedIntegrationId);

    return (
      <BrokerModalComponent
        selected={selected}
        showBinanceCredentials={showBinanceCredentials}
        setShowBinanceCredentials={setShowBinanceCredentials}
        binanceEnvironment={binanceEnvironment}
        setBinanceEnvironment={setBinanceEnvironment}
        binanceApiKey={binanceApiKey}
        setBinanceApiKey={setBinanceApiKey}
        binanceSecretKey={binanceSecretKey}
        setBinanceSecretKey={setBinanceSecretKey}
        binanceMarket={binanceMarket}
        setBinanceMarket={setBinanceMarket}
        binanceYear={binanceYear}
        setBinanceYear={setBinanceYear}
        binanceConnecting={binanceConnecting}
        connectBinance={connectBinance}
        syncBinance={syncBinance}
        showAngelCredentials={showAngelCredentials}
        setShowAngelCredentials={setShowAngelCredentials}
        angelApiKey={angelApiKey}
        setAngelApiKey={setAngelApiKey}
        angelClientCode={angelClientCode}
        setAngelClientCode={setAngelClientCode}
        angelPassword={angelPassword}
        setAngelPassword={setAngelPassword}
        angelTotpSecret={angelTotpSecret}
        setAngelTotpSecret={setAngelTotpSecret}
        angelConnecting={angelConnecting}
        connectAngelOne={connectAngelOne}
        syncAngelOne={syncAngelOne}
        selectedIntegrationId={selectedIntegrationId}
        setSelectedIntegrationId={setSelectedIntegrationId}
        supportedPlatforms={supportedPlatforms}
        chosenPlatform={chosenPlatform}
        isPlatformReady={isPlatformReady}
        range={range}
        setRange={setRange}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        openCalendar={openCalendar}
        setOpenCalendar={setOpenCalendar}
        calendarMonth={calendarMonth}
        setCalendarMonth={setCalendarMonth}
        calendarRef={calendarRef}
        syncing={syncing}
        runSync={runSync}
        formatBalance={formatBalance}
        BINANCE_YEAR_OPTIONS={BINANCE_YEAR_OPTIONS}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)]">
        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Broker workspace</span>
          <h2 className="text-lg font-bold text-[var(--heading)] tracking-tight m-0">Exact Sync</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Select a sync-capable account to continue.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-full bg-[var(--surface-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
            {connections.length} saved account{connections.length === 1 ? '' : 's'}
          </span>
          {error ? <span className="text-xs font-semibold text-rose-500" role="alert">{error}</span> : null}
        </div>
      </div>

      {loading ? <div className="py-8 text-center text-xs text-[var(--text-muted)]" role="status">Loading saved accounts...</div> : null}
      {!loading && !error && connections.length === 0 ? <div className="py-8 text-center text-xs text-[var(--text-muted)]">No saved broker accounts yet.</div> : null}
      {!loading && connections.length > 0 ? (
        <div className="flex flex-col divide-y divide-[var(--divider-strong)] border border-[var(--divider-strong)] rounded-xl bg-[var(--bg-card)] overflow-y-auto max-h-[clamp(280px,calc(100dvh-330px),580px)] overscroll-contain shadow-xs">
          {connections.map((connection) => {
            const syncState = getSyncState(connection);
            return (
              <button
                type="button"
                className={`grid grid-cols-[minmax(220px,1.4fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] items-center gap-4 px-4 py-3.5 text-left border-0 bg-transparent transition-colors ${
                  syncState.selectable ? 'hover:bg-[var(--surface-subtle)] cursor-pointer' : 'opacity-60 cursor-not-allowed'
                }`}
                key={connection.rowId}
                disabled={!syncState.selectable}
                onClick={() => setSelectedId(connection.rowId)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center size-9 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-bold text-[var(--text-secondary)]" aria-hidden="true">
                    {connection.brokerLogoPath ? <img src={connection.brokerLogoPath} alt="" className="size-5 object-contain" /> : String(connection.brokerName || 'Broker').slice(0, 3).toUpperCase()}
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-sm font-bold text-[var(--heading)] truncate">{connection.accountName || connection.brokerName}</strong>
                    <small className="text-[11px] text-[var(--text-muted)] truncate">{connection.brokerName}{connection.accountEnvironment ? ` - ${connection.accountEnvironment}` : ''}{connection.externalAccountId && connection.brokerSlug !== 'binance' ? ` - #${connection.externalAccountId}` : ''}</small>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Balance</span>
                  <strong className="text-xs font-bold text-[var(--heading)]">{formatBalance(connection.accountBalance, connection.accountCurrency)}</strong>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Last sync</span>
                  <strong className="text-xs font-bold text-[var(--heading)]">{formatDate(connection.lastSyncedAt)}</strong>
                </div>
                <div>
                  <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    syncState.tone === 'active'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : syncState.tone === 'failed'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : syncState.tone === 'unavailable'
                          ? 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--divider-strong)]'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {syncState.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
