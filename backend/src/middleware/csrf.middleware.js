const ApiError = require('../utils/ApiError');
const { allowedOrigins } = require('../config/secrets');

const originAllowed = (req, env = process.env) => {
  const allowed = allowedOrigins(env);
  const origin = req.get('Origin');
  const referer = req.get('Referer');

  if (origin) return allowed.includes(origin);
  if (referer) return allowed.some((base) => referer.startsWith(base));
  return env.NODE_ENV !== 'production';
};

const cookieCsrfGuard = (req, _res, next) => {
  if (!originAllowed(req)) {
    throw new ApiError(403, 'Request origin is not allowed');
  }
  next();
};

module.exports = { cookieCsrfGuard, originAllowed };
