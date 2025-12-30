const User = require("../model/User");
const TokenBlacklist = require("../model/TokenBlacklist");
const Session = require("../model/Session");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const {
  createToken,
  createRefreshToken,
  setTokenCookies,
  clearTokenCookies
} = require("../utils/generateToken");
const { validatePassword } = require("../utils/passwordValidator");
const apiError = require("../utils/apiError");

// Helper function to get client metadata
const getClientMetadata = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
};

// @desc Sign Up with Password Validation
exports.signup = asyncHandler(async (req, res, next) => {
  const { firstname, lastname, email, password, phone } = req.body;

  // Validate password strength
  const passwordValidation = validatePassword(password, null, { email, firstname, lastname });
  if (!passwordValidation.isValid) {
    return next(new apiError(passwordValidation.errors.join(', '), 400));
  }

  // Create the user - Always set role as 'user' for frontend signups
  // Admin role should be set manually in database
  const user = await User.create({
    firstname,
    lastname,
    email,
    password,
    phone,
    role: 'user', // Always create as regular user, admin set manually in DB
  });

  if (user) {
    // Get client metadata
    const metadata = getClientMetadata(req);

    // Create access and refresh tokens with version and metadata
    const { token: accessToken, expiresAt: accessExpiresAt } = createToken(
      user._id,
      user.tokenVersion,
      metadata
    );
    const { token: refreshToken, expiresAt: refreshExpiresAt } = createRefreshToken(
      user._id,
      user.tokenVersion,
      metadata
    );

    // Create session record
    await Session.create({
      userId: user._id,
      token: accessToken,
      refreshToken: refreshToken,
      ...metadata,
      expiresAt: accessExpiresAt,
    });

    // Set secure HTTP-only cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      token: accessToken, // Still send in response for localStorage fallback
      refreshToken: refreshToken,
      data: userResponse
    });
  }
});

// @desc Login (for regular users) with Enhanced Security
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    return next(new apiError("Invalid Password or Email", 401));
  }

  // Check if account is locked
  if (user.isLocked) {
    const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    return next(
      new apiError(
        `Account temporarily locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes`,
        403
      )
    );
  }

  // Check if account is blocked
  if (user.isBlocked) {
    return next(new apiError("Your Account has been disabled", 403));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Increment failed login attempts
    await user.incLoginAttempts();
    return next(new apiError("Invalid Password or Email", 401));
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Get client metadata
  const metadata = getClientMetadata(req);

  // Create tokens with version and metadata
  const { token: accessToken, expiresAt: accessExpiresAt } = createToken(
    user._id,
    user.tokenVersion,
    metadata
  );
  const { token: refreshToken, expiresAt: refreshExpiresAt } = createRefreshToken(
    user._id,
    user.tokenVersion,
    metadata
  );

  // Create session record
  await Session.create({
    userId: user._id,
    token: accessToken,
    refreshToken: refreshToken,
    ...metadata,
    expiresAt: accessExpiresAt,
  });

  // Set secure HTTP-only cookies
  setTokenCookies(res, accessToken, refreshToken);

  // Delete password from response
  delete user._doc.password;

  // Send response to client side
  res.status(200).json({
    success: true,
    token: accessToken,
    refreshToken: refreshToken,
    data: user
  });
});

// @desc Admin Login with Enhanced Security
exports.adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new apiError("Invalid Password or Email", 401));
  }

  // Check if user is admin
  if (user.role !== 'admin') {
    return next(new apiError("Access denied. Admin privileges required.", 403));
  }

  // Check if account is locked
  if (user.isLocked) {
    const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    return next(
      new apiError(
        `Account temporarily locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes`,
        403
      )
    );
  }

  if (user.isBlocked) {
    return next(new apiError("Your Account has been disabled", 403));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    await user.incLoginAttempts();
    return next(new apiError("Invalid Password or Email", 401));
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Get client metadata
  const metadata = getClientMetadata(req);

  // Create tokens with version and metadata
  const { token: accessToken, expiresAt: accessExpiresAt } = createToken(
    user._id,
    user.tokenVersion,
    metadata
  );
  const { token: refreshToken, expiresAt: refreshExpiresAt } = createRefreshToken(
    user._id,
    user.tokenVersion,
    metadata
  );

  // Create session record
  await Session.create({
    userId: user._id,
    token: accessToken,
    refreshToken: refreshToken,
    ...metadata,
    expiresAt: accessExpiresAt,
  });

  // Set secure HTTP-only cookies
  setTokenCookies(res, accessToken, refreshToken);

  // Delete password from response
  delete user._doc.password;

  // Send response to client side
  res.status(200).json({
    success: true,
    token: accessToken,
    refreshToken: refreshToken,
    data: user
  });
});

// @desc Get current user (me)
exports.getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return next(new apiError("User not found", 404));
  }

  res.status(200).json({ success: true, data: user });
});

