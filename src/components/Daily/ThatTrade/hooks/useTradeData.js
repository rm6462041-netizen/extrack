import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/utils/common/serve";

export function useTradeData({ trades = [] } = {}) {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [fetchedTrade, setFetchedTrade] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedIdRef = useRef(null);

  const initialTrade = useMemo(() => {
    if (location.state?.tradeData && String(location.state.tradeData?.unique_id || "") === String(uniqueId)) {
      return location.state.tradeData;
    }
    if (!uniqueId || uniqueId === "undefined" || !Array.isArray(trades)) return null;
    return trades.find((t) => String(t?.unique_id || "") === String(uniqueId)) || null;
  }, [location.state?.tradeData, uniqueId, trades]);

  const trade = fetchedTrade || initialTrade;
  const targetId = (uniqueId && uniqueId !== "undefined") ? uniqueId : trade?.unique_id;

  const fetchTradeData = useCallback(async (idToFetch) => {
    if (!idToFetch || idToFetch === "undefined") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.get(`/get-trade/${idToFetch}`);
      if (data?.success && data?.trade) {
        setFetchedTrade(data.trade);
      }
    } catch {
      // Trade details could not be fetched
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeId = (uniqueId && uniqueId !== "undefined") ? uniqueId : initialTrade?.unique_id;
    if (!activeId || activeId === "undefined") {
      setIsLoading(false);
      return;
    }

    if (fetchedIdRef.current !== activeId) {
      fetchedIdRef.current = activeId;
      fetchTradeData(activeId);
    }
  }, [uniqueId, initialTrade?.unique_id, fetchTradeData]);

  const goBack = useCallback(() => navigate(-1), [navigate]);

  return {
    trade,
    fetchedTrade,
    setFetchedTrade,
    isLoading,
    targetId,
    uniqueId,
    goBack,
    fetchTradeData,
  };
}

export default useTradeData;
