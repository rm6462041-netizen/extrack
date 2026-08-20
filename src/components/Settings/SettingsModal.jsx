import React, { useState, lazy, Suspense } from 'react';
import { Clock, Globe, LayoutDashboard, Search, X } from '../../icons/lucideIcons';
import { TIME_ZONES } from '../../utils/trading/tradeTime';
import { saveUserSettings } from '../../utils/user/userSettings';
import { useAppDialog } from '../../context/AppDialogContext';

import './SettingsModal.css';

const DashboardSettings = lazy(() => import('../Sidebar/DashboardSettings'));

function SettingsModal({ isOpen, onClose, timeZone, setTimeZone }) {
  const [settingsTab, setSettingsTab] = useState('layout');
  const [tzSearch, setTzSearch] = useState('');
  const { notify } = useAppDialog();

  if (!isOpen) return null;

  const handleClose = () => {
    setSettingsTab('layout');
    setTzSearch('');
    onClose();
  };

  const handleTimeZoneSelect = async (tz) => {
    if (tz === timeZone) return;
    const prev = timeZone;
    setTimeZone(tz);
    try {
      await saveUserSettings({ preferences: { timeZone: tz } });
      notify('Timezone updated', 'success');
    } catch {
      setTimeZone(prev);
      notify('Timezone could not be updated', 'error');
    }
  };

  return (
    <div className="profile-overlay">
      <div className="settings-modal">
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">Settings</h2>
          <button
            className="settings-modal__close"
            onClick={handleClose}
            aria-label="Close settings"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="settings-modal__layout">
          {/* Sidebar */}
          <nav className="settings-modal__sidebar">
            <button
              type="button"
              className={`settings-modal__nav-item ${settingsTab === 'layout' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setSettingsTab('layout')}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard Layout</span>
            </button>
            <button
              type="button"
              className={`settings-modal__nav-item ${settingsTab === 'timezone' ? 'settings-modal__nav-item--active' : ''}`}
              onClick={() => setSettingsTab('timezone')}
            >
              <Globe size={16} />
              <span>Timezone</span>
            </button>
          </nav>
          {/* Content */}
          <div className="settings-modal__content">
            {settingsTab === 'layout' && (
              <div className="settings-modal__section">
                <h3 className="settings-modal__section-title">Dashboard Layout</h3>
                <p className="settings-modal__section-desc">Choose how your dashboard components are arranged.</p>
                <Suspense fallback={null}>
                  <DashboardSettings />
                </Suspense>
              </div>
            )}
            {settingsTab === 'timezone' && (
              <div className="settings-modal__section">
                <h3 className="settings-modal__section-title">Timezone</h3>
                <p className="settings-modal__section-desc">Select your preferred timezone for trade timestamps and calendar display.</p>
                <div className="settings-modal__tz-current">
                  <Clock size={14} />
                  <span>Current: <strong>{timeZone}</strong></span>
                </div>
                <div className="settings-modal__tz-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search timezones..."
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    className="settings-modal__tz-search-input"
                  />
                </div>
                <div className="settings-modal__tz-list">
                  {TIME_ZONES
                    .filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
                    .map((tz) => (
                      <button
                        key={tz}
                        type="button"
                        className={`settings-modal__tz-item ${tz === timeZone ? 'settings-modal__tz-item--active' : ''}`}
                        onClick={() => handleTimeZoneSelect(tz)}
                      >
                        <span className="settings-modal__tz-item-label">{tz.replaceAll('_', ' ')}</span>
                        {tz === timeZone && (
                          <span className="settings-modal__tz-item-badge">Active</span>
                        )}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
