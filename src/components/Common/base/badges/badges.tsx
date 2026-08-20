import type { FC, ReactNode } from "react";
import { cx } from "@/utils/cx";

export interface BadgeProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  color?: "gray" | "brand" | "error" | "warning" | "success" | "blue-gray" | "blue" | "indigo" | "purple" | "pink" | "orange";
  type?: "pill-color" | "pill-outline" | "badge-color" | "badge-modern" | "modern";
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  children,
  size = "sm",
  color = "gray",
  className,
}) => {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center font-semibold rounded-full",
        size === "sm" && "px-1.5 py-0.2 text-[11px] min-w-[18px] h-[18px]",
        size === "md" && "px-2 py-0.5 text-xs min-w-[20px] h-[20px]",
        size === "lg" && "px-2.5 py-1 text-sm min-w-[24px] h-[24px]",
        color === "gray" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        color === "brand" && "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        color === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        className
      )}
    >
      {children}
    </span>
  );
};

export const BadgeWithDot: FC<BadgeProps> = ({
  children,
  size = "sm",
  color = "success",
  className,
}) => {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-0.5 text-xs",
        color === "success" && "bg-emerald-50 border-emerald-200/80 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-300",
        color === "gray" && "bg-gray-50 border-gray-200/80 text-gray-700 dark:bg-gray-900/40 dark:border-gray-800 dark:text-gray-300",
        color === "brand" && "bg-blue-50 border-blue-200/80 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300",
        className
      )}
    >
      <span
        className={cx(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          color === "success" && "bg-emerald-500",
          color === "gray" && "bg-gray-500",
          color === "brand" && "bg-blue-500"
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  );
};