// @desc Update Profile
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone, avatar, firstname, lastname, email } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new apiError("User not found", 404));
  }

  // Update fields if provided
  if (firstname) user.firstname = firstname;
  if (lastname) user.lastname = lastname;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (avatar) user.image = avatar;
  if (name) {
    // If name is provided, split it into firstname and lastname
    const nameParts = name.trim().split(' ');
    user.firstname = nameParts[0];
    user.lastname = nameParts.slice(1).join(' ') || nameParts[0];
  }

  // Save without rehashing password
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      image: user.image,
    },
    { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser
  });
});

// @desc Change Password with Enhanced Security
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new apiError("Please provide current password and new password", 400));
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new apiError("User not found", 404));
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new apiError("Current password is incorrect", 401));
  }

  // Validate new password strength
  const passwordValidation = validatePassword(newPassword, confirmPassword, {
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname
  });

  if (!passwordValidation.isValid) {
    return next(new apiError(passwordValidation.errors.join(', '), 400));
  }

  // Update password (will trigger pre-save hook to hash and increment tokenVersion)
  user.password = newPassword;
  await user.save();

  // Invalidate all existing sessions for this user
  await Session.invalidateAllUserSessions(user._id, 'password_change');

  // Clear current user's cookies
  clearTokenCookies(res);

  res.status(200).json({
    success: true,
    message: "Password changed successfully. Please login again with your new password."
  });
});

// @desc Refresh Token with Rotation
exports.refreshToken = asyncHandler(async (req, res, next) => {
  // Get refresh token from cookie or body
  let refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return next(new apiError("Refresh token is required", 400));
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      return next(new apiError("Refresh token has been invalidated. Please login again", 401));
    }

    // Verify refresh token
    const { verifyToken } = require("../utils/generateToken");
    const decoded = verifyToken(refreshToken, 'refresh');

    if (decoded.type !== 'refresh') {
      return next(new apiError("Invalid token type", 401));
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new apiError("User not found", 404));
    }

    // Verify token version
    if (decoded.tokenVersion !== undefined && !user.isTokenVersionValid(decoded.tokenVersion)) {
      return next(new apiError("Your password was changed. Please login again", 401));
    }

    if (user.isBlocked || user.isLocked) {
      return next(new apiError("Your account has been disabled", 403));
    }

    // Get client metadata
    const metadata = getClientMetadata(req);

    // Blacklist old refresh token (token rotation security)
    await TokenBlacklist.blacklistToken(
      refreshToken,
      user._id,
      new Date(decoded.exp * 1000),
      'token_rotation'
    );

    // Invalidate old session
    await Session.updateOne(
      { refreshToken, userId: user._id },
      { $set: { isActive: false } }
    );

    // Create new access token and refresh token with rotation
    const { token: newAccessToken, expiresAt: accessExpiresAt } = createToken(
      user._id,
      user.tokenVersion,
      metadata
    );
    const { token: newRefreshToken } = createRefreshToken(
      user._id,
      user.tokenVersion,
      metadata
    );

    // Create new session
    await Session.create({
      userId: user._id,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      ...metadata,
      expiresAt: accessExpiresAt,
    });

    // Set new secure cookies
    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.message.includes('expired')) {
      return next(new apiError("Refresh token has expired. Please login again", 401));
    }
    return next(new apiError("Invalid refresh token", 401));
  }
});

// @desc Logout - Invalidate current session
exports.logout = asyncHandler(async (req, res, next) => {
  const token = req.token; // Set by requireSignIn middleware

  if (!token) {
    return next(new apiError("No active session found", 400));
  }

  try {
    // Get token expiration from decoded token
    const { verifyToken } = require("../utils/generateToken");
    const decoded = verifyToken(token);

    // Blacklist the access token
    await TokenBlacklist.blacklistToken(
      token,
      req.user._id,
      new Date(decoded.exp * 1000),
      'logout',
      getClientMetadata(req)
    );

    // Invalidate session
    if (req.session) {
      await req.session.invalidate('logout');
    }

    // Clear cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    return next(new apiError("Logout failed", 500));
  }
});

// @desc Logout from all devices - Invalidate all sessions
exports.logoutAll = asyncHandler(async (req, res, next) => {
  try {
    // Invalidate all sessions for this user
    const sessionsInvalidated = await Session.invalidateAllUserSessions(req.user._id, 'logout_all');

    // Clear current cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: `Logged out from all devices. ${sessionsInvalidated} session(s) invalidated.`
    });
  } catch (error) {
    return next(new apiError("Logout from all devices failed", 500));
  }
});

// @desc Get active sessions for current user
exports.getActiveSessions = asyncHandler(async (req, res, next) => {
  const sessions = await Session.findActiveSessions(req.user._id);

  const sessionData = sessions.map(session => ({
    id: session._id,
    device: session.deviceInfo,
    ipAddress: session.ipAddress,
    location: session.location,
    lastActivity: session.lastActivity,
    createdAt: session.createdAt,
    isCurrent: session.token === req.token
  }));

  res.status(200).json({
    success: true,
    count: sessionData.length,
    data: sessionData
  });
});
