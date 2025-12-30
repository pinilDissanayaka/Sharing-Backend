# QuickBodima API Documentation

## Base URL
```
Development: http://localhost:4000/api
Production: http://64.247.196.13:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ /* validation errors if any */ ]
}
```

---

# User Side API Endpoints

## Authentication Endpoints

### 1. Sign Up (Register New User)

**Endpoint:** `POST /auth/signup`

**Authentication:** Not required

**Required Fields:**
- `firstname` (string) - User's first name
- `lastname` (string) - User's last name
- `email` (string) - Valid email address
- `password` (string) - Minimum 6 characters

**Optional Fields:**
- `phone` (string) - Contact phone number
- `role` (string) - "user" or "admin" (default: "user")
- `gender` (string) - User's gender

**Request Example:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phone": "+94771234567"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isBlocked": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Authentication:** Not required

**Required Fields:**
- `email` (string) - User's email
- `password` (string) - User's password

**Request Example:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isBlocked": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. Get Current User (Me)

**Endpoint:** `GET /auth/me`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isBlocked": false,
    "image": "data:image/jpeg;base64,...",
    "followers": [],
    "following": [],
    "posts": [],
    "plan": "Free",
    "userAward": "Bronze",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Update User Profile

**Endpoint:** `PUT /users`

**Authentication:** Required (Bearer token)

**Optional Fields:**
- `firstname` (string)
- `lastname` (string)
- `email` (string)
- `phone` (string)
- `image` (string) - Base64 encoded image

**Request Example:**
```json
{
  "firstname": "John",
  "lastname": "Smith",
  "phone": "+94771234567"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Smith",
    "email": "john.doe@example.com",
    "phone": "+94771234567",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  }
}
```

---

### 5. Change Password

**Endpoint:** `PUT /users/change-password`

**Authentication:** Required (Bearer token)

**Required Fields:**
- `currentPassword` (string) - User's current password
- `newPassword` (string) - New password (minimum 6 characters)
- `confirmPassword` (string) - Must match newPassword

**Request Example:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456",
  "confirmPassword": "newSecurePassword456"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 6. Delete Account

**Endpoint:** `DELETE /users/delete-account`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Property Listing Endpoints

### 7. Create Property Listing

**Endpoint:** `POST /listings`

**Authentication:** Required (Bearer token)

**Required Fields:**
- `title` (string) - Property title
- `description` (string) - Detailed property description
- `propertyType` (string) - One of: "room", "annex", "house", "apartment", "commercial"
- `location` (object):
  - `district` (string) - District name
  - `city` (string) - City name
  - `address` (string) - Optional full address
  - `coordinates` (object) - Optional: `{ lat: number, lng: number }`
- `rentPerMonth` (number) - Monthly rent amount in LKR
- `deposit` (number) - Security deposit amount in LKR
- `bedrooms` (number) - Number of bedrooms
- `bathrooms` (number) - Number of bathrooms
- `contactPhone` (string) - Primary contact phone number

**Optional Fields:**
- `size` (number) - Property size in square feet
- `furnishing` (string) - One of: "furnished", "semi-furnished", "unfurnished"
- `amenities` (array of strings) - List of amenities (e.g., ["WiFi", "Parking", "Kitchen"])
- `images` (array of strings) - Up to 10 base64 encoded images (max 10MB each, compressed to JPEG 0.7 quality, max 1200px)
- `contactPhoneSecondary` (string) - Secondary contact phone
- `availableFrom` (date) - Availability date

