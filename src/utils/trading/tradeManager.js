import api from '../common/serve';
import { normalizeTradeForCalculations } from './tradeCalculations';

const normalizeTrade = (trade) => normalizeTradeForCalculations({
  ...trade,
  unique_id: String(trade?.unique_id || trade?.uniqueId || ''),
  source: trade.source || 'manual',
  is_breakeven: Boolean(trade.is_breakeven),
});

export class TradeManager {
  async loadTrades(userId, mode = 'all') {
    const source = mode === 'api' ? 'sync' : mode === 'manual' ? 'manual,file' : null;
    try {
      const query = source ? `?source=${encodeURIComponent(source)}` : '';
      const { data } = await api.get(`/user-trades/${userId}${query}`);
      return Array.isArray(data?.trades) ? data.trades.map(normalizeTrade) : [];
    } catch {
      return [];
    }
  }
}
