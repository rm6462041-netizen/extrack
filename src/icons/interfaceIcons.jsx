import HomeRounded from '@mui/icons-material/HomeRounded';
import PaidRounded from '@mui/icons-material/PaidRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';

export function SvgIcon({
  size = 24,
  viewBox = '0 0 24 24',
  fill = 'none',
  stroke = 'currentColor',
  strokeWidth = 2,
  className = '',
  style,
  children,
  ...props
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const createSvgIcon = (paths, defaultProps = {}) => {
  return function SvgIconComponent(props) {
    return (
      <SvgIcon {...defaultProps} {...props}>
        {paths}
      </SvgIcon>
    );
  };
};

export const FilterLinesIcon = createSvgIcon(
  <path d="M6 12H18M3 6H21M9 18H15" />
);
export const FilterIcon = FilterLinesIcon;
export const FilterLines = FilterLinesIcon;

export function CurrencyIcon({ size = 24, style, ...props }) {
  return <PaidRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function HomeIcon({ size = 24, style, ...props }) {
  return <HomeRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function TradesIcon({ size = 24, style, ...props }) {
  return <SwapHorizRounded {...props} style={{ fontSize: size, ...style }} />;
}

export const CalendarIcon = createSvgIcon(
  <path d="M21 10H3m13-8v4M8 2v4m-.2 16h8.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 19.72 21 18.88 21 17.2V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C18.72 4 17.88 4 16.2 4H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 6.28 3 7.12 3 8.8v8.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 22 6.12 22 7.8 22Z" />
);

export const AddColumnIcon = createSvgIcon(
  <>
    <path d="M13.75 4.5C13.75 3.53 14.53 2.75 15.5 2.75H19.5C20.47 2.75 21.25 3.53 21.25 4.5V19.5C21.25 20.47 20.47 21.25 19.5 21.25H15.5C14.53 21.25 13.75 20.47 13.75 19.5V4.5Z" fill="currentColor" />
    <path d="M6.25 12.75C6.25 12.2 6.7 11.75 7.25 11.75C7.8 11.75 8.25 12.2 8.25 12.75V15.75H11.25C11.8 15.75 12.25 16.2 12.25 16.75C12.25 17.3 11.8 17.75 11.25 17.75H8.25V20.75C8.25 21.3 7.8 21.75 7.25 21.75C6.7 21.75 6.25 21.3 6.25 20.75V17.75H3.25C2.7 17.75 2.25 17.3 2.25 16.75C2.25 16.2 2.7 15.75 3.25 15.75H6.25V12.75Z" fill="currentColor" />
  </>,
  { strokeWidth: 0, style: { overflow: 'visible' } }
);

export const DoubleChevronLeftIcon = createSvgIcon(
  <path d="M18 17L13 12L18 7M11 17L6 12L11 7" />
);

export const ChevronsLeftIcon = DoubleChevronLeftIcon;

