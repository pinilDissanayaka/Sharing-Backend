const mongoose = require("mongoose");

// Create SCHEMA for Property Listings
const ListingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    propertyType: {
      type: String,
      required: [true, "Property type is required"],
      enum: ["room", "annex", "house", "apartment", "commercial"],
    },

    location: {
      district: {
        type: String,
        required: [true, "District is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      address: {
        type: String,
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    rentPerMonth: {
      type: Number,
      required: [true, "Monthly rent is required"],
    },

    deposit: {
      type: Number,
      required: [true, "Deposit is required"],
    },

    bedrooms: {
      type: Number,
      required: [true, "Number of bedrooms is required"],
    },

    bathrooms: {
      type: Number,
      required: [true, "Number of bathrooms is required"],
    },

    size: {
      type: Number,
    },

    furnishing: {
      type: String,
      enum: ["furnished", "semi-furnished", "unfurnished"],
      default: "unfurnished",
    },

    amenities: [
      {
        type: String,
      },
    ],

    images: [
      {
        type: String,
      },
    ],

    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
    },

    contactPhoneSecondary: {
      type: String,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },

    status: {
      type: String,
      enum: ["pending", "published", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
    },

    numViews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    availableFrom: {
      type: Date,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    listingDuration: {
      type: Number,
      min: 1,
      max: 12,
      default: 3,
      required: [true, "Listing duration is required"],
    },

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create Model
const Listing = mongoose.model("Listing", ListingSchema);
module.exports = Listing;
