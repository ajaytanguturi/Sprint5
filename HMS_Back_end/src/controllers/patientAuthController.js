const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const Patient = require("../models/Patients");
const {
    signAccessToken,
    issueRefreshToken,
    rotateRefreshToken,
    findByHash,
    revokeByHash,
    revokeAllForSubject,
    hashToken
} = require("../utils/tokenService");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const { toSafePatient } = require("../utils/toSafePatient");
const recordAudit = require("../utils/recordAudit");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
require("dotenv").config();

const SALT_ROUNDS = 12;

// Hand-typed reset code alphabet; skips confusable chars, ~48 bits beats the 15-min expiry
const RESET_CODE_ALPHABET =
    "ABCDEFGHJKMNPQRSTUVWXYZ" +
    "abcdefghjkmnpqrstuvwxyz" +
    "23456789" +
    "!@#$%&*+-=?";
const RESET_CODE_LENGTH = 8;

const generateResetCode = () =>
    Array.from(
        { length: RESET_CODE_LENGTH },
        () => RESET_CODE_ALPHABET[crypto.randomInt(RESET_CODE_ALPHABET.length)]
    ).join("");

// Short-lived patient access token; the PATIENT marker blocks use on employee routes
const signPatientToken = (patient) =>
    signAccessToken({
        patientUHID: patient.UHID,
        type: "PATIENT",
        tokenVersion: patient.tokenVersion
    });

// Self-service registration; own password, account immediately ACTIVE
exports.register = async (req, res) => {

    const {
        name,
        phone,
        email,
        password,
        gender,
        dob,
        address,
        emergencyContact
    } = req.body;

    const existingPatient = await Patient.findOne({ email });

    if (existingPatient) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.PATIENT.ALREADY_REGISTERED);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const patient = new Patient({
        name,
        phone,
        email,
        passwordHash,
        gender,
        dob,
        address,
        emergencyContact,
        status: "ACTIVE",
        mustChangePassword: false
    });

    await patient.save();

    return sendSuccess(res, STATUS.CREATED, MESSAGES.PATIENT.REGISTER_SUCCESS, {
        patient: toSafePatient(patient)
    });
};

