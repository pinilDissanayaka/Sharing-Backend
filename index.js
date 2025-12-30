const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const app = express();

//
const apiError = require("./utils/apiError");
const { globalErrHandler } = require("./utils/globalErrHandler");

// access environment variables
require("dotenv").config();

// connect to database
require("./config/database");

// ====================
// SECURITY MIDDLEWARE
// ====================

// Set security HTTP headers with enhanced configuration
app.use(helmet({
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // Content Security Policy - Enhanced
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // HTTP Strict Transport Security - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },

  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Disable X-Powered-By header
  hidePoweredBy: true,

  // XSS Filter
  xssFilter: true,

  // Referrer Policy - Control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Permissions Policy (formerly Feature Policy)
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
}));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use("/api/", limiter);

// Stricter rate limit for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/admin-login", authLimiter);

// CORS middleware - allow frontend to access backend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'propertyType',
    'location',
    'price',
    'bedrooms',
    'bathrooms',
    'status'
  ]
}));

// ====================
// ROUTES
// ====================

const userRouters = require("./routes/User");
const authRouters = require("./routes/Auth");
const categoryRouters = require("./routes/Category");
const postRouters = require("./routes/Post");
const commentRouters = require("./routes/Comment");
const listingRouters = require("./routes/Listing");
const adminRouters = require("./routes/Admin");
const reviewRouters = require("./routes/Review");

// routes middleware
app.use("/api/users", userRouters);
app.use("/api/auth", authRouters);
app.use("/api/categories", categoryRouters);
app.use("/api/posts", postRouters);
app.use("/api/listings", listingRouters); // Property listings routes
app.use("/api/comments", commentRouters);
app.use("/api/admin", adminRouters); // Admin routes
app.use("/api/reviews", reviewRouters); // Review routes

// 404 error
app.all("*", (req, res, next) => {
  // create error
  const err = new apiError(`Can't find this route ${req.originalUrl}`, 404);
  // send it to Global errors handling middleware
  next(err);
});

// Global Error Handlers Middleware
app.use(globalErrHandler);

// Listen To Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
