import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from '../../icons/lucideIcons';

function PageHeader({
  title,
  eyebrow,
  actions,
  meta,
  onBack,
  backLabel = 'Back',
  className = '',
  left,
  right,
  keepVisible = false,
  onVisibilityChange,
}) {
  const [hidden, setHidden] = useState(false);
  const previousScrollRef = useRef(0);
  const effectiveHidden = hidden && !keepVisible;
  const classes = ['app-page-header', effectiveHidden && 'app-page-header--hidden', className].filter(Boolean).join(' ');
  const headerLeft = left || (
    <>
      {onBack && (
        <button className="app-back-button" type="button" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="app-back-button__label">{backLabel}</span>
        </button>
      )}
      <div className="app-page-header__title-block">
        {eyebrow && <span className="app-page-header__eyebrow">{eyebrow}</span>}
        {title && <h1 className="app-page-title">{title}</h1>}
        {meta && <span className="app-page-header__meta">{meta}</span>}
      </div>
    </>
  );

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    const getScrollY = () => Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, mainContent?.scrollTop || 0);

    previousScrollRef.current = getScrollY();

    const handleScroll = () => {
      if (keepVisible) {
        setHidden(false);
        return;
      }
      const currentScroll = getScrollY();
      const delta = currentScroll - previousScrollRef.current;

      if (currentScroll <= 8) {
        setHidden(false);
      } else if (delta > 4) {
        setHidden(true);
      } else if (delta < -4) {
        setHidden(false);
      }

      previousScrollRef.current = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    mainContent?.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainContent?.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [keepVisible]);

  useEffect(() => {
    onVisibilityChange?.(effectiveHidden);
  }, [effectiveHidden, onVisibilityChange]);

  return (
    <header className={classes}>
      <div className="app-page-header__left">{headerLeft}</div>
      {(right || actions) && (
        <div className="app-page-header__right !overflow-visible">
          {right || actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
