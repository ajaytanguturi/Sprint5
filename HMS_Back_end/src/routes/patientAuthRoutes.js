const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const patientAuth = require("../middlewares/patientAuthMiddleware");
//const { loginLimiter, passwordResetLimiter } = require("../middlewares/rateLimiters");
const controller = require("../controllers/patientAuthController");
const {
    patientRegisterValidation,
    patientLoginValidation,
    patientChangePasswordValidation,
    patientForgotPasswordValidation,
    patientResetPasswordValidation
} = require("../validators/patientAuthValidators");

// Public patient auth routes
router.post(
    "/register",
    patientRegisterValidation,
    validate,
    controller.register
);

router.post(
    "/login",
    //loginLimiter,
    patientLoginValidation,
    validate,
    controller.login
);

router.post(
    "/forgot-password",
    //passwordResetLimiter,
    patientForgotPasswordValidation,
    validate,
    controller.forgotPassword
);

router.post(
    "/reset-password",
    //passwordResetLimiter,
    patientResetPasswordValidation,
    validate,
    controller.resetPassword
);

// Authenticated password change
router.put(
    "/change-password",
    patientAuth,
    patientChangePasswordValidation,
    validate,
    controller.changePassword
);

// Session lifecycle; both carry the refresh token in the body, so no access-token
// auth is required (they must work after the access token has expired)
router.post("/refresh", controller.refresh);

router.post("/logout", controller.logout);

module.exports = router;