**Request Example:**
```json
{
  "title": "Spacious 2BR Apartment in Colombo 7",
  "description": "Modern fully furnished 2-bedroom apartment with city view. Walking distance to Odel and supermarkets.",
  "propertyType": "apartment",
  "location": {
    "district": "Colombo",
    "city": "Colombo 7",
    "address": "123 Flower Road, Colombo 7",
    "coordinates": {
      "lat": 6.9147,
      "lng": 79.8731
    }
  },
  "rentPerMonth": 75000,
  "deposit": 150000,
  "bedrooms": 2,
  "bathrooms": 2,
  "size": 1200,
  "furnishing": "furnished",
  "amenities": ["WiFi", "Parking", "Kitchen", "Air Conditioning", "Security"],
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
  ],
  "contactPhone": "+94771234567",
  "contactPhoneSecondary": "+94712345678",
  "availableFrom": "2024-02-01"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "title": "Spacious 2BR Apartment in Colombo 7",
    "description": "Modern fully furnished 2-bedroom apartment...",
    "propertyType": "apartment",
    "location": {
      "district": "Colombo",
      "city": "Colombo 7",
      "address": "123 Flower Road, Colombo 7",
      "coordinates": { "lat": 6.9147, "lng": 79.8731 }
    },
    "rentPerMonth": 75000,
    "deposit": 150000,
    "bedrooms": 2,
    "bathrooms": 2,
    "size": 1200,
    "furnishing": "furnished",
    "amenities": ["WiFi", "Parking", "Kitchen", "Air Conditioning", "Security"],
    "images": ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."],
    "contactPhone": "+94771234567",
    "contactPhoneSecondary": "+94712345678",
    "author": "507f1f77bcf86cd799439011",
    "status": "pending",
    "numViews": [],
    "likes": [],
    "availableFrom": "2024-02-01T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Image Requirements:**
- Maximum 10 images per listing
- Maximum 10MB per image (before base64 encoding)
- Images automatically compressed to JPEG with 0.7 quality
- Images automatically resized to max 1200px on longest side
- Must be sent as base64 encoded strings with data URI prefix: `data:image/jpeg;base64,...`

---

### 8. Get All Property Listings (Browse)

**Endpoint:** `GET /listings`

**Authentication:** Not required (Public access)

**Query Parameters (all optional):**
- `sortBy` (string) - "price-low", "price-high", "newest" (default)
- `propertyType` (string) - Filter by type: "room", "annex", "house", "apartment", "commercial"
- `district` (string) - Filter by district
- `city` (string) - Filter by city (case-insensitive search)
- `minPrice` (number) - Minimum rent per month
- `maxPrice` (number) - Maximum rent per month
- `bedrooms` (number) - Filter by number of bedrooms
- `bathrooms` (number) - Filter by number of bathrooms
- `furnishing` (string) - "furnished", "semi-furnished", "unfurnished"

**Example Request:**
```
GET /listings?district=Colombo&propertyType=apartment&minPrice=50000&maxPrice=100000&sortBy=price-low
```

**Response Example:**
```json
{
  "success": true,
  "count": 25,
  "total": 25,
  "data": [
    {
      "_id": "507f191e810c19729de860ea",
      "title": "Spacious 2BR Apartment in Colombo 7",
      "description": "Modern fully furnished 2-bedroom apartment...",
      "propertyType": "apartment",
      "location": {
        "district": "Colombo",
        "city": "Colombo 7"
      },
      "rentPerMonth": 75000,
      "deposit": 150000,
      "bedrooms": 2,
      "bathrooms": 2,
      "furnishing": "furnished",
      "amenities": ["WiFi", "Parking", "Kitchen"],
      "images": ["data:image/jpeg;base64,..."],
      "status": "published",
      "author": {
        "_id": "507f1f77bcf86cd799439011",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john.doe@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 9. Get Single Property Listing

**Endpoint:** `GET /listings/:id`

**Authentication:** Not required (Public access)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "title": "Spacious 2BR Apartment in Colombo 7",
    "description": "Modern fully furnished 2-bedroom apartment with city view...",
    "propertyType": "apartment",
    "location": {
      "district": "Colombo",
      "city": "Colombo 7",
      "address": "123 Flower Road, Colombo 7",
      "coordinates": { "lat": 6.9147, "lng": 79.8731 }
    },
    "rentPerMonth": 75000,
    "deposit": 150000,
    "bedrooms": 2,
    "bathrooms": 2,
    "size": 1200,
    "furnishing": "furnished",
    "amenities": ["WiFi", "Parking", "Kitchen", "Air Conditioning", "Security"],
    "images": ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."],
    "contactPhone": "+94771234567",
    "contactPhoneSecondary": "+94712345678",
    "author": {
      "_id": "507f1f77bcf86cd799439011",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "phone": "+94771234567"
    },
    "status": "published",
    "numViews": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
    "likes": ["507f1f77bcf86cd799439012"],
    "availableFrom": "2024-02-01T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 10. Get My Listings

**Endpoint:** `GET /listings/my-listings`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "507f191e810c19729de860ea",
      "title": "Spacious 2BR Apartment in Colombo 7",
      "status": "published",
      "rentPerMonth": 75000,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f191e810c19729de860eb",
      "title": "Cozy Studio in Nugegoda",
      "status": "pending",
      "rentPerMonth": 35000,
      "createdAt": "2024-01-14T09:20:00.000Z"
    }
  ]
}
```

---

### 11. Update Property Listing

**Endpoint:** `PUT /listings/:id`

**Authentication:** Required (Bearer token) - Only listing owner or admin

**All fields are optional** (same fields as Create Listing)

**Request Example:**
```json
{
  "rentPerMonth": 70000,
  "availableFrom": "2024-02-15",
  "amenities": ["WiFi", "Parking", "Kitchen", "Air Conditioning", "Security", "Gym"]
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "title": "Spacious 2BR Apartment in Colombo 7",
    "rentPerMonth": 70000,
    "availableFrom": "2024-02-15T00:00:00.000Z",
    "updatedAt": "2024-01-16T14:30:00.000Z"
  }
}
```

---

### 12. Delete Property Listing

**Endpoint:** `DELETE /listings/:id`

**Authentication:** Required (Bearer token) - Only listing owner or admin

**Response Example:**
```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

