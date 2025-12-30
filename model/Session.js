const mongoose = require("mongoose");

/**
 * Session Schema for Active Session Management
 * Tracks active user sessions with automatic expiration
 */
const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    refreshToken: {
      type: String,
      index: true,
    },

    ipAddress: {
      type: String,
      required: true,
    },

    userAgent: {
      type: String,
    },

    deviceInfo: {
      browser: String,
      os: String,
      device: String,
    },

    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Geographic data
    location: {
      country: String,
      city: String,
      region: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ userId: 1, lastActivity: -1 });

// TTL index to automatically remove expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Update last activity timestamp
 */
SessionSchema.methods.updateActivity = async function () {
  this.lastActivity = new Date();
  await this.save();
};

/**
 * Invalidate this session
 */
SessionSchema.methods.invalidate = async function (reason = "logout") {
  this.isActive = false;
  await this.save();

  // Also blacklist the token
  const TokenBlacklist = mongoose.model("TokenBlacklist");
  await TokenBlacklist.blacklistToken(
    this.token,
    this.userId,
    this.expiresAt,
    reason,
    {
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
    }
  );
};

/**
 * Find active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Active sessions
 */
SessionSchema.statics.findActiveSessions = async function (userId) {
  return await this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

/**
 * Invalidate all sessions for a user
 * @param {string} userId - User ID
 * @param {string} reason - Reason for invalidation
 * @returns {Promise<number>} - Number of sessions invalidated
 */
SessionSchema.statics.invalidateAllUserSessions = async function (userId, reason = "forced_logout") {
  const sessions = await this.find({ userId, isActive: true });

  const TokenBlacklist = mongoose.model("TokenBlacklist");

  for (const session of sessions) {
    session.isActive = false;
    await session.save();

    // Blacklist the token
    await TokenBlacklist.blacklistToken(
      session.token,
      userId,
      session.expiresAt,
      reason,
      {
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }
    );
  }

  return sessions.length;
};

/**
 * Clean up expired or inactive sessions
 * @param {number} inactivityHours - Hours of inactivity before cleanup (default: 24)
 * @returns {Promise<number>} - Number of sessions cleaned
 */
SessionSchema.statics.cleanupInactiveSessions = async function (inactivityHours = 24) {
  const cutoffTime = new Date(Date.now() - inactivityHours * 60 * 60 * 1000);

  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { lastActivity: { $lt: cutoffTime }, isActive: true },
    ],
  });

  return result.deletedCount;
};

/**
 * Get session statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Session statistics
 */
SessionSchema.statics.getUserSessionStats = async function (userId) {
  const sessions = await this.find({ userId, isActive: true });

  return {
    totalActiveSessions: sessions.length,
    devices: sessions.map(s => ({
      deviceInfo: s.deviceInfo,
      lastActivity: s.lastActivity,
      ipAddress: s.ipAddress,
      location: s.location,
    })),
    oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null,
    newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.createdAt)) : null,
  };
};

/**
 * Check if session has expired due to inactivity
 * @param {number} maxInactivityMinutes - Maximum minutes of inactivity allowed
 * @returns {boolean} - True if session is inactive
 */
SessionSchema.methods.isInactive = function (maxInactivityMinutes = 120) {
  const inactivityMs = Date.now() - this.lastActivity.getTime();
  const inactivityMinutes = inactivityMs / (1000 * 60);
  return inactivityMinutes > maxInactivityMinutes;
};

module.exports = mongoose.model("Session", SessionSchema);
