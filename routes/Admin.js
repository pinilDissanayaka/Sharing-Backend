const express = require("express");
const router = express.Router();

const {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllListings,
} = require("../controllers/adminCtr");

const {
  requireSignIn,
  alowedTo,
} = require("../middlwares/authMiddlwares");

// All routes require admin authentication
router.use(requireSignIn);
router.use(alowedTo("admin"));

// @desc Get admin statistics
// @access Protected (Admin only)
router.get("/stats", getAdminStats);

// @desc Get all users
// @access Protected (Admin only)
router.get("/users", getAllUsers);

// @desc Get user by ID
// @access Protected (Admin only)
router.get("/users/:id", getUserById);

// @desc Update user status
// @access Protected (Admin only)
router.put("/users/:id/status", updateUserStatus);

// @desc Delete user
// @access Protected (Admin only)
router.delete("/users/:id", deleteUser);

// @desc Get all listings (admin only)
// @access Protected (Admin only)
router.get("/listings", getAllListings);

module.exports = router;
