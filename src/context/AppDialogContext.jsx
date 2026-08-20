import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from '../icons/lucideIcons';
import './AppDialogContext.css';

const AppDialogContext = createContext({
  notify: () => {},
  confirm: async () => false,
  prompt: async () => null,
});

const getAlertType = (message) => {
  const text = String(message || '').toLowerCase();

  if (text.includes('error') || text.includes('failed') || text.includes('network') || text.includes('do not')) {
    return 'error';
  }

  if (text.includes('please') || text.includes('missing') || text.includes('required')) {
    return 'warning';
  }

  return 'success';
};

const normalizeMessage = (message) => String(message ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
const ALERT_ICONS = { error: CircleAlert, info: Info, success: CircleCheck, warning: TriangleAlert };
const ALERT_TITLES = { error: 'Action failed', info: 'Heads up', success: 'Saved successfully', warning: 'Check this' };

export function AppDialogProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);
  const confirmResolverRef = useRef(null);
  const promptResolverRef = useRef(null);

  const dismissAlert = useCallback((id) => {
    setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== id));
  }, []);

  const notify = useCallback((message, type) => {
    const alertMessage = normalizeMessage(message);
    if (!alertMessage) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextAlert = {
      id,
      message: alertMessage,
      type: type || getAlertType(alertMessage),
    };

    setAlerts([nextAlert]);
    window.setTimeout(() => dismissAlert(id), 4200);
  }, [dismissAlert]);

  const confirm = useCallback((message, options = {}) => (
    new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmDialog({
        title: options.title || 'Confirm action',
        message: normalizeMessage(message),
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
      });
    })
  ), []);

  const resolveConfirm = useCallback((result) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }

    setConfirmDialog(null);
  }, []);

  const prompt = useCallback((message, options = {}) => (
    new Promise((resolve) => {
      promptResolverRef.current = resolve;
      setPromptDialog({
        title: options.title || 'Enter a value',
        message: normalizeMessage(message),
        value: String(options.value || ''),
        confirmText: options.confirmText || 'Save',
        cancelText: options.cancelText || 'Cancel',
      });
    })
  ), []);

  const resolvePrompt = useCallback((value) => {
    if (promptResolverRef.current) {
      promptResolverRef.current(value);
      promptResolverRef.current = null;
    }
    setPromptDialog(null);
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message) => {
      notify(message);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, [notify]);

  return (
    <AppDialogContext.Provider value={{ notify, confirm, prompt }}>
      {children}

      <div className="app-alert-stack" aria-live="polite" aria-relevant="additions">
        {alerts.map((alert) => (
          <div key={alert.id} className={`app-alert app-alert--${alert.type}`} role={alert.type === 'error' ? 'alert' : 'status'}>
            {React.createElement(ALERT_ICONS[alert.type] || Info, { className: 'app-alert__icon', size: 18, 'aria-hidden': true })}
            <div className="app-alert__content">
              <strong className="app-alert__title">{ALERT_TITLES[alert.type] || ALERT_TITLES.info}</strong>
              <div className="app-alert__message">{alert.message}</div>
            </div>
            <button
              type="button"
              className="app-alert__close"
              aria-label="Dismiss message"
              onClick={() => dismissAlert(alert.id)}
            >
              ×
            </button>
            <span className="app-alert__progress" aria-hidden="true" />
          </div>
        ))}
      </div>

      {confirmDialog && (
        <div className="app-confirm-backdrop" role="presentation" onClick={() => resolveConfirm(false)}>
          <div
            className="app-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm__header">
              <span className="app-confirm__mark" aria-hidden="true"><CircleAlert size={17} /></span>
              <h2 id="app-confirm-title">{confirmDialog.title}</h2>
            </div>
            <p>{confirmDialog.message}</p>
            <div className="app-confirm__actions">
              <button type="button" className="app-confirm__cancel" onClick={() => resolveConfirm(false)}>
                {confirmDialog.cancelText}
              </button>
              <button type="button" className="app-confirm__confirm" onClick={() => resolveConfirm(true)}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptDialog && (
        <div className="app-confirm-backdrop" role="presentation" onClick={() => resolvePrompt(null)}>
          <form
            className="app-confirm app-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-prompt-title"
            onSubmit={(event) => { event.preventDefault(); resolvePrompt(promptDialog.value.trim()); }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm__header">
              <h2 id="app-prompt-title">{promptDialog.title}</h2>
            </div>
            <p>{promptDialog.message}</p>
            <input
              autoFocus
              aria-label={promptDialog.title}
              maxLength={150}
              value={promptDialog.value}
              onChange={(event) => setPromptDialog((current) => ({ ...current, value: event.target.value }))}
            />
            <div className="app-confirm__actions">
              <button type="button" className="app-confirm__cancel" onClick={() => resolvePrompt(null)}>
                {promptDialog.cancelText}
              </button>
              <button type="submit" className="app-confirm__confirm" disabled={!promptDialog.value.trim()}>
                {promptDialog.confirmText}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  return useContext(AppDialogContext);
}
