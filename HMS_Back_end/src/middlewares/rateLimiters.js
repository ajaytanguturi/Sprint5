const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Build a limiter that funnels rejections through the global error handler
// so throttled responses use the same envelope as every other error
const buildLimiter = ({ windowMs, limit, message }) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next) =>
            next(new AppError(STATUS.TOO_MANY_REQUESTS, message))
    });

// Brute-force guard on credential submission
const loginLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: MESSAGES.AUTH.TOO_MANY_ATTEMPTS
});

// Throttles reset-code guessing and reset-email spam
const passwordResetLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: MESSAGES.AUTH.TOO_MANY_REQUESTS
});

module.exports = { loginLimiter, passwordResetLimiter };
