const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../model/User");
const TokenBlacklist = require("../model/TokenBlacklist");
const Session = require("../model/Session");
const asyncHandler = require("express-async-handler");
const apiError = require("../utils/apiError");
const { extractToken, verifyToken } = require("../utils/generateToken");

// Session timeout in minutes (default: 120 minutes = 2 hours)
const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 120;

// @Desc Make sure the user is logged in with enhanced security
exports.requireSignIn = asyncHandler(async (req, res, next) => {
  // 1) Extract token from cookie or header
  const token = extractToken(req);

  if (!token) {
    return next(
      new apiError(
        "You are not logged in. Please login to access this route",
        401
      )
    );
  }

  // 2) Check if token is blacklisted
  const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
  if (isBlacklisted) {
    return next(
      new apiError(
        "Your session has been invalidated. Please login again",
        401
      )
    );
  }

  // 3) Verify token and handle expiration
  let decoded;
  try {
    decoded = verifyToken(token, 'access');
  } catch (err) {
    if (err.message.includes('expired')) {
      return next(
        new apiError(
          "Your session has expired. Please login again",
          401
        )
      );
    } else if (err.message.includes('Invalid')) {
      return next(
        new apiError(
          "Invalid token. Please login again",
          401
        )
      );
    }
    return next(new apiError(err.message, 401));
  }

  // 4) Check if user exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new apiError(
        "The user that belongs to this token no longer exists",
        401
      )
    );
  }

  // 5) Check token version (invalidates all tokens if password changed)
  if (decoded.tokenVersion !== undefined && !user.isTokenVersionValid(decoded.tokenVersion)) {
    // Blacklist this token
    await TokenBlacklist.blacklistToken(
      token,
      user._id,
      new Date(decoded.exp * 1000),
      'password_change'
    );

    return next(
      new apiError(
        "Your password was changed. Please login again",
        401
      )
    );
  }

  // 6) Check if user is blocked
  if (user.isBlocked) {
    return next(
      new apiError(
        "Your account has been blocked. Contact support for assistance",
        403
      )
    );
  }

  // 7) Check if account is locked due to failed login attempts
  if (user.isLocked) {
    const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    return next(
      new apiError(
        `Your account is temporarily locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes`,
        403
      )
    );
  }

  // 8) Find and update session activity
  const session = await Session.findOne({
    token,
    userId: user._id,
    isActive: true,
  });

  if (session) {
    // Check for session inactivity timeout
    if (session.isInactive(SESSION_TIMEOUT_MINUTES)) {
      // Invalidate the session
      await session.invalidate('inactivity_timeout');

      return next(
        new apiError(
          `Your session expired due to ${SESSION_TIMEOUT_MINUTES} minutes of inactivity. Please login again`,
          401
        )
      );
    }

    // Update last activity
    await session.updateActivity();
  }

  // 9) Save the user into req object
  req.user = user;
  req.token = token;
  req.session = session;

  next();
});

// @Desc Authorization - check if user has permission
exports.alowedTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new apiError("You are not allowed to access this route", 403)
      );
    }
    next();
  };

// @desc Check if user is blocked
exports.isBlocked = (req, res, next) => {
  if (req.user.isBlocked) {
    return next(
      new apiError(
        "Account blocked. It looks like your account has been blocked",
        403
      )
    );
  }

  next();
};

// @Desc Optional authentication - attach user if token exists, but don't reject if missing
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  // 1) Extract token from cookie or header
  const token = extractToken(req);

  // If no token, continue without user
  if (!token) {
    return next();
  }

  try {
    // 2) Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      return next(); // Continue without user
    }

    // 3) Verify token
    const decoded = verifyToken(token, 'access');

    if (decoded) {
      // 4) Check if user exists
      const user = await User.findById(decoded.id);

      if (user && !user.isBlocked && !user.isLocked) {
        // 5) Verify token version
        if (decoded.tokenVersion === undefined || user.isTokenVersionValid(decoded.tokenVersion)) {
          // 6) Save the user into req object
          req.user = user;
          req.token = token;

          // Update session activity if exists
          const session = await Session.findOne({ token, userId: user._id, isActive: true });
          if (session && !session.isInactive(SESSION_TIMEOUT_MINUTES)) {
            await session.updateActivity();
            req.session = session;
          }
        }
      }
    }
  } catch (err) {
    // Token is invalid or expired, but we don't reject - just continue without user
    console.log("Optional auth token verification failed:", err.message);
  }

  next();
});
