import { useEffect, useRef, useCallback, useMemo } from "react";
import api from "@/utils/common/serve";

export function useTradeDraftSync({ targetId, onRestoredDraft } = {}) {
  const draftKey = useMemo(() => (targetId ? `trade_draft_${targetId}` : null), [targetId]);
  const pendingDraftRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const flushDraftToBackend = useCallback(async (reason = "manual") => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    let draft = pendingDraftRef.current;
    if (!draft && typeof localStorage !== "undefined" && draftKey && localStorage.getItem(draftKey)) {
      try {
        draft = JSON.parse(localStorage.getItem(draftKey));
      } catch {}
    }

    if (!draft || !Object.keys(draft).length) return;

    const idToUse = draft.unique_id || targetId;
    if (!idToUse) return;

    const payload = { ...draft, unique_id: idToUse };
    console.info(`[DRAFT-SYNC] Processing sync (${reason})`);

    pendingDraftRef.current = null;
    const payloadString = JSON.stringify(payload);

    if ((reason === "unload" || reason === "visibilitychange") && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const blob = new Blob([payloadString], { type: "application/json" });
        navigator.sendBeacon((api.defaults?.baseURL || "") + "/update-trade", blob);
      } catch {
        console.warn("[DRAFT-SYNC] sendBeacon dispatch attempted");
      }
    }

    try {
      const { data } = await api.post("/update-trade", payload, { keepalive: true });
      if (data && data.success) {
        console.info("[DRAFT-SYNC] DB save success. Clearing local storage draft.");
        if (draftKey && typeof localStorage !== "undefined") {
          localStorage.removeItem(draftKey);
        }
        return data;
      } else {
        pendingDraftRef.current = draft;
      }
    } catch {
      console.warn("[DRAFT-SYNC] Sync attempt deferred");
      pendingDraftRef.current = draft;
    }
  }, [draftKey, targetId]);

  const saveLocalDraft = useCallback((updates) => {
    if (!draftKey || !targetId) return;

    // 1. Instant LocalStorage Backup (Every Keystroke) with updated_at timestamp
    const currentDraft = pendingDraftRef.current || {};
    const merged = {
      ...currentDraft,
      ...updates,
      unique_id: targetId,
      updated_at: Date.now(),
    };
    pendingDraftRef.current = merged;

    try {
      localStorage.setItem(draftKey, JSON.stringify(merged));
    } catch (e) {
      console.warn("[DRAFT-BACKUP] localStorage write warning:", e);
    }

    // 2. 3-Second Inactivity Debouncer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      flushDraftToBackend("debounce_3s");
    }, 3000);
  }, [draftKey, targetId, flushDraftToBackend]);

  // 3. visibilitychange + 4. beforeunload & pagehide sync
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (pendingDraftRef.current) {
        flushDraftToBackend("unload");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pendingDraftRef.current) {
        flushDraftToBackend("visibilitychange");
      }
    };

    window.addEventListener("beforeunload", handleUnloadOrHide);
    window.addEventListener("pagehide", handleUnloadOrHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleUnloadOrHide);
      window.removeEventListener("pagehide", handleUnloadOrHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      handleUnloadOrHide();
    };
  }, [flushDraftToBackend]);

  const restoredKeysRef = useRef(new Set());
  const onRestoredDraftRef = useRef(onRestoredDraft);
  onRestoredDraftRef.current = onRestoredDraft;

  // 5. Restore pending draft on mount (LocalStorage as Source of Truth)
  useEffect(() => {
    if (!draftKey || restoredKeysRef.current.has(draftKey)) return;
    restoredKeysRef.current.add(draftKey);

    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(draftKey) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && Object.keys(parsed).length) {
          console.info("[DRAFT-RESTORE] Found pending localStorage draft. Loading and silently syncing to DB.");
          pendingDraftRef.current = parsed;

          if (typeof onRestoredDraftRef.current === "function") {
            onRestoredDraftRef.current(parsed);
          }

          // Silently sync restored draft to DB and clear localStorage on success
          flushDraftToBackend("restore_mount");
        }
      } catch (e) {
        console.warn("[DRAFT-RESTORE] Restore draft error:", e);
      }
    }
  }, [draftKey, flushDraftToBackend]);

  return {
    saveLocalDraft,
    flushDraftToBackend,
  };
}

export default useTradeDraftSync;
