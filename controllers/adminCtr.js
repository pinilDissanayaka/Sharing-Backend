const User = require("../model/User");
const Listing = require("../model/Listing");
const asyncHandler = require("express-async-handler");
const apiError = require("../utils/apiError");

// @desc Get admin statistics
exports.getAdminStats = asyncHandler(async (req, res, next) => {
  try {
    console.log("Admin stats endpoint called");

    // Get current date and first day of current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log("Total users:", totalUsers);

    // Count users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const roleStats = {
      tenants: 0,
      landlords: 0,
      agents: 0,
      admins: 0,
    };

    usersByRole.forEach((item) => {
      // Map "user" role to "tenants" for frontend compatibility
      if (item._id === "user") roleStats.tenants = item.count;
      else if (item._id === "admin") roleStats.admins = item.count;
    });

    // Count active/suspended users
    const activeUsers = await User.countDocuments({ isBlocked: false });
    const suspendedUsers = await User.countDocuments({ isBlocked: true });

    // Count new users this month
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: firstDayOfMonth },
    });

    // Count total listings
    const totalListings = await Listing.countDocuments();
    console.log("Total listings:", totalListings);

    // Count listings by status
    const listingsByStatus = await Listing.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = {
      pending: 0,
      published: 0,
      rejected: 0,
      draft: 0,
    };

    listingsByStatus.forEach((item) => {
      if (item._id === "pending") statusStats.pending = item.count;
      else if (item._id === "published") statusStats.published = item.count;
      else if (item._id === "rejected") statusStats.rejected = item.count;
      else if (item._id === "draft") statusStats.draft = item.count;
    });

    // Count new listings this month
    const newListingsThisMonth = await Listing.countDocuments({
      createdAt: { $gte: firstDayOfMonth },
    });

    // Get recent pending listings (max 10)
    const recentPendingListings = await Listing.find({ status: "pending" })
      .populate({
        path: "author",
        select: "firstname lastname email phone",
        options: { virtuals: false }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(); // Use lean() to get plain objects without virtuals

    // Ensure listingDuration has a default value for listings that don't have it
    recentPendingListings.forEach(listing => {
      if (!listing.listingDuration) {
        listing.listingDuration = 3; // Default to 3 months
      }
    });

    // Get published listings sorted by expiration date (soonest first)
    const publishedListings = await Listing.find({ status: "published" })
      .populate({
        path: "author",
        select: "firstname lastname email phone",
        options: { virtuals: false }
      })
      .sort({ expiresAt: 1 }) // Sort by expiration date ascending (soonest first)
      .lean();

    // Ensure listingDuration has a default value for published listings
    publishedListings.forEach(listing => {
      if (!listing.listingDuration) {
        listing.listingDuration = 3; // Default to 3 months
      }
    });

    console.log("Sending admin stats response with author contact info");
    if (recentPendingListings.length > 0) {
      console.log("Sample listing author data:", {
        authorEmail: recentPendingListings[0].author?.email,
        authorPhone: recentPendingListings[0].author?.phone,
        contactPhone: recentPendingListings[0].contactPhone
      });
    }

    // Return stats
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: roleStats,
          byStatus: {
            active: activeUsers,
            suspended: suspendedUsers,
          },
          newThisMonth: newUsersThisMonth,
        },
        listings: {
          total: totalListings,
          byStatus: statusStats,
          newThisMonth: newListingsThisMonth,
        },
        recentPendingListings: recentPendingListings,
        publishedListings: publishedListings,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return next(new apiError("Error fetching admin statistics: " + error.message, 500));
  }
});

// @desc Get all users (admin only)
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, search, page = 1, limit = 10 } = req.query;

  // Build query
  let query = {};

  if (role) {
    query.role = role;
  }

  if (status === "active") {
    query.isBlocked = false;
  } else if (status === "suspended") {
    query.isBlocked = true;
  }

  if (search) {
    query.$or = [
      { firstname: { $regex: search, $options: "i" } },
      { lastname: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Get users
  const users = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // For each user, count their listings
  const usersWithListings = await Promise.all(
    users.map(async (user) => {
      const userObj = user.toObject();

      // Count by author field OR by checking if listing ID is in user's posts array
      const listingIds = userObj.posts || [];
      const listingsCount = await Listing.countDocuments({
        $or: [
          { author: user._id },
          { _id: { $in: listingIds } }
        ]
      });

      const pendingListings = await Listing.countDocuments({
        $or: [
          { author: user._id, status: "pending" },
          { _id: { $in: listingIds }, status: "pending" }
        ]
      });

      const publishedListings = await Listing.countDocuments({
        $or: [
          { author: user._id, status: "published" },
          { _id: { $in: listingIds }, status: "published" }
        ]
      });

      const rejectedListings = await Listing.countDocuments({
        $or: [
          { author: user._id, status: "rejected" },
          { _id: { $in: listingIds }, status: "rejected" }
        ]
      });

      return {
        ...userObj,
        listingsCount,
        pendingListings,
        publishedListings,
        rejectedListings,
      };
    })
  );

  // Get total count for pagination
  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: usersWithListings,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});

// @desc Get user by ID (admin only)
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return next(new apiError(`No user found for id ${req.params.id}`, 404));
  }

  // Get user's listings
  const listings = await Listing.find({ author: user._id }).sort({
    createdAt: -1,
  });

  // Count listings by status
  const listingsCount = listings.length;
  const pendingListings = listings.filter((l) => l.status === "pending").length;
  const publishedListings = listings.filter(
    (l) => l.status === "published"
  ).length;
  const rejectedListings = listings.filter(
    (l) => l.status === "rejected"
  ).length;

  res.status(200).json({
    success: true,
    data: {
      ...user.toObject(),
      listingsCount,
      pendingListings,
      publishedListings,
      rejectedListings,
      listings,
    },
  });
});

// @desc Update user status (admin only)
exports.updateUserStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new apiError(`No user found for id ${req.params.id}`, 404));
  }

  // Map status to isBlocked field
  if (status === "suspended") {
    user.isBlocked = true;
  } else if (status === "active") {
    user.isBlocked = false;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc Delete user (admin only)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new apiError(`No user found for id ${req.params.id}`, 404));
  }

  // Delete all user's listings
  await Listing.deleteMany({ author: user._id });

  // Delete user
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "User and all their listings deleted successfully",
  });
});

// @desc Get all listings (admin only)
exports.getAllListings = asyncHandler(async (req, res) => {
  const { status, propertyType, search, page = 1, limit = 10 } = req.query;

  // Build query
  let query = {};

  if (status) {
    query.status = status;
  }

  if (propertyType) {
    query.propertyType = propertyType;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Get listings with author details (admin sees ALL fields including contact info)
  const listings = await Listing.find(query)
    .populate({
      path: "author",
      select: "firstname lastname email phone",
      options: { virtuals: false }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Ensure listingDuration has a default value for listings that don't have it
  listings.forEach(listing => {
    if (!listing.listingDuration) {
      listing.listingDuration = 3; // Default to 3 months
    }
  });

  // Get total count for pagination
  const total = await Listing.countDocuments(query);

  res.status(200).json({
    success: true,
    data: listings,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  });
});
