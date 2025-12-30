const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Post = require("./Post");

// Create Schema
const UserSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, "First Name is Required"],
    },

    lastname: {
      type: String,
      required: [true, "Last Name is Required"],
    },

    image: {
      type: String,
    },

    email: {
      type: String,
      unique: true,
      trim: true,
      required: [true, "Email is Required"],
    },

    phone: {
      type: String,
    },

    password: {
      type: String,
      required: [true, "Password is Required"],
      minlength: [8, "Password must be at least 8 characters"],
    },

    passwordChangedAt: {
      type: Date,
    },

    tokenVersion: {
      type: Number,
      default: 0, // Increment this to invalidate all existing tokens
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
    },

    lastLogin: {
      type: Date,
    },

    lastPasswordChange: {
      type: Date,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],

    blocked: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    plan: {
      type: String,
      enum: ["Free", "Premium", "Pro"],
      default: "Free",
    },

    userAward: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      default: "Bronze",
    },
  },
  { toJSON: { virtuals: true } },
  { timestamps: true }
);

// @desc Get Full Name
UserSchema.virtual("fullname").get(function () {
  return `${this.firstname} ${this.lastname}`;
});

// @desc Get intials
UserSchema.virtual("intials").get(function () {
  return `${this.firstname[0]}${this.lastname[0]}`;
});

// @desc Get post counts
UserSchema.virtual("postCounts").get(function () {
  return this.posts.length;
});

// @desc get followers count
UserSchema.virtual("followersCount").get(function () {
  return this.followers.length;
});

// @desc get followers count
UserSchema.virtual("followingCount").get(function () {
  return this.following.length;
});

//get viewers count
UserSchema.virtual("viewersCount").get(function () {
  return this.viewers.length;
});

// @desc get blocked count
UserSchema.virtual("blockedCount").get(function () {
  return this.blocked.length;
});

// @desc Last Date  User Created a Post
UserSchema.pre("findOne", async function (next) {
  // get the user id
  const userId = this._conditions._id;
  // find the post created by the user
  const posts = await Post.find({ author: userId });

  if (posts.length > 0) {
    // get the last post date
    const lastPostDate = posts[posts.length - 1].createdAt;
    const lastPostDateStr = lastPostDate.toDateString();

    // --------- Last Post Date ---------- //

    UserSchema.virtual("lastPostDate").get(function () {
      return lastPostDateStr;
    });

    // --------- Check if the user inactive for 30 days ---------- //

    const currentDate = new Date();

    const diff = (currentDate - lastPostDate) / (1000 * 3600 * 24);

    if (diff > 30) {
      UserSchema.virtual("isInactive").get(function () {
        return true;
      });
      await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
    } else {
      UserSchema.virtual("isInactive").get(function () {
        return false;
      });
      await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });
    }

    // --------- Last Active Date Of A User ---------- //

    const daysAgo = Math.floor(diff);
    UserSchema.virtual("lastActive").get(function () {
      if (daysAgo <= 0) {
        return "today";
      } else if (daysAgo === 1) {
        return "yeterday";
      } else {
        return `${daysAgo} days ago`;
      }
    });

    // ---------  Upgrade User Account  ---------- //

    if (posts.length < 10) {
      await User.findByIdAndUpdate(
        userId,
        { userAward: "Bronze" },
        { new: true }
      );
    } else if (posts.length < 20) {
      await User.findByIdAndUpdate(
        userId,
        { userAward: "Silver" },
        { new: true }
      );
    } else {
      await User.findByIdAndUpdate(
        userId,
        { userAward: "Gold" },
        { new: true }
      );
    }
  }
  next();
});

// @desc Hash Password with Strong Salt Rounds
UserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified("password")) return next();

  try {
    // Use 12 salt rounds for strong security (OWASP recommendation)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    // Track password change timestamp
    if (!this.isNew) {
      this.passwordChangedAt = Date.now();
      this.lastPasswordChange = Date.now();
      // Increment token version to invalidate all existing tokens
      this.tokenVersion += 1;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// @desc Virtual for checking if account is locked
UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// @desc Method to increment login attempts
UserSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Otherwise increment attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// @desc Method to reset login attempts on successful login
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1 },
  });
};

// @desc Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// @desc Check if token version is valid
UserSchema.methods.isTokenVersionValid = function (tokenVersion) {
  return this.tokenVersion === tokenVersion;
};

// @desc Create Model
const User = mongoose.model("User", UserSchema);
module.exports = User;
