/**
 * Password Security Validation Utility
 * Implements OWASP password guidelines
 */

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validatePasswordStrength = (password) => {
  const errors = [];

  // Minimum length check (OWASP recommends 8+)
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // Maximum length check (prevent DoS attacks)
  if (password && password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for at least one digit
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*()_+-=[]{}; etc.)");
  }

  // Check for common passwords (basic list)
  const commonPasswords = [
    "password", "password123", "12345678", "qwerty", "abc123",
    "password1", "123456789", "12345", "1234567890", "letmein",
    "welcome", "monkey", "dragon", "master", "sunshine", "princess",
    "admin", "admin123", "root", "toor", "pass", "test", "guest"
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common and easily guessable");
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password should not contain repeated characters (e.g., aaa, 111)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate password match
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} - { isValid: boolean, error: string }
 */
const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: "Passwords do not match",
    };
  }

  return { isValid: true };
};

/**
 * Check if password contains user information
 * @param {string} password - Password to check
 * @param {Object} userInfo - User information (email, firstname, lastname)
 * @returns {Object} - { isValid: boolean, error: string }
 */
const validatePasswordNoUserInfo = (password, userInfo = {}) => {
  const { email, firstname, lastname } = userInfo;
  const lowerPassword = password.toLowerCase();

  // Check email local part
  if (email) {
    const emailLocalPart = email.split("@")[0].toLowerCase();
    if (lowerPassword.includes(emailLocalPart)) {
      return {
        isValid: false,
        error: "Password should not contain your email address",
      };
    }
  }

  // Check first name
  if (firstname && firstname.length >= 3 && lowerPassword.includes(firstname.toLowerCase())) {
    return {
      isValid: false,
      error: "Password should not contain your first name",
    };
  }

  // Check last name
  if (lastname && lastname.length >= 3 && lowerPassword.includes(lastname.toLowerCase())) {
    return {
      isValid: false,
      error: "Password should not contain your last name",
    };
  }

  return { isValid: true };
};

/**
 * Comprehensive password validation
 * @param {string} password - Password to validate
 * @param {string} confirmPassword - Confirmation password (optional)
 * @param {Object} userInfo - User information (optional)
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validatePassword = (password, confirmPassword = null, userInfo = null) => {
  const allErrors = [];

  // Strength validation
  const strengthCheck = validatePasswordStrength(password);
  if (!strengthCheck.isValid) {
    allErrors.push(...strengthCheck.errors);
  }

  // Match validation
  if (confirmPassword !== null) {
    const matchCheck = validatePasswordMatch(password, confirmPassword);
    if (!matchCheck.isValid) {
      allErrors.push(matchCheck.error);
    }
  }

  // User info validation
  if (userInfo) {
    const userInfoCheck = validatePasswordNoUserInfo(password, userInfo);
    if (!userInfoCheck.isValid) {
      allErrors.push(userInfoCheck.error);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
};

/**
 * Generate password strength score
 * @param {string} password - Password to score
 * @returns {Object} - { score: number (0-100), strength: string }
 */
const calculatePasswordStrength = (password) => {
  let score = 0;

  if (!password) return { score: 0, strength: "Very Weak" };

  // Length score (max 30 points)
  score += Math.min(password.length * 2, 30);

  // Character variety score (max 40 points)
  if (/[a-z]/.test(password)) score += 10; // lowercase
  if (/[A-Z]/.test(password)) score += 10; // uppercase
  if (/[0-9]/.test(password)) score += 10; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 10; // special chars

  // Complexity bonus (max 30 points)
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) score += 10;

  // Determine strength label
  let strength;
  if (score < 30) strength = "Very Weak";
  else if (score < 50) strength = "Weak";
  else if (score < 70) strength = "Moderate";
  else if (score < 90) strength = "Strong";
  else strength = "Very Strong";

  return { score: Math.min(score, 100), strength };
};

module.exports = {
  validatePasswordStrength,
  validatePasswordMatch,
  validatePasswordNoUserInfo,
  validatePassword,
  calculatePasswordStrength,
};
