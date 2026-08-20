import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

import MainContentWrapper from "@/components/Layout/MainContentWrapper";
import PageHeader from "@/components/Layout/PageHeader";
import { paginate } from "@/utils/common/pagination";

import {
  COLUMN_OPTIONS,
  MAX_VISIBLE_COLUMNS,
} from "./constants/tradeLogColumns";
import {
  ROWS_PER_PAGE_OPTIONS,
  DEFAULT_FILTERS,
} from "./constants/tradeLogFilters";

import { useTradeLogSettings } from "./hooks/useTradeLogSettings";
import { useTradeLogFilters } from "./hooks/useTradeLogFilters";
import { useTradeLogSelection } from "./hooks/useTradeLogSelection";
import { useTradeLogActions } from "./hooks/useTradeLogActions";

import { TradeLogSkeleton } from "./components/TradeLogSkeleton/TradeLogSkeleton";
import { TradeLogToolbar } from "./components/TradeLogToolbar/TradeLogToolbar";
import { TradeLogTable } from "./components/TradeLogTable/TradeLogTable";
import { TradeLogEditModal } from "./components/TradeLogEditModal/TradeLogEditModal";

export function TradeLog({ trades = [], currencyCode = "USD" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /* =======================
     LOCAL TRADES STATE
  ======================= */
  const [localTrades, setLocalTrades] = useState(trades);
  useEffect(() => {
    setLocalTrades(trades);
  }, [trades]);

  /* =======================
     SETTINGS & PREFERENCES HOOK
  ======================= */
  const {
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    currentMonth,
    currentYear,
    dateRange,
    setDateRange,
    rowsPerPage,
    setRowsPerPage,
    settingsLoaded,
    isLoading,
  } = useTradeLogSettings();

  /* =======================
     FILTERS & SORTING HOOK
  ======================= */
  const {
    filteredTrades,
    filterValues,
    activeFilterCount,
    hasActiveFilters,
  } = useTradeLogFilters(
    localTrades,
    filters,
    currentMonth,
    currentYear,
    dateRange
  );

  /* =======================
     PAGINATION
  ======================= */
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when any filter, date, or rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentMonth, currentYear, dateRange, filters, rowsPerPage]);

  const pagination = useMemo(
    () => paginate(filteredTrades, currentPage, rowsPerPage),
    [currentPage, filteredTrades, rowsPerPage]
  );

  /* =======================
     SELECTION HOOK
  ======================= */
  const {
    selectedUniqueIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelectTrade,
  } = useTradeLogSelection(pagination?.rows);

  /* =======================
     ACTIONS HOOK
  ======================= */
  const {
    openActionMenuId,
    editingTrade,
    setEditingTrade,
    editForm,
    setEditForm,
    isSavingEdit,
    handleTradeClick,
    handleCopyTrade,
    handleDownloadTrade,
    handleDeleteTrade,
    handleOpenEditModal,
    handleSaveEdit,
  } = useTradeLogActions(setLocalTrades, user, queryClient);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const selectedColumnCount = Object.values(visibleColumns || {}).filter(Boolean).length;

  /* =======================
     LOADING SKELETON
  ======================= */
  if (isLoading || !settingsLoaded) {
    return <TradeLogSkeleton />;
  }

  /* =======================
     MAIN RENDER
  ======================= */
  return (
    <MainContentWrapper className="flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden box-border pt-0 px-2.5 pb-2.5 max-[768px]:pt-[60px] max-[768px]:px-2 max-[768px]:pb-2 max-[520px]:px-1.5 max-[480px]:pb-[calc(82px+env(safe-area-inset-bottom,0px))]">
      {/* HEADER */}
      <PageHeader
        title="Trade Log"
        onBack={() => navigate(-1)}
        keepVisible
        className="relative z-10 mb-1 shrink-0"
        actions={
          <TradeLogToolbar
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            filters={filters}
            setFilters={setFilters}
            filterValues={filterValues}
            resetFilters={resetFilters}
            dateRange={dateRange}
            setDateRange={setDateRange}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            selectedColumnCount={selectedColumnCount}
            maxColumns={MAX_VISIBLE_COLUMNS}
            columnOptions={COLUMN_OPTIONS}
          />
        }
      />

      {/* TABLE */}
      <TradeLogTable
        filteredTrades={filteredTrades}
        pagination={pagination}
        isAllSelected={isAllSelected}
        toggleSelectAll={toggleSelectAll}
        selectedUniqueIds={selectedUniqueIds}
        toggleSelectTrade={toggleSelectTrade}
        handleTradeClick={handleTradeClick}
        visibleColumns={visibleColumns}
        currencyCode={currencyCode}
        openActionMenuId={openActionMenuId}
        handleOpenEditModal={handleOpenEditModal}
        handleCopyTrade={handleCopyTrade}
        handleDownloadTrade={handleDownloadTrade}
        handleDeleteTrade={handleDeleteTrade}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />

      {/* EDIT MODAL */}
      {editingTrade && (
        <TradeLogEditModal
          editingTrade={editingTrade}
          onClose={() => setEditingTrade(null)}
          editForm={editForm}
          setEditForm={setEditForm}
          handleSaveEdit={handleSaveEdit}
          isSavingEdit={isSavingEdit}
        />
      )}
    </MainContentWrapper>
  );
}

export default TradeLog;
