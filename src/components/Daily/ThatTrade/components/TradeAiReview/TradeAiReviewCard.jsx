import React, { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import LegacyIcon from "@/components/Common/LegacyIcon/LegacyIcon";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/Common/base";
import api from "@/utils/common/serve";
import { getUserError } from "@/utils/common/errors";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";
import { useQueryClient } from "@tanstack/react-query";
import { formatTradeDateTime } from "../../utils/tradeFormatters";

export default function TradeAiReviewCard({
  trade,
  pnlCurrency = "USD",
  screenshots = [],
  onSaveDraft,
}) {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();

  const [aiAnalysis, setAiAnalysis] = useState(trade?.review_summary || "");
  const [aiDraft, setAiDraft] = useState(trade?.review_summary || "");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiEditing, setAiEditing] = useState(false);
  const [reviewSummaryFullscreen, setReviewSummaryFullscreen] = useState(false);

  const reviewSummaryRef = useRef(null);

  useEffect(() => {
    const summary = trade?.review_summary || "";
    setAiAnalysis(summary);
    setAiDraft(summary);
  }, [trade?.review_summary]);

  useEffect(() => {
    const syncFullscreen = () => {
      setReviewSummaryFullscreen(document.fullscreenElement === reviewSummaryRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const generateTradeAnalysis = async () => {
    if (!trade) return;

    setAiError("");
    setAiLoading(true);

    try {
      const { data } = await api.post("/ai-trade-analysis", {
        date: formatTradeDateTime(trade).isoDate,
        selectedUniqueId: trade.unique_id,
        currencyCode: pnlCurrency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        analysisMode: "single-trade",
      });

      if (!data?.success) {
        throw new Error(data?.error || "AI trade analysis failed.");
      }

      const analysisResult = data.analysis || "";
      setAiAnalysis(analysisResult);
      setAiDraft(analysisResult);
      if (user?.ID) queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
      notify("AI review generated successfully.", "success");
    } catch (error) {
      setAiError(getUserError(error, "AI trade analysis failed."));
    } finally {
      setAiLoading(false);
    }
  };

  const saveEditedAnalysis = async () => {
    const trimmed = aiDraft.trim();
    setAiSaving(true);
    try {
      setAiAnalysis(trimmed);
      setAiEditing(false);
      if (onSaveDraft) {
        onSaveDraft({ review_summary: trimmed });
      }
      notify("Review summary updated.", "success");
    } finally {
      setAiSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setAiDraft(aiAnalysis);
    setAiEditing(false);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await reviewSummaryRef.current?.requestFullscreen();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card
      variant="default"
      padding="sm"
      className="min-w-0 flex flex-col min-h-0 flex-1 [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:p-6 [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      ref={reviewSummaryRef}
    >
      <CardHeader className="pb-2.5 mb-2 max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <div className="flex flex-col">
          <CardDescription className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">
            AI post-trade analysis
          </CardDescription>
          <CardTitle className="text-sm font-semibold text-[var(--text-primary)] m-0 mt-0.5 flex items-center gap-2">
            <LegacyIcon className="fas fa-chart-line" /> AI Trade Review
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {aiEditing ? (
            <>
              <button
                className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={handleCancelEdit}
                disabled={aiSaving}
              >
                Cancel
              </button>
              <button
                className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={saveEditedAnalysis}
                disabled={aiSaving}
              >
                {aiSaving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={generateTradeAnalysis}
                disabled={aiLoading}
              >
                {aiLoading ? "Generating..." : "Generate AI review"}
              </button>
              {aiAnalysis && (
                <button
                  className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end"
                  type="button"
                  onClick={() => setAiEditing(true)}
                >
                  Edit
                </button>
              )}
            </>
          )}
          <button
            className="inline-flex w-7.5 h-7.5 items-center justify-center p-0 border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] bg-transparent hover:text-[var(--accent-ink)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
            type="button"
            onClick={toggleFullscreen}
            title={reviewSummaryFullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-label={
              reviewSummaryFullscreen
                ? "Exit review summary fullscreen"
                : "Open review summary fullscreen"
            }
          >
            {reviewSummaryFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>
      {aiError && <div className="text-xs text-[var(--accent-danger)] mb-2">{aiError}</div>}
      <div
        className={`min-h-[96px] max-h-[360px] overflow-y-auto p-3 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 ${
          !aiAnalysis ? "text-[var(--text-secondary)]" : ""
        } ${aiEditing ? "p-0" : ""}`}
      >
        {aiEditing ? (
          <textarea
            className="w-full h-full min-h-[150px] p-3 resize-none border-0 outline-none text-[var(--text-primary)] bg-transparent text-xs leading-relaxed"
            value={aiDraft}
            onChange={(event) => setAiDraft(event.target.value)}
            maxLength={20000}
            aria-label="Edit review summary"
          />
        ) : aiAnalysis ? (
          <pre className="whitespace-pre-wrap font-sans m-0">{aiAnalysis}</pre>
        ) : screenshots && screenshots.length > 0 ? (
          "Generate an AI review of chart structure, timing, execution quality, and improvements."
        ) : (
          "Add an attachment for chart reading, or generate an AI review from the available trade data."
        )}
      </div>
    </Card>
  );
}
