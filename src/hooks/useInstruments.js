import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/common/serve';

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export function filterInstruments(instruments, query, limit = 30) {
  const source = Array.isArray(instruments) ? instruments : [];
  const q = String(query || '').trim().toLowerCase();
  return source.filter((item) => !q || `${item.symbol} ${item.name} ${item.displayName} ${(item.searchKeywords || []).join(' ')}`.toLowerCase().includes(q)).slice(0, limit);
}

export function isAllowedInstrumentSymbol(instruments, symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  return Array.isArray(instruments) && instruments.some((item) => item.symbol === normalized);
}

export function useInstruments(search = '', filters = {}) {
  const debouncedSearch = useDebouncedValue(search);
  const category = filters.category || undefined;
  const productType = filters.productType || undefined;
  const productTypes = Array.isArray(filters.productTypes) ? filters.productTypes.join(',') : undefined;
  const limit = Number(filters.limit) || 50;
  return useQuery({
    queryKey: ['instruments', category || 'all', productType || productTypes || 'all', debouncedSearch, limit],
    queryFn: async () => {
      if (Array.isArray(filters.productTypes) && filters.productTypes.length > 0) {
        const perTypeLimit = Math.max(Math.floor(limit / filters.productTypes.length), 50);
        const responses = await Promise.all(filters.productTypes.map((type) => api.get('/instruments', {
          params: { category, productType: type, search: debouncedSearch || undefined, limit: perTypeLimit },
        })));
        return responses.flatMap(({ data }) => Array.isArray(data?.instruments) ? data.instruments : []);
      }
      const { data } = await api.get('/instruments', { params: { category, productType, productTypes, search: debouncedSearch || undefined, limit } });
      return Array.isArray(data?.instruments) ? data.instruments : [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}