---

### 13. Like/Unlike Property Listing

**Endpoint:** `POST /listings/:id/like`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "Listing liked successfully",
  "data": {
    "_id": "507f191e810c19729de860ea",
    "likes": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
  }
}
```

---

### 14. Track Property View

**Endpoint:** `POST /listings/:id/view`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "View tracked successfully",
  "data": {
    "_id": "507f191e810c19729de860ea",
    "numViews": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
  }
}
```

---

## User Social Endpoints

### 15. Follow User

**Endpoint:** `GET /users/following/:id`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "You are now following this user"
}
```

---

### 16. Unfollow User

**Endpoint:** `GET /users/unfollow/:id`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "You have unfollowed this user"
}
```

---

### 17. Block User

**Endpoint:** `GET /users/block/:id`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

---

### 18. Unblock User

**Endpoint:** `GET /users/unblock/:id`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "message": "User unblocked successfully"
}
```

---

### 19. Who Viewed My Profile

**Endpoint:** `GET /users/profile-viewers/:id`

**Authentication:** Required (Bearer token)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "firstname": "Jane",
      "lastname": "Smith",
      "image": "data:image/jpeg;base64,...",
      "viewedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 20. Upload Profile Photo

**Endpoint:** `POST /users/profile-photo-upload`

**Authentication:** Required (Bearer token)

**Request:** Multipart form data with file field named "image"

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "image": "data:image/jpeg;base64,...",
    "updatedAt": "2024-01-16T11:30:00.000Z"
  }
}
```

---

# Admin Side API Endpoints

## Admin Dashboard

### 21. Get Admin Statistics

**Endpoint:** `GET /admin/stats`

**Authentication:** Required (Bearer token) - Admin only

