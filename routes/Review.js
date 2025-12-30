const express = require("express");
const router = express.Router();

const {
  createReview,
  getListingReviews,
  getMyReviews,
  updateReview,
  deleteReview,
} = require("../controllers/reviewCtr");

const {
  requireSignIn,
  alowedTo,
} = require("../middlwares/authMiddlwares");

// @desc Create Review
// @access Protected
router.post("/", requireSignIn, createReview);

// @desc Get My Reviews
// @access Protected
router.get("/my-reviews", requireSignIn, getMyReviews);

// @desc Get Listing Reviews (public)
// @access Public
router.get("/listing/:listingId", getListingReviews);

// @desc Update Review
// @access Protected
router.put("/:id", requireSignIn, updateReview);

// @desc Delete Review
// @access Protected (Owner or Admin)
router.delete("/:id", requireSignIn, deleteReview);

module.exports = router;
