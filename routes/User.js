const express = require("express");
const router = express.Router();

const {
  createUser,
  updateUser,
  allUsers,
  getUser,
  deleteUser,
  profilePhotoUpload,
  uploadProfileImage,
  whoViewMyProfile,
  following,
  Unfollowing,
  block,
  unblock,
  block_admin,
  unblockUser_admin,
  changeUserPassword,
  deleteAccount,
  getUserStats,
} = require("./../controllers/userCtr");

const {
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  getUserValidator,
  getAllUserValidator,
  whoViewMyProfileValidator,
  followValidator,
  changeUserPasswordValidator,
} = require("../utils/validators/userValidator");

const { requireSignIn, alowedTo } = require("../middlwares/authMiddlwares");

// @Desc Create a User
// @access Private/Admin
router.post(
  "/",
  requireSignIn,
  alowedTo("admin"),
  createUserValidator,
  createUser
);

// @desc Update Logged User
// @access Protect
router.put(
  "/",
  requireSignIn,
  alowedTo("admin", "user"),
  updateUserValidator,
  updateUser
);

// @desc Change Logged User Password
// @access Protect
router.put(
  "/change-password",
  requireSignIn,
  alowedTo("user", "admin"),
  changeUserPasswordValidator,
  changeUserPassword
);

// @desc Permanantly Delete An Account
// @access Protect
router.delete(
  "/delete-account",
  requireSignIn,
  alowedTo("user", "admin"),
  deleteAccount
);

// @desc Delete a User
// @access Private/Admin
router.delete(
  "/:id",
  requireSignIn,
  alowedTo("admin"),
  deleteUserValidator,
  deleteUser
);

// @desc Get User Stats (Dashboard)
// @access Protected
router.get("/me/stats", requireSignIn, getUserStats);

// @desc Get All Users (uses admin controller for listing counts)
router.get("/", (req, res, next) => {
  const { getAllUsers } = require("../controllers/adminCtr");
  getAllUsers(req, res, next);
});

// @desc Get a Single User (uses admin controller for listing data)
router.get("/:id", getUserValidator, (req, res, next) => {
  const { getUserById } = require("../controllers/adminCtr");
  getUserById(req, res, next);
});

// @desc Update user status (Admin only)
router.put("/:id/status", requireSignIn, alowedTo("admin"), (req, res, next) => {
  // Forward to admin controller
  const { updateUserStatus } = require("../controllers/adminCtr");
  updateUserStatus(req, res, next);
});

// @desc Uploaded profile image
// @access Protect
router.post(
  "/profile-photo-upload",
  requireSignIn,
  alowedTo("user", "admin"),
  uploadProfileImage,
  profilePhotoUpload
);

// @desc Who view my profile
// @access Protect
router.get(
  "/profile-viewers/:id",
  requireSignIn,
  alowedTo("user"),
  whoViewMyProfileValidator,
  whoViewMyProfile
);

// @desc Follow User
// @access Protect
router.get(
  "/following/:id",
  requireSignIn,
  alowedTo("user"),
  followValidator,
  following
);

// @desc Unfollow User
// @access Protect
router.get(
  "/unfollow/:id",
  requireSignIn,
  alowedTo("user"),
  followValidator,
  Unfollowing
);

// @desc Block User
// @access Protect
router.get(
  "/block/:id",
  requireSignIn,
  alowedTo("user"),
  followValidator,
  block
);

// @desc unblock User
// @access Protect
router.get(
  "/unblock/:id",
  requireSignIn,
  alowedTo("user"),
  followValidator,
  unblock
);

// @desc admin block users
// @access Admin
router.get(
  "/admin-block/:id",
  requireSignIn,
  alowedTo("admin"),
  followValidator,
  block_admin
);

// @desc admin unblock users
// @access Admin
router.get(
  "/admin-unblock/:id",
  requireSignIn,
  alowedTo("admin"),
  followValidator,
  unblockUser_admin
);

module.exports = router;
