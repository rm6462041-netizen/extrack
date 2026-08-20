import { formatDisplayDate } from './tradeTime.js';

const EMPTY = '--';
const present = (value) => value !== null && value !== undefined && value !== '';
const first = (object, ...keys) => keys.map((key) => object?.[key]).find(present);
const TYPE_LABELS = { cfd: 'CFD', forex_cfd: 'Forex / CFD', equity: 'Stock / Equity', stock: 'Stock / Equity' };
const title = (value) => present(value)
  ? String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : EMPTY;

export function getInstrumentType(trade) {
  const value = String(first(trade, 'instrumentType', 'instrument_type', 'productType', 'product_type', 'marketType', 'market_type') || '').toLowerCase();
  if (value) return ({ options: 'option', futures: 'future', crypto_spot: 'spot', stock: 'equity' })[value] || value;
  const category = String(trade?.category || '').toLowerCase();
  return ['spot', 'perpetual', 'future', 'option', 'forex', 'cfd', 'forex_cfd', 'stock', 'bond'].includes(category)
    ? category
    : 'unknown';
}

export const formatInstrumentType = (trade) => TYPE_LABELS[getInstrumentType(trade)] || title(getInstrumentType(trade));

export function formatDirection(trade) {
  const side = first(trade, 'side', 'trade_type');
  const direction = first(trade, 'positionDirection', 'position_direction');
  const details = trade?.optionDetails || trade?.product_details || {};
  const optionType = first(details, 'optionType', 'option_type');
  if (getInstrumentType(trade) === 'option' && optionType) return `${title(side)} ${title(optionType)}`;
  return title(direction || side);
}

export function formatQuantity(trade) {
  const quantity = first(trade, 'quantity', 'contracts');
  if (!present(quantity)) return EMPTY;
  const unit = first(trade, 'quantityUnit', 'quantity_unit') || first(trade?.product_details, 'quantityUnit', 'quantity_unit');
  return unit ? `${quantity} ${title(unit)}` : String(quantity);
}

export function formatTradeMoney(value, currency, fallbackCurrency = 'USD') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return EMPTY;
  const code = String(currency || fallbackCurrency || '').trim().toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${code ? `${code} ` : ''}${amount.toFixed(2)}`;
  }
}

const cleanValue = (val) => {
  if (!present(val)) return val;
  const str = String(val).trim();
  if (/^-?\d+\.\d+$/.test(str)) {
    const num = Number(str);
    if (Number.isFinite(num)) return String(num);
  }
  return val;
};

export function getMarketDetailRows(trade) {
  const type = getInstrumentType(trade);
  const details = trade?.optionDetails || trade?.perpetualDetails || trade?.futureDetails || trade?.spotDetails || trade?.marketDetails || trade?.product_details || {};
  const money = (value) => formatTradeMoney(value, first(trade, 'pnlCurrency', 'pnl_currency'));
  const row = (label, value) => ({ label, value });
  let rows = [];

  if (type === 'option') rows = [
    row('Underlying symbol', first(details, 'underlyingSymbol', 'underlying_symbol') || trade.symbol),
    row('Option type', title(first(details, 'optionType', 'option_type'))),
    row('Strike price', cleanValue(first(details, 'strikePrice', 'strike_price'))),
    row('Expiry date', formatDisplayDate(first(details, 'expiryDate', 'expiry_date'))),
    row('Entry premium', money(first(trade, 'entryPrice', 'entry_price', 'price'))),
    row('Exit premium', money(first(trade, 'exitPrice', 'exit_price'))),
    row('Contracts', first(details, 'contracts') || trade.quantity),
    row('Contract multiplier', cleanValue(first(details, 'contractMultiplier', 'contract_multiplier'))),
    row('Lot size', cleanValue(first(details, 'lotSize', 'lot_size'))),
    row('Settlement outcome', title(first(details, 'expirationOutcome', 'expiration_outcome'))),
    row('Implied volatility', first(details, 'impliedVolatility', 'implied_volatility', 'iv')),
    row('Delta', first(details, 'delta')),
    row('Gamma', first(details, 'gamma')),
    row('Theta', first(details, 'theta')),
    row('Vega', first(details, 'vega')),
  ];
  if (type === 'perpetual') rows = [
    row('Leverage', first(details, 'leverage') && `${first(details, 'leverage')}x`),
    row('Margin mode', title(first(details, 'marginMode', 'margin_mode'))),
    row('Liquidation price', cleanValue(first(details, 'liquidationPrice', 'liquidation_price'))),
    row('Funding fee', money(first(details, 'fundingFee', 'funding_fee'))),
    row('Contract type', title(first(details, 'contractType', 'contract_type') || 'perpetual')),
  ];
  if (type === 'future') rows = [
    row('Leverage', first(details, 'leverage') && `${first(details, 'leverage')}x`),
    row('Margin mode', title(first(details, 'marginMode', 'margin_mode'))),
    row('Contract expiry', formatDisplayDate(first(details, 'contractExpiry', 'contract_expiry', 'expiryDate', 'expiry_date'))),
    row('Contract multiplier', cleanValue(first(details, 'contractMultiplier', 'contract_multiplier', 'pnlMultiplier'))),
    row('Settlement price', cleanValue(first(details, 'settlementPrice', 'settlement_price'))),
  ];
  if (type === 'forex' || type === 'cfd') rows = [
    row('Lot size', cleanValue(first(details, 'lotSize', 'lot_size'))),
    row('Leverage', first(details, 'leverage') && `${first(details, 'leverage')}x`),
    row('Commission', money(first(details, 'commission'))),
    row('Swap', money(first(details, 'swap'))),
    row('Contract size', cleanValue(first(details, 'contractSize', 'contract_size'))),
    row('Pip value', cleanValue(first(details, 'pipValue', 'pip_value'))),
    row('Account currency', first(details, 'accountCurrency', 'account_currency')),
  ];
  if (type === 'spot') rows = [
    row('Base asset', first(details, 'baseAsset', 'base_asset')),
    row('Quote asset', first(details, 'quoteAsset', 'quote_asset')),
    row('Executed quantity', cleanValue(first(details, 'executedQuantity', 'executed_quantity'))),
    row('Quote quantity', cleanValue(first(details, 'quoteQuantity', 'quote_quantity'))),
    row('Trading fee', money(first(details, 'tradingFee', 'trading_fee'))),
    row('Fee asset', first(details, 'feeAsset', 'fee_asset')),
  ];

  return rows.filter(({ value }) => present(value) && value !== EMPTY);
}
