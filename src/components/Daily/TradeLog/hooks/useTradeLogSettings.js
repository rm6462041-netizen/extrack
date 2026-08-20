import { useState, useEffect } from "react";
import api from "@/utils/common/serve";
import { saveUserSettings } from "@/utils/user/userSettings";
import { limitVisibleColumns } from "@/utils/common/limitVisibleColumns";
import {
  COLUMN_OPTIONS,
  MAX_VISIBLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
} from "../constants/tradeLogColumns";
import {
  DEFAULT_FILTERS,
  ROWS_PER_PAGE_OPTIONS,
} from "../constants/tradeLogFilters";

export function useTradeLogSettings() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user settings on mount with backward compatibility
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/settings");
        const data = res.data;

        if (data.success && data.settings && isMounted) {
          const settings = data.settings.tradeLog || data.settings;

          if (settings.filters) {
            setFilters({ ...DEFAULT_FILTERS, ...settings.filters });
          }

          if (settings.columns) {
            setVisibleColumns(
              limitVisibleColumns(
                COLUMN_OPTIONS,
                { ...DEFAULT_VISIBLE_COLUMNS, ...settings.columns },
                MAX_VISIBLE_COLUMNS
              )
            );
          }

          if (Number.isInteger(settings.currentMonth)) {
            setCurrentMonth(settings.currentMonth);
          }

          if (Number.isInteger(settings.currentYear)) {
            setCurrentYear(settings.currentYear);
          }

          if (ROWS_PER_PAGE_OPTIONS.includes(Number(settings.rowsPerPage))) {
            setRowsPerPage(Number(settings.rowsPerPage));
          }

          if (settings.dateRange) {
            setDateRange({
              from: settings.dateRange.from || "",
              to: settings.dateRange.to || "",
            });
          }
        }
      } catch {
        // Defaults remain active if saved settings cannot be loaded.
      } finally {
        if (isMounted) {
          setSettingsLoaded(true);
          setTimeout(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          }, 300);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced saving of user settings (500ms) synced to tradeLog key
  useEffect(() => {
    if (!settingsLoaded) return undefined;

    const timeoutId = setTimeout(() => {
      const settingsPayload = {
        filters,
        columns: visibleColumns,
        currentMonth,
        currentYear,
        dateRange,
        rowsPerPage,
      };

      saveUserSettings({
        tradeLog: settingsPayload,
      }).catch(() => null);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    currentMonth,
    currentYear,
    dateRange,
    filters,
    rowsPerPage,
    settingsLoaded,
    visibleColumns,
  ]);

  return {
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    dateRange,
    setDateRange,
    rowsPerPage,
    setRowsPerPage,
    settingsLoaded,
    isLoading,
    setIsLoading,
  };
}

export default useTradeLogSettings;
