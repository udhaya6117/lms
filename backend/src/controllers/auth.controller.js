const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newTokenId,
  cookieOptions,
} = require('../utils/tokens');

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, cookieOptions());
};

const issueTokens = async (user, res) => {
  const tokenId = newTokenId();
  const refreshToken = signRefreshToken(user, tokenId);
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenId = tokenId;
  await user.save({ validateBeforeSave: false });
  setRefreshCookie(res, refreshToken);
  return {
    accessToken: signAccessToken(user),
    user: user.toSafeJSON(),
  };
};

const register = asyncHandler(async (req, res) => {
  const exists = await User.findOne({ email: req.body.email });
  if (exists) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: 'student',
  });
  const payload = await issueTokens(user, res);
  res.status(201).json({ success: true, data: payload });
});

const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select(
    '+password +refreshTokenHash +refreshTokenId'
  );
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account is disabled');
  }
  const payload = await issueTokens(user, res);
  res.json({ success: true, data: payload });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError(401, 'Refresh token missing');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash +refreshTokenId');
  if (
    !user ||
    !user.isActive ||
    user.refreshTokenId !== payload.tokenId ||
    user.refreshTokenHash !== hashToken(token)
  ) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokens = await issueTokens(user, res);
  res.json({ success: true, data: tokens });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { refreshTokenHash: 1, refreshTokenId: 1 } }
    );
  }
  res.clearCookie('refreshToken', { ...cookieOptions(), maxAge: 0 });
  res.json({ success: true, data: { message: 'Logged out' } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

module.exports = { register, login, refresh, logout, me };
