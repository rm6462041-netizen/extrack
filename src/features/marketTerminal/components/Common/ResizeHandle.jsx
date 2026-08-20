import React from 'react';

export default function ResizeHandle({ axis, label, onPointerDown, className = '' }) {
  const isVertical = axis === 'vertical';
  return (
    <button
      aria-label={label}
      className={`block w-full h-full min-w-0 min-h-0 border-0 bg-[var(--border-light)] p-0 transition-colors duration-150 z-[5] hover:bg-[var(--purple,#2962ff)] focus-visible:bg-[var(--purple,#2962ff)] focus-visible:outline-none ${
        isVertical ? 'cursor-col-resize' : 'cursor-row-resize'
      } ${className}`}
      onPointerDown={onPointerDown}
      type="button"
    />
  );
}

