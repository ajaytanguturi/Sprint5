const jwt = require("jsonwebtoken");
const Patient = require("../models/Patients");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Authenticates a patient JWT; rejects employee tokens so the auth domains stay separate
const authenticatePatient = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.NO_TOKEN);
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    // jwt.verify throwing is expected control flow for bad/expired tokens
    try {
        decoded = jwt.verify(token, process.env.JWT_PATIENT_SECRET, { algorithms: ["HS256"] });
    }
    catch {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    if (decoded.type !== "PATIENT" || !decoded.patientUHID) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Reject tokens whose patient has since been soft-deleted or deactivated
    // (the soft-delete query hook makes a deleted patient's lookup return null)
    const patient = await Patient.findOne({ UHID: decoded.patientUHID })
        .select("status tokenVersion mustChangePassword");

    // tokenVersion mismatch means the password changed after this token was issued
    if (
        !patient ||
        patient.status !== "ACTIVE" ||
        patient.tokenVersion !== decoded.tokenVersion
    ) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // A patient on a temporary password may only reach the patient auth router
    // (change-password); the code lets the mobile app route to that screen
    if (patient.mustChangePassword && req.baseUrl !== "/api/patient/auth") {
        throw new AppError(
            STATUS.FORBIDDEN,
            MESSAGES.AUTH.PASSWORD_CHANGE_REQUIRED,
            undefined,
            "PASSWORD_CHANGE_REQUIRED"
        );
    }

    req.patient = { patientUHID: decoded.patientUHID };

    next();
};

module.exports = authenticatePatient;
