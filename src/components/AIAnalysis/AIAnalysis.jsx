import React, { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  CircleDollarSign,
  Search,
  Sigma,
  TrendingDown,
  TrendingUp,
} from "../../icons/lucideIcons";
import api from "../../utils/common/serve";
import { formatCurrency } from "../../utils/user/Currency";
import { getTradeDisplayTime, toTradeDateKey } from "../../utils/trading/tradeTime";
import { getUserError } from "../../utils/common/errors";

const getTradePnl = (trade) => Number(trade?.pnl) || 0;

const getSymbol = (trade) => String(trade?.symbol || "Unknown").toUpperCase();

const formatDateKey = (dateKey) => {
  if (!dateKey) return "Unknown date";
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const summarizeTrades = (tradeList, currencyCode) => {
  const list = Array.isArray(tradeList) ? tradeList : [];
  const pnl = list.reduce((sum, trade) => sum + getTradePnl(trade), 0);
  const wins = list.filter((trade) => getTradePnl(trade) > 0).length;
  const losses = list.filter((trade) => getTradePnl(trade) < 0).length;
  const flats = list.length - wins - losses;
  const bestTrade = list.reduce(
    (best, trade) => (!best || getTradePnl(trade) > getTradePnl(best) ? trade : best),
    null
  );
  const worstTrade = list.reduce(
    (worst, trade) => (!worst || getTradePnl(trade) < getTradePnl(worst) ? trade : worst),
    null
  );

  return {
    pnl,
    wins,
    losses,
    flats,
    bestTrade,
    worstTrade,
    total: list.length,
    winRate: list.length ? (wins / list.length) * 100 : 0,
    formattedPnl: formatCurrency(pnl, currencyCode),
  };
};

const buildGroupedStats = (trades, currencyCode) => {
  const dayMap = new Map();
  const symbolMap = new Map();

  trades.forEach((trade) => {
    const dateKey = toTradeDateKey(trade) || "unknown";
    const symbol = getSymbol(trade);

    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey).push(trade);

    if (!symbolMap.has(symbol)) symbolMap.set(symbol, []);
    symbolMap.get(symbol).push(trade);
  });

  const days = [...dayMap.entries()]
    .map(([dateKey, dayTrades]) => ({
      dateKey,
      label: formatDateKey(dateKey),
      trades: dayTrades.sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right)),
      ...summarizeTrades(dayTrades, currencyCode),
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));

  const symbols = [...symbolMap.entries()]
    .map(([symbol, symbolTrades]) => ({
      symbol,
      trades: symbolTrades,
      ...summarizeTrades(symbolTrades, currencyCode),
    }))
    .sort((left, right) => Math.abs(right.pnl) - Math.abs(left.pnl));

  return {
    overall: summarizeTrades(trades, currencyCode),
    days,
    symbols,
    bestDay: days.reduce((best, day) => (!best || day.pnl > best.pnl ? day : best), null),
    worstDay: days.reduce((worst, day) => (!worst || day.pnl < worst.pnl ? day : worst), null),
    bestSymbol: symbols.reduce((best, symbol) => (!best || symbol.pnl > best.pnl ? symbol : best), null),
    worstSymbol: symbols.reduce((worst, symbol) => (!worst || symbol.pnl < worst.pnl ? symbol : worst), null),
  };
};

const suggestionPrompts = [
  "What was my worst day?",
  "Show my best day and profit",
  "What is my overall win rate?",
  "Best and worst symbol",
  "How many trades on 01/07/2026?",
];

const cleanAssistantText = (value) => String(value || "")
  .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
  .replace(/\*{2,}/g, "")
  .replace(/^\s*[-*]\s+/gm, "- ")
  .trim();

