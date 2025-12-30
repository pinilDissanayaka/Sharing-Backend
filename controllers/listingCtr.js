const Listing = require("../model/Listing");
const User = require("../model/User");
const asyncHandler = require("express-async-handler");
const apiError = require("../utils/apiError");

// @desc Create Listing
exports.createListing = asyncHandler(async (req, res) => {
  // Set author from authenticated user
  req.body.author = req.user._id;

  // Create the listing
  const listing = await Listing.create(req.body);

  // Associate user to listing
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: { posts: listing._id },
    },
    { new: true }
  );

  res.status(201).json({ success: true, data: listing });
});

// @desc Update Listing
exports.updateListing = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return next(new apiError(`No listing found for id ${id}`, 404));
  }

  // Check if the listing belongs to user
  if (listing.author.toString() !== req.user._id.toString()) {
    return next(new apiError(`You are not allowed to update this listing`, 403));
  }

  // Only allow editing if listing is pending (not yet published)
  if (listing.status === "published") {
    return next(new apiError(`Cannot edit published listings. Published listings cannot be modified.`, 403));
  }

  const doc = await Listing.findOneAndUpdate(
    { _id: listing._id },
    req.body,
    { new: true }
  );

  res.status(200).json({ success: true, data: doc });
});

// @desc Get List of Listings
exports.allListings = asyncHandler(async (req, res) => {
  const { sortBy, propertyType, district, city, minPrice, maxPrice, bedrooms, bathrooms, furnishing } = req.query;

  // Build query
  let query = {};

  // Only show published listings for public access (non-authenticated users)
  // This allows all users to browse published properties without login
  query.status = "published";

  // Filter by property type
  if (propertyType) {
    query.propertyType = propertyType;
  }

  // Filter by location
  if (district) {
    query["location.district"] = district;
  }
  if (city) {
    query["location.city"] = { $regex: city, $options: "i" };
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    query.rentPerMonth = {};
    if (minPrice) query.rentPerMonth.$gte = Number(minPrice);
    if (maxPrice) query.rentPerMonth.$lte = Number(maxPrice);
  }

  // Filter by bedrooms
  if (bedrooms) {
    query.bedrooms = Number(bedrooms);
  }

  // Filter by bathrooms
  if (bathrooms) {
    query.bathrooms = Number(bathrooms);
  }

  // Filter by furnishing
  if (furnishing) {
    query.furnishing = furnishing;
  }

  // Build sort
  let sort = {};
  if (sortBy === "price-low") {
    sort.rentPerMonth = 1;
  } else if (sortBy === "price-high") {
    sort.rentPerMonth = -1;
  } else {
    sort.createdAt = -1; // Default: newest first
  }

  const listings = await Listing.find(query)
    .populate({
      path: "author",
      select: "firstname lastname email phone",
      options: { virtuals: false }
    })
    .sort(sort)
    .lean();

  // Ensure listingDuration has a default value for listings that don't have it
  listings.forEach(listing => {
    if (!listing.listingDuration) {
      listing.listingDuration = 3; // Default to 3 months
    }
  });

  res.status(200).json({
    success: true,
    count: listings.length,
    total: listings.length,
    data: listings
  });
});

// @desc Get a single listing
exports.getListing = asyncHandler(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id)
    .populate({
      path: "author",
      select: "firstname lastname email phone",
      options: { virtuals: false }
    })
    .lean();

  if (!listing) {
    return next(new apiError(`No listing found for id ${req.params.id}`, 404));
  }

  // Access control:
  // - Published listings: accessible to everyone (public)
  // - Non-published listings: only accessible to the author or admin
  if (listing.status !== "published") {
    // Check if user is authenticated
    if (!req.user) {
      return next(new apiError(`No listing found for id ${req.params.id}`, 404));
    }

    // Check if user is the author or admin
    const isAuthor = req.user._id.toString() === listing.author._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return next(new apiError(`No listing found for id ${req.params.id}`, 404));
    }
  }

  // Log for debugging - show all contact information
  console.log("=== Listing Contact Information ===");
  console.log("Listing ID:", listing._id);
  console.log("Status:", listing.status);
  console.log("Contact Phone (Listing):", listing.contactPhone);
  console.log("Contact Phone Secondary (Listing):", listing.contactPhoneSecondary);
  console.log("Author Info:", {
    id: listing.author._id,
    name: `${listing.author.firstname} ${listing.author.lastname}`,
    email: listing.author.email,
    phone: listing.author.phone
  });
  console.log("===================================");

  // Ensure listingDuration has a default value if not set
  if (!listing.listingDuration) {
    listing.listingDuration = 3; // Default to 3 months
  }

  res.status(200).json({ success: true, data: listing });
});

// @desc Delete Listing
exports.deleteListing = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    return next(new apiError(`No listing found for id ${id}`, 404));
  }

  // Check if the listing belongs to user
  if (listing.author.toString() !== req.user._id.toString()) {
    return next(new apiError(`You are not allowed to delete this listing`, 403));
  }

  await Listing.findByIdAndDelete(id);

  // Remove from user's posts
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { posts: listing._id },
    },
    { new: true }
  );

  res.status(200).json({ success: true, message: "Listing deleted successfully" });
});

// @desc Get my listings
exports.getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ author: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  // Ensure listingDuration has a default value for listings that don't have it
  listings.forEach(listing => {
    if (!listing.listingDuration) {
      listing.listingDuration = 3; // Default to 3 months
    }
  });

  res.status(200).json({ success: true, data: listings });
});

// @desc Update listing status (Admin only)
exports.updateListingStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  const listing = await Listing.findById(id);
  if (!listing) {
    return next(new apiError(`No listing found for id ${id}`, 404));
  }

  listing.status = status;

  // When approving a listing, calculate and set the expiration date
  if (status === "published") {
    const durationInMonths = listing.listingDuration || 3; // Default to 3 months

    // Use UTC to avoid timezone issues and properly handle month boundaries
    const now = new Date();
    const expirationDate = new Date(
      now.getFullYear(),
      now.getMonth() + durationInMonths,
      now.getDate(),
      0, 0, 0, 0 // Set to midnight local time
    );

    // Handle month boundary edge cases (e.g., Jan 31 + 1 month = Feb 28/29, not Mar 3)
    // If the day rolled over to next month, set to last day of target month
    if (expirationDate.getDate() !== now.getDate()) {
      expirationDate.setDate(0); // Go back to last day of previous month
    }

    listing.expiresAt = expirationDate;
    listing.isAvailable = true; // Mark listing as available when published
  }

  if (status === "rejected" && rejectionReason) {
    listing.rejectionReason = rejectionReason;
  }

  await listing.save();

  res.status(200).json({ success: true, data: listing });
});

// @desc Like/Unlike listing
exports.toggleLikeListing = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return next(new apiError(`No listing found for id ${id}`, 404));
  }

  const userLiked = listing.likes.includes(req.user._id);

  if (userLiked) {
    // Unlike
    listing.likes = listing.likes.filter(
      (userId) => userId.toString() !== req.user._id.toString()
    );
  } else {
    // Like
    listing.likes.push(req.user._id);
  }

  await listing.save();

  res.status(200).json({ success: true, liked: !userLiked });
});

// @desc Track view
exports.trackView = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return next(new apiError(`No listing found for id ${id}`, 404));
  }

  // Add view if not already viewed by this user
  if (!listing.numViews.includes(req.user._id)) {
    listing.numViews.push(req.user._id);
    await listing.save();
  }

  res.status(200).json({ success: true });
});
