const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
//const { loginLimiter, passwordResetLimiter } = require("../middlewares/rateLimiters");
const controller = require("../controllers/authController");
const {
  employeeBaseValidators,
  joiningDateValidator,
} = require("../validators/employeeValidation");
const { emailValidator } = require("../validators/sharedValidators");
const { passwordStrengthValidator } = require("../validators/passwordValidator");

// Full employee field set plus a password strength check
const selfRegisterValidation = [
  ...employeeBaseValidators,
  passwordStrengthValidator("password"),
  joiningDateValidator(),
];

// Credentials validation for login
const loginValidation = [
  emailValidator("email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Validates current password, new password strength, and confirmation match
const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  passwordStrengthValidator("newPassword"),
  body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

// Email presence check for the forgot-password flow
const forgotPasswordValidation = [
  emailValidator("email"),
];

// Validates the reset token, new password strength, and confirmation match
const resetPasswordValidation = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),
  passwordStrengthValidator("newPassword"),
  body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

// Auth routes
router.post("/login", loginValidation, validate, controller.login); //loginLimiter

router.post(
  "/self-register",
  selfRegisterValidation,
  validate,
  controller.selfRegister,
);

router.put(
  "/change-password",
  auth,
  changePasswordValidation,
  validate,
  controller.changePassword,
);

router.post(
  "/forgot-password",
  //passwordResetLimiter,
  forgotPasswordValidation,
  validate,
  controller.forgotPassword,
);

router.post(
  "/reset-password",
  // passwordResetLimiter,
  resetPasswordValidation,
  validate,
  controller.resetPassword,
);

// Logout/refresh take the refresh token in the body, so they must work even
// after the short-lived access token has already expired (no auth middleware)
router.post("/logout", controller.logout);

router.post("/refresh", controller.refresh);

router.get("/me", auth, controller.me);

module.exports = router;