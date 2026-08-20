import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from '../../../icons/lucideIcons';
import './CustomTimePicker.css';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

function splitTime(value) {
  const [rawHour = '00', rawMinute = '00'] = String(value || '').split(':');
  const hour = HOURS.includes(rawHour) ? rawHour : '00';
  const minute = MINUTES.includes(rawMinute) ? rawMinute : '00';

  return { hour, minute };
}

function formatNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function CustomTimePicker({
  id,
  value,
  onChange,
  className = '',
  ariaLabel = 'Select time',
  inline = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const { hour, minute } = useMemo(() => splitTime(value), [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!inline && !open) return;
    [hourRef.current, minuteRef.current].forEach((selected) => {
      const list = selected?.parentElement;
      if (list) list.scrollTop += selected.getBoundingClientRect().top - list.getBoundingClientRect().top - (list.clientHeight - selected.offsetHeight) / 2;
    });
  }, [hour, inline, minute, open]);

  const emitChange = (nextHour, nextMinute) => {
    onChange?.(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className={`custom-time-picker ${inline ? 'custom-time-picker--inline' : ''} ${className}`.trim()} ref={wrapperRef}>
      {!inline ? <button
        type="button"
        id={id}
        className="custom-time-picker__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <Clock size={14} aria-hidden="true" />
        <span>{hour}:{minute}</span>
      </button> : null}

      {inline || open ? (
        <div className={inline ? 'custom-time-picker__inline' : 'custom-time-picker__popover'} role={inline ? 'group' : 'dialog'} aria-label={ariaLabel}>
          {inline ? <div className="custom-time-picker__inline-heading"><Clock size={14} aria-hidden="true" /><span>Time</span><strong>{hour}:{minute}</strong></div> : null}
          <div className="custom-time-picker__columns">
            <div className="custom-time-picker__column" aria-label="Hours">
              <span className="custom-time-picker__column-label">Hour</span>
              <div className="custom-time-picker__options">
                {HOURS.map((option) => (
                  <button
                    key={option}
                    ref={option === hour ? hourRef : null}
                    type="button"
                    className={option === hour ? 'is-selected' : ''}
                    onClick={() => emitChange(option, minute)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-time-picker__column" aria-label="Minutes">
              <span className="custom-time-picker__column-label">Min</span>
              <div className="custom-time-picker__options">
                {MINUTES.map((option) => (
                  <button
                    key={option}
                    ref={option === minute ? minuteRef : null}
                    type="button"
                    className={option === minute ? 'is-selected' : ''}
                    onClick={() => emitChange(hour, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!inline ? <div className="custom-time-picker__actions">
            <button type="button" onClick={() => emitChange(...formatNow().split(':'))}>
              Now
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Done
            </button>
          </div> : null}
        </div>
      ) : null}
    </div>
  );
}
