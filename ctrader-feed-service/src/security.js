const crypto = require('crypto');

const EMPTY_BODY_SHA256 = crypto.createHash('sha256').update('').digest('hex');

function verifyInternalKey(req) {
  const configured = process.env.FEED_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  if (!configured) return true; // If not configured, allow local/dev

  const providedKey = req.get?.('x-internal-api-key') || req.get?.('x-feed-api-key') || req.headers?.['x-internal-api-key'] || req.headers?.['x-feed-api-key'];
  if (providedKey && providedKey === configured) return true;

  // HMAC Signature validation
  const signature = req.get?.('x-feed-signature') || req.headers?.['x-feed-signature'];
  const timestamp = req.get?.('x-feed-timestamp') || req.headers?.['x-feed-timestamp'];
  const nonce = req.get?.('x-feed-nonce') || req.headers?.['x-feed-nonce'];
  const clientId = req.get?.('x-feed-client-id') || req.headers?.['x-feed-client-id'];

  if (signature && timestamp && nonce && clientId) {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    const requestPath = `${parsedUrl.pathname}${parsedUrl.search}`;
    const payload = [timestamp, nonce, clientId, req.method || 'GET', requestPath, EMPTY_BODY_SHA256].join('\n');
    const expectedSignature = crypto.createHmac('sha256', configured).update(payload).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return true;
    }
  }

  return false;
}

function requireInternalKey(req, res, next) {
  const configured = process.env.FEED_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  if (!configured) {
    return next();
  }

  if (!verifyInternalKey(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  return next();
}

module.exports = {
  requireInternalKey,
  verifyInternalKey,
};

