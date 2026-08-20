import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_TERMINAL_LAYOUT, TERMINAL_LAYOUT_STORAGE_KEY } from '../utils/marketTerminalConstants';
import { clamp, readStoredTerminalLayout } from '../utils/terminalHelpers';

export const useResizableTerminalLayout = () => {
  const [sizes, setSizes] = useState(readStoredTerminalLayout);

  useEffect(() => {
    try {
      window.localStorage.setItem(TERMINAL_LAYOUT_STORAGE_KEY, JSON.stringify(sizes));
    } catch {
      // Ignore storage failures and keep the current in-memory layout.
    }
  }, [sizes]);

  const beginResize = useCallback((kind, event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSizes = sizes;

    const onPointerMove = (moveEvent) => {
      setSizes((currentSizes) => {
        if (kind === 'watchlist') {
          return {
            ...currentSizes,
            watchlistWidth: clamp(startSizes.watchlistWidth + (moveEvent.clientX - startX), 260, 380),
          };
        }
        if (kind === 'order') {
          return {
            ...currentSizes,
            orderWidth: clamp(startSizes.orderWidth - (moveEvent.clientX - startX), 240, 520),
          };
        }
        return {
          ...currentSizes,
          bottomHeight: clamp(startSizes.bottomHeight - (moveEvent.clientY - startY), 120, 380),
        };
      });
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
  }, [sizes]);

  const resetSizes = useCallback(() => {
    setSizes(DEFAULT_TERMINAL_LAYOUT);
  }, []);

  return { sizes, beginResize, resetSizes };
};

export default useResizableTerminalLayout;