**Query Parameters:**
- `type` (string) - Optional: "admin" (for frontend compatibility)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "byRole": {
        "tenants": 1100,
        "landlords": 0,
        "agents": 0,
        "admins": 150
      },
      "byStatus": {
        "active": 1200,
        "suspended": 50
      },
      "newThisMonth": 45
    },
    "listings": {
      "total": 850,
      "byStatus": {
        "pending": 25,
        "published": 780,
        "rejected": 35,
        "draft": 10
      },
      "newThisMonth": 62
    },
    "recentPendingListings": [
      {
        "_id": "507f191e810c19729de860ea",
        "title": "Spacious 2BR Apartment in Colombo 7",
        "propertyType": "apartment",
        "rentPerMonth": 75000,
        "author": {
          "_id": "507f1f77bcf86cd799439011",
          "firstname": "John",
          "lastname": "Doe",
          "email": "john.doe@example.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Admin User Management

### 22. Get All Users (Admin)

**Endpoint:** `GET /admin/users`

**Authentication:** Required (Bearer token) - Admin only

**Query Parameters (all optional):**
- `role` (string) - Filter by role: "user", "admin"
- `status` (string) - Filter by status: "active", "suspended"
- `search` (string) - Search by firstname, lastname, or email
- `page` (number) - Page number (default: 1)
- `limit` (number) - Results per page (default: 10)

**Example Request:**
```
GET /admin/users?status=active&role=user&search=john&page=1&limit=10
```

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "phone": "+94771234567",
      "role": "user",
      "isBlocked": false,
      "listingsCount": 5,
      "pendingListings": 1,
      "publishedListings": 3,
      "rejectedListings": 1,
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ],
  "total": 1100,
  "totalPages": 110,
  "currentPage": 1
}
```

---

### 23. Get User by ID (Admin)

**Endpoint:** `GET /admin/users/:id`

**Authentication:** Required (Bearer token) - Admin only

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "phone": "+94771234567",
    "role": "user",
    "isBlocked": false,
    "image": "data:image/jpeg;base64,...",
    "followers": [],
    "following": [],
    "blocked": [],
    "plan": "Free",
    "userAward": "Bronze",
    "listingsCount": 5,
    "pendingListings": 1,
    "publishedListings": 3,
    "rejectedListings": 1,
    "listings": [
      {
        "_id": "507f191e810c19729de860ea",
        "title": "Spacious 2BR Apartment in Colombo 7",
        "status": "published",
        "rentPerMonth": 75000,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-10T08:00:00.000Z"
  }
}
```

---

### 24. Update User Status (Admin)

**Endpoint:** `PUT /admin/users/:id/status`

**Authentication:** Required (Bearer token) - Admin only

**Required Fields:**
- `status` (string) - "active" or "suspended"

**Request Example:**
```json
{
  "status": "suspended"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "isBlocked": true,
    "updatedAt": "2024-01-16T15:30:00.000Z"
  }
}
```

---

### 25. Delete User (Admin)

**Endpoint:** `DELETE /admin/users/:id`

**Authentication:** Required (Bearer token) - Admin only

**Response Example:**
```json
{
  "success": true,
  "message": "User and all their listings deleted successfully"
}
```

**Note:** This action also deletes all listings created by the user.

---

### 26. Admin Block User

**Endpoint:** `GET /users/admin-block/:id`

**Authentication:** Required (Bearer token) - Admin only

**Response Example:**
```json
{
  "success": true,
  "message": "User blocked by admin successfully"
}
```

---

### 27. Admin Unblock User

**Endpoint:** `GET /users/admin-unblock/:id`

**Authentication:** Required (Bearer token) - Admin only

**Response Example:**
```json
{
  "success": true,
  "message": "User unblocked by admin successfully"
}
```

---

## Admin Listing Management

### 28. Update Listing Status (Admin)

**Endpoint:** `PUT /listings/:id/status`

**Authentication:** Required (Bearer token) - Admin only

**Required Fields:**
- `status` (string) - "pending", "published", or "rejected"

**Optional Fields:**
- `rejectionReason` (string) - Required when status is "rejected"

**Request Example (Approve):**
```json
{
  "status": "published"
}
```

**Request Example (Reject):**
```json
{
  "status": "rejected",
  "rejectionReason": "Incomplete property information. Please provide accurate contact details."
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "title": "Spacious 2BR Apartment in Colombo 7",
    "status": "published",
    "updatedAt": "2024-01-16T14:00:00.000Z"
  }
}
```

---

### 29. Create User (Admin)

**Endpoint:** `POST /users`

**Authentication:** Required (Bearer token) - Admin only

**Required Fields:**
- `firstname` (string) - User's first name
- `lastname` (string) - User's last name
- `email` (string) - Valid email address
- `password` (string) - Password

**Optional Fields:**
- `role` (string) - "user" or "admin"
- `phone` (string) - Contact phone

**Request Example:**
```json
{
  "firstname": "Jane",
  "lastname": "Smith",
  "email": "jane.smith@example.com",
  "password": "securePassword123",
  "role": "user",
  "phone": "+94771234568"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "firstname": "Jane",
    "lastname": "Smith",
    "email": "jane.smith@example.com",
    "role": "user",
    "isBlocked": false,
    "createdAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - User doesn't have permission |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Common Error Responses

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

**Authentication Error:**
```json
{
  "success": false,
  "message": "Not authorized, token failed"
}
```

**Permission Error:**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

**Not Found Error:**
```json
{
  "success": false,
  "message": "No user found for id 507f1f77bcf86cd799439011"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. This may be added in future versions.

---

## Data Constraints

### User
- Email must be unique
- Password minimum 6 characters
- Firstname and lastname are required

### Listing
- Title required
- Description required
- Property type must be one of: "room", "annex", "house", "apartment", "commercial"
- District and city required in location
- Rent per month and deposit must be numbers
- Bedrooms and bathrooms must be numbers
- Furnishing must be one of: "furnished", "semi-furnished", "unfurnished"
- Status must be one of: "pending", "published", "rejected"
- Maximum 10 images per listing
- Images must be base64 encoded strings

### Image Handling
- Images are automatically compressed to JPEG format with 0.7 quality
- Images are automatically resized to maximum 1200px on the longest side
- Maximum 10MB per image before base64 encoding
- Frontend sends images as base64 strings with data URI: `data:image/jpeg;base64,...`
- Backend accepts payload up to 50MB to accommodate multiple images

---

## Notes

1. **User Roles:** The system has two roles: "user" (regular users/tenants) and "admin". For frontend compatibility, the API maps "user" role to "tenants" in statistics.

2. **Listing Status:** When a user creates a listing, it defaults to "pending" status and requires admin approval before becoming "published" and visible to all users.

3. **Blocked Users:** When a user is blocked (`isBlocked: true`), they cannot create or update listings. Admins can block/unblock users.

4. **Authentication:** Include JWT token in Authorization header for protected endpoints: `Authorization: Bearer <token>`

5. **Pagination:** Use `page` and `limit` query parameters for endpoints that return lists of data.

6. **CORS:** The backend has CORS enabled for `http://localhost:3000` in development.

7. **Image Storage:** Images are currently stored as base64 strings in MongoDB. For production, consider using cloud storage services like AWS S3 or Cloudinary.

8. **Database:** MongoDB database name is "boarding", running on default port 27017.

---

## Example API Workflow

### User Registration and Property Posting Flow:

1. **Sign Up:** `POST /auth/signup` with firstname, lastname, email, password
2. **Login:** `POST /auth/login` to get JWT token
3. **Create Listing:** `POST /listings` with all required property fields
4. **Check Status:** `GET /listings/my-listings` to see listing status (pending)
5. **Admin Approval:** Admin reviews and approves via `PUT /listings/:id/status`
6. **Published:** Listing now appears in public `GET /listings` results

### Admin Dashboard Flow:

1. **Login as Admin:** `POST /auth/login` with admin credentials
2. **Get Stats:** `GET /admin/stats` for dashboard overview
3. **View Pending Listings:** From stats response `recentPendingListings`
4. **Approve/Reject:** `PUT /listings/:id/status` to publish or reject
5. **Manage Users:** `GET /admin/users` to view all users with listing counts
6. **User Actions:** Update status, view details, or delete users as needed
   