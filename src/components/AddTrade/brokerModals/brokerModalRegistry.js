import AngelOneModal from './AngelOneModal';
import BinanceModal from './BinanceModal';
import GenericSyncModal from './GenericSyncModal';

const BROKER_MODALS = {
  'binance_api_sync': BinanceModal,
  'angel-one': AngelOneModal,
};

export function getBrokerModal(selected) {
  if (!selected) return null;
  if (selected.brokerSlug === 'binance' && selected.tradeMethod === 'api_sync') {
    return BROKER_MODALS['binance_api_sync'];
  }
  if (selected.brokerSlug === 'angel-one') {
    return BROKER_MODALS['angel-one'];
  }
  return GenericSyncModal;
}
