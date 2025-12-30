const mongoose = require("mongoose");

// Create SCHEMA for Reviews
const ReviewSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing ID is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must not be more than 5"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews from the same user for the same listing
ReviewSchema.index({ listingId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model("Review", ReviewSchema);
module.exports = Review;
