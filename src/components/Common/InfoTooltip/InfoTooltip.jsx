import React from 'react';
import { Info } from '../../../icons/lucideIcons';
import { Tooltip, TooltipTrigger } from '../base/tooltip/tooltip';
import './InfoTooltip.css';

const placementMap = {
  top: 'top',
  bottom: 'bottom',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
  left: 'left',
  right: 'right',
};

function InfoTooltip({ title, text, description, className = '', size = 14, side = 'top' }) {
  const content = text || description || '';
  if (!content && !title) return null;
  const placement = placementMap[side] || 'top';

  return (
    <Tooltip
      title={title || content}
      description={title && content ? content : undefined}
      placement={placement}
      arrow
      delay={0}
      closeDelay={0}
    >
      <TooltipTrigger
        className={`info-tooltip ${className}`.trim()}
        aria-label={String(title || content)}
      >
        <Info size={size} aria-hidden="true" />
      </TooltipTrigger>
    </Tooltip>
  );
}

export default InfoTooltip;


