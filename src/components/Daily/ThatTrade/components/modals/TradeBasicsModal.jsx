import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownSelect } from "@/components/Common/base/dropdown/dropdown";
import LegacyIcon from "@/components/Common/LegacyIcon/LegacyIcon";
import api from "@/utils/common/serve";
import { getUserError } from "@/utils/common/errors";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";

export default function TradeBasicsModal({
  isOpen,
  onClose,
  trade,
  reviewValues,
  onTradeUpdated,
  basicsForm: externalBasicsForm,
  setBasicsForm: externalSetBasicsForm,
  onSave: externalOnSave,
  isSaving: externalIsSaving,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useAppDialog();

  const getInitialForm = useCallback(() => {
    const sl = reviewValues?.stop_loss !== undefined
      ? reviewValues.stop_loss
      : (trade?.stop_loss ?? "");
    const tp = reviewValues?.take_profit !== undefined
      ? reviewValues.take_profit
      : (trade?.take_profit ?? "");

    return {
      quantity: trade?.quantity ?? "",
      price: trade?.price ?? trade?.entry_price ?? "",
      exit_price: trade?.exit_price ?? "",
      side: (trade?.side || trade?.trade_type || "BUY").toUpperCase(),
      stop_loss: sl,
      take_profit: tp,
    };
  }, [trade, reviewValues]);

  const [internalBasicsForm, setInternalBasicsForm] = useState(getInitialForm);
  const [internalIsSaving, setInternalIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInternalBasicsForm(getInitialForm());
    }
  }, [isOpen, trade, getInitialForm]);

  if (!isOpen) return null;

  const currentForm = externalBasicsForm !== undefined ? externalBasicsForm : internalBasicsForm;
  const isSaving = externalIsSaving !== undefined ? externalIsSaving : internalIsSaving;

  const handleFieldChange = (field, value) => {
    const updated = { ...currentForm, [field]: value };
    if (typeof externalSetBasicsForm === "function") {
      externalSetBasicsForm(updated);
    }
    setInternalBasicsForm(updated);
  };

  const saveTradeBasics = async () => {
    if (typeof externalOnSave === "function") {
      return externalOnSave();
    }

    const activeTargetId = trade?.unique_id;
    if (!activeTargetId) return;

    setInternalIsSaving(true);
    try {
      const payload = {
        unique_id: activeTargetId,
        quantity: currentForm.quantity !== "" && currentForm.quantity !== null ? Number(currentForm.quantity) : null,
        entry_price: currentForm.price !== "" && currentForm.price !== null ? Number(currentForm.price) : null,
        exit_price: currentForm.exit_price !== "" && currentForm.exit_price !== null ? Number(currentForm.exit_price) : null,
        side: String(currentForm.side || "BUY").toLowerCase(),
        stop_loss: currentForm.stop_loss !== "" && currentForm.stop_loss !== null ? Number(currentForm.stop_loss) : null,
        take_profit: currentForm.take_profit !== "" && currentForm.take_profit !== null ? Number(currentForm.take_profit) : null,
      };

      const { data } = await api.post("/update-trade", payload);
      if (data?.success) {
        notify("Trade details updated successfully.", "success");
        if (typeof onTradeUpdated === "function" && data.trade) {
          onTradeUpdated(data.trade);
        }
        if (user?.ID) {
          queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        }
        onClose();
      } else {
        throw new Error(data?.error || "Trade details could not be saved");
      }
    } catch (error) {
      notify(getUserError(error, "Trade details could not be saved"), "error");
    } finally {
      setInternalIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--overlay-backdrop)] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-[var(--border-medium)] bg-[var(--bg-card)] sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] m-0 flex items-center gap-2.5">
            <LegacyIcon className="fas fa-edit text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)]" /> Edit Trade Basics
          </h3>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-2xl leading-none text-[var(--text-secondary)] hover:text-[var(--loss-color)] hover:bg-[var(--accent-danger-soft)] transition-all hover:rotate-90 cursor-pointer p-0 bg-transparent border-0" onClick={onClose}>×</button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Side</label>
              <DropdownSelect
                value={currentForm?.side}
                onChange={(e) => handleFieldChange("side", e.target.value)}
                options={[
                  { value: "BUY", label: "Long (BUY)" },
                  { value: "SELL", label: "Short (SELL)" }
                ]}
                ariaLabel="Trade side"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Quantity / Size</label>
              <input
                type="number"
                step="any"
                className="w-full text-xs font-semibold px-2.5 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all"
                value={currentForm?.quantity ?? ""}
                onChange={(e) => handleFieldChange("quantity", e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Entry Price</label>
              <input
                type="number"
                step="any"
                className="w-full text-xs font-semibold px-2.5 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all"
                value={currentForm?.price ?? ""}
                onChange={(e) => handleFieldChange("price", e.target.value)}
                placeholder="Enter entry price"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Exit Price</label>
              <input
                type="number"
                step="any"
                className="w-full text-xs font-semibold px-2.5 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all"
                value={currentForm?.exit_price ?? ""}
                onChange={(e) => handleFieldChange("exit_price", e.target.value)}
                placeholder="Enter exit price"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Stop Loss</label>
              <input
                type="number"
                step="any"
                className="w-full text-xs font-semibold px-2.5 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all"
                value={currentForm?.stop_loss ?? ""}
                onChange={(e) => handleFieldChange("stop_loss", e.target.value)}
                placeholder="Enter stop loss"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Take Profit</label>
              <input
                type="number"
                step="any"
                className="w-full text-xs font-semibold px-2.5 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all"
                value={currentForm?.take_profit ?? ""}
                onChange={(e) => handleFieldChange("take_profit", e.target.value)}
                placeholder="Enter take profit"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-4 pt-4 border-t border-[var(--border-light)]">
            <button className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--surface-muted)] transition-all cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="px-4 py-2 text-xs font-medium text-[var(--button-text)] bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:opacity-90 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={saveTradeBasics}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
