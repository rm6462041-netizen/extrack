import api from '../../../utils/common/serve';

export const instrumentDigitsCache = new Map();

export const getDatabaseInstrumentDigits = (symbol) => {
  const key = String(symbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!key) return Promise.resolve(null);
  if (!instrumentDigitsCache.has(key)) {
    instrumentDigitsCache.set(key, api.get('/instruments', { params: { search: key } })
      .then(({ data }) => {
        const instruments = Array.isArray(data?.instruments) ? data.instruments : Array.isArray(data) ? data : [];
        const match = instruments.find((item) => (
          String(item?.symbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase() === key ||
          String(item?.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase() === key
        ));
        const digits = Number(match?.digits ?? match?.priceDigits ?? match?.precision);
        return Number.isInteger(digits) && digits >= 0 && digits <= 8 ? digits : null;
      })
      .catch(() => null));
  }
  return instrumentDigitsCache.get(key);
};

export const readInstrumentDigits = (digitsBySymbol, symbol) => (
  digitsBySymbol[String(symbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase()]
);

export const countDecimalDigits = (value) => {
  const text = String(value ?? '');
  if (!text || text.includes('e') || text.includes('E')) return 0;
  const decimalPart = text.split('.')[1] || '';
  return decimalPart.replace(/0+$/, '').length;
};

export const inferPriceDigits = (tick, bid, ask) => {
  const configured = Number(tick?.priceDigits ?? tick?.digits ?? tick?.precision);
  if (Number.isFinite(configured) && configured >= 0 && configured <= 8) {
    return Math.min(configured, 8);
  }
  const inferred = Math.min(Math.max(
    countDecimalDigits(tick?.bid ?? bid),
    countDecimalDigits(tick?.ask ?? ask),
    countDecimalDigits(tick?.last ?? tick?.price)
  ), 8);

  if (inferred > 0) return inferred;
  return null;
};
