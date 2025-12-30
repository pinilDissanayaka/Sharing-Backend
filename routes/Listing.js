const express = require("express");
const router = express.Router();

const {
  createListing,
  updateListing,
  allListings,
  getListing,
  deleteListing,
  getMyListings,
  updateListingStatus,
  toggleLikeListing,
  trackView,
} = require("../controllers/listingCtr");

const {
  requireSignIn,
  alowedTo,
  isBlocked,
  optionalAuth,
} = require("../middlwares/authMiddlwares");

// @desc Get all listings (public access)
// @access Public
router.get("/", allListings);

// @desc Get my listings (must come before /:id to avoid route conflict)
// @access Protected
router.get("/my-listings", requireSignIn, getMyListings);

// @desc Get single listing (public for published, protected for own drafts/pending)
// @access Public/Protected
router.get("/:id", optionalAuth, getListing);

// @desc Create Listing
// @access Protected
router.post(
  "/",
  requireSignIn,
  alowedTo("admin", "user"),
  isBlocked,
  createListing
);

// @desc Update Listing
// @access Protected
router.put(
  "/:id",
  requireSignIn,
  alowedTo("admin", "user"),
  updateListing
);

// @desc Delete Listing
// @access Protected
router.delete(
  "/:id",
  requireSignIn,
  alowedTo("admin", "user"),
  deleteListing
);

// @desc Update listing status (Admin only)
// @access Protected (Admin)
router.put(
  "/:id/status",
  requireSignIn,
  alowedTo("admin"),
  updateListingStatus
);

// @desc Like/Unlike listing
// @access Protected
router.post(
  "/:id/like",
  requireSignIn,
  toggleLikeListing
);

// @desc Track view
// @access Protected
router.post(
  "/:id/view",
  requireSignIn,
  trackView
);

module.exports = router;
