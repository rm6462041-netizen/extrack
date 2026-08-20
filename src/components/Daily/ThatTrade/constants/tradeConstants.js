export const REVIEW_TAG_OPTIONS = {
  setup: ["Breakout", "Pullback", "Trend Following", "Range", "Reversal", "Scalp", "Support / Resistance"],
  mistakes: ["Late Entry", "Early Exit", "FOMO", "Revenge Trading", "Overtrading", "Moved Stop Loss", "No Confirmation", "Oversized"],
  custom_tags: ["A+ Setup", "News", "London Session", "New York Session", "Asia Session", "High Volatility", "Low Volume"],
};

export const REVIEW_FIELD_LABELS = {
  stop_loss: "Stop loss",
  take_profit: "Profit target",
  setup: "Setup",
  mistakes: "Mistakes",
  custom_tags: "Custom tags",
  trade_quality: "Trade quality",
  trade_rating: "Trade rating",
  execution_score: "Execution scale",
};

export const QUICK_STRATEGIES = [
  { category: "Common", items: ["Breakout", "Pullback", "Trend Following", "Range Trading", "Scalping", "Swing Trading"] },
  { category: "Patterns", items: ["Double Top/Bottom", "Head & Shoulders", "Triangle", "Flag", "Candlestick"] },
];
