const Review = require("../model/Review");
const Listing = require("../model/Listing");
const asyncHandler = require("express-async-handler");
const apiError = require("../utils/apiError");

// @desc Create Review
exports.createReview = asyncHandler(async (req, res, next) => {
  const { listingId, rating, comment } = req.body;

  // Check if listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new apiError("Listing not found", 404));
  }

  // Check if user already reviewed this listing
  const existingReview = await Review.findOne({
    listingId,
    userId: req.user._id,
  });

  if (existingReview) {
    return next(new apiError("You have already reviewed this listing", 400));
  }

  // Create review
  const review = await Review.create({
    listingId,
    userId: req.user._id,
    rating,
    comment,
  });

  // Populate user details
  await review.populate("userId", "firstname lastname image");

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    data: review,
  });
});

// @desc Get Listing Reviews
exports.getListingReviews = asyncHandler(async (req, res, next) => {
  const { listingId } = req.params;

  const reviews = await Review.find({ listingId })
    .populate("userId", "firstname lastname image")
    .sort({ createdAt: -1 });

  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  res.status(200).json({
    success: true,
    count: reviews.length,
    averageRating: averageRating.toFixed(1),
    data: reviews,
  });
});

// @desc Get My Reviews
exports.getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userId: req.user._id })
    .populate("listingId", "title images")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
});

// @desc Update Review
exports.updateReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await Review.findById(id);

  if (!review) {
    return next(new apiError("Review not found", 404));
  }

  // Check if review belongs to user
  if (review.userId.toString() !== req.user._id.toString()) {
    return next(new apiError("You are not authorized to update this review", 403));
  }

  // Update review
  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  await review.save();
  await review.populate("userId", "firstname lastname image");

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    data: review,
  });
});

// @desc Delete Review
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const review = await Review.findById(id);

  if (!review) {
    return next(new apiError("Review not found", 404));
  }

  // Check if review belongs to user or if user is admin
  if (
    review.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new apiError("You are not authorized to delete this review", 403));
  }

  await Review.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});
