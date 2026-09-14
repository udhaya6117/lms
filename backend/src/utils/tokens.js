const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const accessSecret = () => process.env.JWT_ACCESS_SECRET;
const refreshSecret = () => process.env.JWT_REFRESH_SECRET;

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    accessSecret(),
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );

const signRefreshToken = (user, tokenId) =>
  jwt.sign(
    { sub: user._id.toString(), tokenId, type: 'refresh' },
    refreshSecret(),
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '7d' }
  );

const verifyAccessToken = (token) => jwt.verify(token, accessSecret());
const verifyRefreshToken = (token) => jwt.verify(token, refreshSecret());

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const newTokenId = () => crypto.randomUUID();

const cookieSameSite = () => {
  const explicit = String(process.env.COOKIE_SAMESITE || '').toLowerCase();
  if (['lax', 'strict', 'none'].includes(explicit)) return explicit;
  if (process.env.VERCEL) return 'lax';
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
};

const cookieOptions = () => {
  const sameSite = cookieSameSite();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  newTokenId,
  cookieOptions,
};
