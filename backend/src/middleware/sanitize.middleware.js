const { stripHtml } = require('../utils/sanitize');

const SKIP_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword']);

const sanitizeValue = (value, key) => {
  if (SKIP_KEYS.has(key)) return value;
  if (typeof value === 'string') return stripHtml(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey)])
    );
  }
  return value;
};

const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = sanitizeBody;
