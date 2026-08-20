import React, { useState } from "react";
import LegacyIcon from "@/components/Common/LegacyIcon/LegacyIcon";
import { Card, CardHeader, CardTitle } from "@/components/Common/base";
import Stat from "./Stat";
import { formatDirection, formatInstrumentType, formatQuantity } from "@/utils/trading/tradePresentation";
import { formatPnlValue, formatTimeOnly } from "../../utils/tradeFormatters";
import TradeBasicsModal from "../modals/TradeBasicsModal";
import api from "@/utils/common/serve";
import { getUserError } from "@/utils/common/errors";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";
import { useQueryClient } from "@tanstack/react-query";

export default function TradeBasicsCard({
  trade,
  displayedPnl,
  pnlCurrency = "USD",
  isProfit,
  time,
  date,
  closeDateObj,
  durationMinutes,
  marketDetailRows = [],
  reviewValues,
  onTradeUpdated,
}) {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();

  const [showBasicsModal, setShowBasicsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [basicsForm, setBasicsForm] = useState({
    quantity: "",
    price: "",
    exit_price: "",
    side: "",
    stop_loss: "",
    take_profit: "",
  });

  const handleOpenBasicsModal = () => {
    const sl = reviewValues?.stop_loss !== undefined
      ? reviewValues.stop_loss
      : (trade?.stop_loss ?? "");
    const tp = reviewValues?.take_profit !== undefined
      ? reviewValues.take_profit
      : (trade?.take_profit ?? "");
    setBasicsForm({
      quantity: trade?.quantity ?? "",
      price: trade?.price ?? trade?.entry_price ?? "",
      exit_price: trade?.exit_price ?? "",
      side: (trade?.side || trade?.trade_type || "BUY").toUpperCase(),
      stop_loss: sl,
      take_profit: tp,
    });
    setShowBasicsModal(true);
  };

  const handleSaveBasics = async () => {
    const activeTargetId = trade?.unique_id;
    if (!activeTargetId) return;

    setIsSaving(true);
    try {
      const payload = {
        unique_id: activeTargetId,
        quantity: basicsForm.quantity !== "" && basicsForm.quantity !== null ? Number(basicsForm.quantity) : null,
        entry_price: basicsForm.price !== "" && basicsForm.price !== null ? Number(basicsForm.price) : null,
        exit_price: basicsForm.exit_price !== "" && basicsForm.exit_price !== null ? Number(basicsForm.exit_price) : null,
        side: String(basicsForm.side).toLowerCase(),
        stop_loss: basicsForm.stop_loss !== "" && basicsForm.stop_loss !== null ? Number(basicsForm.stop_loss) : null,
        take_profit: basicsForm.take_profit !== "" && basicsForm.take_profit !== null ? Number(basicsForm.take_profit) : null,
      };

      const { data } = await api.post("/update-trade", payload);
      if (data?.success) {
        notify("Trade details updated successfully.", "success");
        if (data.trade && onTradeUpdated) {
          onTradeUpdated(data.trade);
        }
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        setShowBasicsModal(false);
      } else {
        throw new Error(data?.error || "Trade details could not be saved");
      }
    } catch (error) {
      notify(getUserError(error, "Trade details could not be saved"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card variant="subtle" padding="sm" className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)] m-0 mb-1">Net P&amp;L</p>
          <h2 className={`text-2xl font-bold m-0 ${isProfit ? "text-[var(--profit-color)]" : "text-[var(--loss-color)]"}`}>
            {formatPnlValue(displayedPnl, pnlCurrency)}
          </h2>
        </div>
      </Card>

      <Card variant="default" padding="sm" className="mb-3">
        <CardHeader className="pb-2.5 mb-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <CardTitle className="flex items-center gap-1.5">
            <LegacyIcon className="fas fa-info-circle" /> Trade Basics
          </CardTitle>
          <button
            className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end"
            onClick={handleOpenBasicsModal}
            aria-label="Edit trade basics"
          >
            <LegacyIcon className="fas fa-edit" /> Edit
          </button>
        </CardHeader>
        <div className="flex flex-col">
          <Stat label="Instrument Type" value={formatInstrumentType(trade)} className="row-product" />
          <Stat label="Side" value={formatDirection(trade)} className="row-side" />
          <Stat label="Quantity" value={formatQuantity(trade)} className="row-qty" />
          <Stat label="Entry Price" value={trade?.entry_price ?? trade?.entryPrice ?? trade?.price ?? "--"} className="row-entry" />
          <Stat label="Exit Price" value={trade?.exit_price ?? trade?.exitPrice ?? "--"} className="row-exit" />
          <Stat label="Entry Time" value={time} className="row-time" />
          {closeDateObj && <Stat label="Exit Time" value={formatTimeOnly(closeDateObj)} className="row-exit-time" />}
          <Stat label="Duration" value={durationMinutes ? `${durationMinutes}m` : "--"} className="row-duration" />
          <Stat label="Date" value={date} className="row-date" />
        </div>
      </Card>

      {marketDetailRows && marketDetailRows.length > 0 && (
        <Card variant="default" padding="sm" className="mt-3">
          <CardHeader className="pb-2 mb-2">
            <CardTitle>Market Details</CardTitle>
          </CardHeader>
          <div className="flex flex-col">
            {marketDetailRows.map(({ label, value }) => (
              <Stat key={label} label={label} value={value} />
            ))}
          </div>
        </Card>
      )}

      <TradeBasicsModal
        isOpen={showBasicsModal}
        onClose={() => setShowBasicsModal(false)}
        basicsForm={basicsForm}
        setBasicsForm={setBasicsForm}
        onSave={handleSaveBasics}
        isSaving={isSaving}
      />
    </>
  );
}