// Authenticate a patient by email + password and return a JWT
exports.login = async (req, res) => {

    const { email, password } = req.body;

    // Records a failed attempt before the request is rejected
    const auditFailedLogin = (actorType, actorId) =>
        recordAudit({
            actorType,
            actorId,
            action: "USER_LOGIN_FAILED",
            ipAddress: req.ip,
            message: MESSAGES.AUDIT.USER_LOGIN_FAILED(email)
        });

    const patient = await Patient.findOne({ email });
    if (!patient) {
        await auditFailedLogin("ANONYMOUS", email);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isMatch = Boolean(await bcrypt.compare(password, patient.passwordHash));
    if (!isMatch) {
        await auditFailedLogin("ANONYMOUS", email);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (patient.status !== "ACTIVE") {
        await auditFailedLogin("PATIENT", patient.UHID);
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    const accessToken = signPatientToken(patient);

    const refreshToken = await issueRefreshToken({
        subjectType: "PATIENT",
        subjectId: patient.UHID,
        req
    });

    await recordAudit({
        actorType: "PATIENT",
        actorId: patient.UHID,
        action: "USER_LOGIN",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.USER_LOGIN(patient.UHID)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, {
        accessToken,
        refreshToken,
        patient: toSafePatient(patient)
    });
};

// Allow an authenticated patient to change their own password
exports.changePassword = async (req, res) => {

    const { patientUHID } = req.patient;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const patient = await Patient.findOne({ UHID: patientUHID });
    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    const isMatch = Boolean(await bcrypt.compare(currentPassword, patient.passwordHash));
    if (!isMatch) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const samePassword = Boolean(await bcrypt.compare(newPassword, patient.passwordHash));
    if (samePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    patient.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    patient.mustChangePassword = false;
    // Invalidate every existing session: version bump kills live access tokens,
    // revoking refresh tokens stops renewal, forcing a fresh login
    patient.tokenVersion += 1;
    await patient.save();

    await revokeAllForSubject("PATIENT", patient.UHID);

    await recordAudit({
        actorType: "PATIENT",
        actorId: patient.UHID,
        action: "PASSWORD_CHANGED",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PASSWORD_CHANGED(patient.UHID)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_CHANGED);
};

// Generate a short-lived reset code and email it to the patient
exports.forgotPassword = async (req, res) => {

    const { email } = req.body;

    const patient = await Patient.findOne({ email });

    // Logged internally regardless of whether the email matched (the response stays neutral)
    await recordAudit({
        actorType: patient ? "PATIENT" : "ANONYMOUS",
        actorId: patient ? patient.UHID : email,
        action: "PASSWORD_RESET_REQUESTED",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PASSWORD_RESET_REQUESTED(email)
    });

    // Same neutral response always, so registered emails are not leaked
    const neutralResponse = () =>
        sendSuccess(res, STATUS.OK, MESSAGES.AUTH.RESET_CODE_SENT);

    if (!patient || patient.status !== "ACTIVE") {
        return neutralResponse();
    }

    // Store only the hash of the code; the raw value is emailed and never persisted.
    const resetCode = generateResetCode();
    patient.resetPasswordTokenHash = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");
    patient.resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await patient.save();

    // dev only: print the code so it can be tested without a real inbox
    if (process.env.NODE_ENV !== "production") {
        console.log(`\n[DEV] Patient reset code for ${patient.email}: ${resetCode}\n`);
    }

    // Email failures must not break the neutral response
    try {
        await sendEmail({
            to: patient.email,
            ...emailTemplates.patientPasswordResetCode({ resetCode })
        });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }

    return neutralResponse();
};

// Validate the reset code and set a new password
exports.resetPassword = async (req, res) => {

    const { resetCode, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const hashedCode = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");

    const patient = await Patient.findOne({
        resetPasswordTokenHash: hashedCode,
        resetPasswordTokenExpiry: { $gt: new Date() }
    });

    if (!patient || patient.status !== "ACTIVE") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_RESET_CODE);
    }

    const isSamePassword = Boolean(await bcrypt.compare(newPassword, patient.passwordHash));
    if (isSamePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    patient.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    // Clear the reset fields back to undefined so they drop out of the document
    patient.resetPasswordTokenHash = undefined;
    patient.resetPasswordTokenExpiry = undefined;
    patient.mustChangePassword = false;
    // Likely-compromised account: kill all live access and refresh tokens
    patient.tokenVersion += 1;

    await patient.save();

    await revokeAllForSubject("PATIENT", patient.UHID);

    await recordAudit({
        actorType: "PATIENT",
        actorId: patient.UHID,
        action: "PASSWORD_RESET_COMPLETED",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PASSWORD_RESET_COMPLETED(patient.UHID)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
};

// Exchange a valid refresh token for a new access token, rotating the refresh token
exports.refresh = async (req, res) => {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const result = await rotateRefreshToken({
        rawToken: refreshToken,
        subjectType: "PATIENT",
        req
    });

    if (result.status !== "OK") {
        if (result.status === "REUSE_DETECTED") {
            await recordAudit({
                actorType: "PATIENT",
                actorId: result.subjectId,
                action: "REFRESH_REUSE_DETECTED",
                ipAddress: req.ip,
                message: MESSAGES.AUDIT.REFRESH_REUSE_DETECTED(result.subjectId)
            });
        }
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const patient = await Patient.findOne({ UHID: result.subjectId })
        .select("UHID status tokenVersion");

    // Subject vanished or was deactivated since the refresh token was issued
    if (!patient || patient.status !== "ACTIVE") {
        await revokeAllForSubject("PATIENT", result.subjectId);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const accessToken = signPatientToken(patient);

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.TOKEN_REFRESHED, {
        accessToken,
        refreshToken: result.newRefreshToken
    });
};

// Revoke the presented refresh token so the session cannot be refreshed again
exports.logout = async (req, res) => {
    const { refreshToken } = req.body || {};
    const tokenHash = refreshToken ? hashToken(refreshToken) : null;

    // This route has no auth middleware, so identity comes from the token itself.
    // Look it up regardless of revocation state so an already-revoked token still
    // names its owner.
    const record = tokenHash ? await findByHash(tokenHash) : null;

    // Audit only when we can attribute the logout to a subject; an absent or
    // unknown token tells us nothing about who left, so we skip the entry rather
    // than record a meaningless "unknown" logout. Revocation stays decoupled below.
    if (record) {
        await recordAudit({
            actorType: "PATIENT",
            actorId: record.subjectId,
            action: "USER_LOGOUT",
            ipAddress: req.ip,
            message: MESSAGES.AUDIT.USER_LOGOUT(record.subjectId)
        });
    }

    // Revoke separately; a no-op when the token is absent or already revoked
    if (tokenHash) {
        await revokeByHash(tokenHash);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
};
