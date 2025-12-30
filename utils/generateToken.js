require("dotenv").config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Create access token (short-lived) with enhanced security
 * @param {string} id - User ID
 * @param {number} tokenVersion - Token version for invalidation
 * @param {Object} metadata - Additional metadata (ip, userAgent)
 * @returns {Object} - { token, expiresAt }
 */
exports.createToken = (id, tokenVersion = 0, metadata = {}) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "2h";
  const expiresAt = new Date(Date.now() + parseExpiration(expiresIn));

  const token = jwt.sign(
    {
      id,
      type: 'access',
      tokenVersion,
      jti: crypto.randomBytes(16).toString('hex'), // Unique token ID
      iat: Math.floor(Date.now() / 1000),
      ...metadata
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  return { token, expiresAt };
};

/**
 * Create refresh token (long-lived) with rotation support
 * @param {string} id - User ID
 * @param {number} tokenVersion - Token version for invalidation
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - { token, expiresAt, tokenId }
 */
exports.createRefreshToken = (id, tokenVersion = 0, metadata = {}) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const expiresAt = new Date(Date.now() + parseExpiration(expiresIn));
  const tokenId = crypto.randomBytes(32).toString('hex');

  const token = jwt.sign(
    {
      id,
      type: 'refresh',
      tokenVersion,
      jti: tokenId,
      iat: Math.floor(Date.now() / 1000),
      ...metadata
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  return { token, expiresAt, tokenId };
};

/**
 * Verify and decode token with enhanced validation
 * @param {string} token - JWT token to verify
 * @param {string} expectedType - Expected token type ('access' or 'refresh')
 * @returns {Object} - Decoded token payload
 */
exports.verifyToken = (token, expectedType = null) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify token type if specified
    if (expectedType && decoded.type !== expectedType) {
      throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

/**
 * Set secure HTTP-only cookies for tokens
 * @param {Object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
exports.setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: parseExpiration(process.env.JWT_EXPIRES_IN || "2h"),
    path: '/',
  });

  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: parseExpiration(process.env.JWT_REFRESH_EXPIRES_IN || "7d"),
    path: '/api/auth/refresh-token', // Only sent to refresh endpoint
  });
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
exports.clearTokenCookies = (res) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/api/auth/refresh-token',
  });
};

/**
 * Extract token from request (cookie or header)
 * @param {Object} req - Express request object
 * @returns {string|null} - Token or null
 */
exports.extractToken = (req) => {
  // Try cookie first (more secure)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // Fall back to Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Parse expiration string to milliseconds
 * @param {string} expiration - Expiration string (e.g., "2h", "7d")
 * @returns {number} - Milliseconds
 */
function parseExpiration(expiration) {
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiration}`);
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

/**
 * Generate CSRF token
 * @returns {string} - CSRF token
 */
exports.generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
