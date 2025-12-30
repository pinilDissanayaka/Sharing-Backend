const mongoose = require("mongoose");

/**
 * Token Blacklist Schema for Session Management
 * Stores invalidated tokens (logout, password change, etc.)
 * Tokens are automatically removed after expiration
 */
const TokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true, // Index for fast lookup
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      enum: ["logout", "password_change", "account_deleted", "forced_logout", "expired"],
      default: "logout",
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true, // TTL index for automatic cleanup
    },

    blacklistedAt: {
      type: Date,
      default: Date.now,
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove expired tokens after they expire
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} - True if blacklisted
 */
TokenBlacklistSchema.statics.isBlacklisted = async function (token) {
  const blacklisted = await this.findOne({
    token,
    expiresAt: { $gt: new Date() } // Only check non-expired entries
  });
  return !!blacklisted;
};

/**
 * Blacklist a token
 * @param {string} token - JWT token to blacklist
 * @param {string} userId - User ID associated with token
 * @param {Date} expiresAt - When the token expires
 * @param {string} reason - Reason for blacklisting
 * @param {Object} metadata - Additional metadata (ip, userAgent)
 * @returns {Promise<Object>} - Blacklist entry
 */
TokenBlacklistSchema.statics.blacklistToken = async function (
  token,
  userId,
  expiresAt,
  reason = "logout",
  metadata = {}
) {
  return await this.create({
    token,
    userId,
    reason,
    expiresAt,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });
};

/**
 * Blacklist all tokens for a user (e.g., on password change)
 * Note: This requires storing active tokens per user
 * @param {string} userId - User ID
 * @param {string} reason - Reason for blacklisting
 */
TokenBlacklistSchema.statics.blacklistAllUserTokens = async function (userId, reason = "password_change") {
  // Mark user as requiring re-authentication
  // This works with the User model's tokenVersion field
  const User = mongoose.model("User");
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};

/**
 * Clean up expired tokens manually (backup to TTL index)
 */
TokenBlacklistSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

module.exports = mongoose.model("TokenBlacklist", TokenBlacklistSchema);
