const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  adminLogin,
  getCurrentUser,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  logoutAll,
  getActiveSessions
} = require("./../controllers/AuthCtr");
const {
  signupValidator,
  loginValidator,
} = require("./../utils/validators/authValidator");
const { requireSignIn } = require("./../middlwares/authMiddlwares");

// Public routes - No authentication required
// @desc Sign Up
router.post("/signup", signupValidator, signup);

// @desc Login
router.post("/login", loginValidator, login);

// @desc Admin Login
router.post("/login/admin", loginValidator, adminLogin);

// @desc Refresh Token
router.post("/refresh-token", refreshToken);

// Protected routes - Authentication required
// @desc Get current user
router.get("/me", requireSignIn, getCurrentUser);

// @desc Update Profile
router.put("/profile", requireSignIn, updateProfile);

// @desc Change Password
router.put("/password", requireSignIn, changePassword);

// @desc Logout from current device
router.post("/logout", requireSignIn, logout);

// @desc Logout from all devices
router.post("/logout/all", requireSignIn, logoutAll);

// @desc Get active sessions
router.get("/sessions", requireSignIn, getActiveSessions);

module.exports = router;
