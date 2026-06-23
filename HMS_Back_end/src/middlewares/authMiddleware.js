const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.NO_TOKEN);
    }

    const token = authHeader.split(" ")[1];

    // jwt.verify throwing is expected control flow for bad/expired tokens
    try {
        req.user = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );
    }
    catch {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Reject patient (or malformed) tokens up front, so a missing employeeCode
    // can never degrade into a match-anything query that authenticates as someone else
    if (req.user.type !== "EMPLOYEE" || !req.user.employeeCode) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Reject tokens whose account has since been soft-deleted or deactivated
    // (the soft-delete query hook makes a deleted user's lookup return null)
    const user = await User.findOne({ employeeCode: req.user.employeeCode })
        .select("status tokenVersion mustChangePassword");

    // tokenVersion mismatch means the password changed after this token was issued
    if (
        !user ||
        String(user.status) !== "ACTIVE" ||
        user.tokenVersion !== req.user.tokenVersion
    ) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // A user with a temporary password may only reach the auth router (change-password,
    // me); every other feature route is blocked until they set a real password
    if (user.mustChangePassword && req.baseUrl !== "/api/auth") {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.PASSWORD_CHANGE_REQUIRED);
    }

    next();
};

module.exports = authenticateUser;