function AIAnalysis({ trades = [], currencyCode = "USD" }) {
  const normalizedTrades = useMemo(
    () => (Array.isArray(trades) ? trades : []).slice().sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right)),
    [trades]
  );
  const stats = useMemo(() => buildGroupedStats(normalizedTrades, currencyCode), [currencyCode, normalizedTrades]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messageIdRef = useRef(0);
  const hasConversation = messages.length > 0;

  const startNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const askAssistant = async (prompt) => {
    const question = prompt.trim();
    if (!question || isLoading) return;

    const currentMessages = messages;
    messageIdRef.current += 1;
    const messageId = messageIdRef.current;
    const userMessage = { id: `user-${messageId}`, role: "user", content: question };
    const loadingMessage = {
      id: `assistant-${messageId}`,
      role: "assistant",
      content: "Entrack AI is analyzing your trades...",
    };
    const pendingMessages = [...currentMessages, userMessage, loadingMessage];

    setMessages(pendingMessages);
    setInput("");
    setIsLoading(true);

    try {
      const history = currentMessages.map(({ role, content }) => ({ role, content }));
      const { data } = await api.post("/ai-trade-chat", {
        question,
        messages: history,
        currencyCode,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!data?.success) {
        throw new Error(data?.error || "AI chat failed.");
      }

      setMessages((current) => current.map((message) => (
        message.id === loadingMessage.id
          ? { ...message, content: cleanAssistantText(data.reply || "Entrack AI returned an empty reply.") }
          : message
      )));
    } catch (error) {
      const userError = getUserError(error, "AI chat failed.");
      setMessages((current) => current.map((message) => (
        message.id === loadingMessage.id
          ? { ...message, content: userError }
          : message
      )));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askAssistant(input);
  };

  return (
    <section className="ai-assistant">
      <div className="ai-assistant__main">
        <div className="ai-assistant__topbar">
          <button type="button" className="ai-assistant__new-chat" onClick={startNewChat}>
            New Chat
          </button>
          <div className="ai-assistant__context" aria-label="Assistant trade context">
            <span className={stats.overall.pnl >= 0 ? "ai-profit" : "ai-loss"}>
              <CircleDollarSign size={14} />
              {formatCurrency(stats.overall.pnl, currencyCode)}
            </span>
            <span>
              <Sigma size={14} />
              {stats.overall.total} trades
            </span>
            <span>
              <TrendingUp size={14} />
              {stats.bestDay ? formatCurrency(stats.bestDay.pnl, currencyCode) : "-"}
            </span>
            <span>
              <TrendingDown size={14} />
              {stats.worstDay ? formatCurrency(stats.worstDay.pnl, currencyCode) : "-"}
            </span>
          </div>
        </div>

        <div className={`ai-assistant__chat ${hasConversation ? "is-active" : "is-empty"}`}>
          <div className="ai-assistant__messages" aria-live="polite">
            {!hasConversation && (
              <div className="ai-assistant__empty">
                <div className="ai-assistant__spark" aria-hidden="true" />
                <h2>Ask Entrack AI Anything</h2>
                <p>Chat with your private trade journal to find days, P&L, symbols, win rate, risk patterns, best setups, and worst mistakes.</p>

                <div className="ai-assistant__suggestions" aria-label="Suggestions">
                  {suggestionPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => askAssistant(prompt)}>
                      <span>{prompt}</span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>

                <button type="button" className="ai-assistant__library" onClick={() => askAssistant("Give me a complete trading journal summary.")}>
                  <BookOpenCheck size={15} />
                  Trade journal summary
                </button>
              </div>
            )}

            {hasConversation && messages.map((message) => (
              <div key={message.id} className={`ai-assistant-message ai-assistant-message--${message.role}`}>
                {message.role === "assistant" && <div className="ai-assistant-message__mark" aria-hidden="true" />}
                <div className="ai-assistant-message__body">
                  <span className="ai-assistant-message__label">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <p>{message.role === "assistant" ? cleanAssistantText(message.content) : message.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form className="ai-assistant__composer" onSubmit={handleSubmit}>
            <div className="ai-assistant__input-wrap">
              <Search size={16} aria-hidden="true" />
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask: What was my profit on 01/07/2026, worst day, XAUUSD result..."
                rows={2}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    askAssistant(input);
                  }
                }}
              />
            </div>
            <button type="submit" aria-label="Ask Entrack AI" disabled={!input.trim() || isLoading}>
              <ArrowUpRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default AIAnalysis;
