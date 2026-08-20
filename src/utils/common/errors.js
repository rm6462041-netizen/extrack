export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to perform this action.",
  VALIDATION_FAILED: 'Please check the details and try again.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again.',
  MARKET_DATA_UNAVAILABLE: 'Unable to load data right now. Please try again.',
  CHART_DATA_UNAVAILABLE: 'Unable to load data right now. Please try again.',
  LIVE_FEED_UNAVAILABLE: 'Unable to load data right now. Please try again.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

const FORBIDDEN_PATTERNS = /\b(?:cloudflare|r2|s3|bucket|object storage|archive|backend|server storage|sql|database (?:table|schema)?|internal endpoint|worker queue|sync job|import job|postgres|pg_|select|insert|update|delete|from|where|join|unique constraint|foreign key|syntaxerror|typeerror|referenceerror|stack|trace|localhost|node_modules|axioserror)\b/i;

export function isSafeErrorMessage(msg) {
  if (typeof msg !== 'string') return false;
  const trimmed = msg.trim();
  if (!trimmed || trimmed.length > 256) return false;
  if (FORBIDDEN_PATTERNS.test(trimmed)) return false;
  if (trimmed.includes('at ') && trimmed.includes('.js')) return false;
  if (trimmed.includes('[object Object]')) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

export function getUserError(error, fallbackMessage = DEFAULT_MESSAGE) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code || error?.code;
  const rawMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;

  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (status === 401) return ERROR_MESSAGES.AUTH_REQUIRED;
  if (status === 403) return ERROR_MESSAGES.FORBIDDEN;
  if (status === 408 || code === 'ECONNABORTED') return ERROR_MESSAGES.REQUEST_TIMEOUT;
  if (status === 429) return ERROR_MESSAGES.RATE_LIMITED;
  if (status >= 500) return fallbackMessage || DEFAULT_MESSAGE;

  if (typeof rawMessage === 'string' && isSafeErrorMessage(rawMessage)) {
    return rawMessage.trim();
  }

  return fallbackMessage || DEFAULT_MESSAGE;
}

export const CHART_ERROR_MESSAGE = ERROR_MESSAGES.CHART_DATA_UNAVAILABLE;
export const LIVE_FEED_ERROR_MESSAGE = ERROR_MESSAGES.LIVE_FEED_UNAVAILABLE;
