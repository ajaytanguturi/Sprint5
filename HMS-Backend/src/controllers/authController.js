const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const User = require('../models/userModel');
const Employee = require('../models/employeeModel');
const { generateAccessToken, generateRefreshToken, generatePasswordResetToken, } = require('../utils/generateToken');
const { sendRegistrationPendingEmail, sendAdminNotificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const Patient = require('../models/patientModel');
const mongoose = require('mongoose');

// constants
const VALID_ROLES = ['OWNER', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'NURSE', 'LAB_TECH', 'PHARMACIST', 'PATIENT'];
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN']);
const SALT_ROUNDS = 12;

// helper functions
const hashPassword = (plain) => bcrypt.hash(plain, bcrypt.genSaltSync(SALT_ROUNDS));
const buildTokenPayload = (user) => ({
    id: user._id,
    userId: user.userId,
    email: user.email,
    roles: user.roles,
    status: user.status,
    employeeId: user.employeeId || null,
    patientId: user.patientId || null,
});

const validateRoles = (roles) => {
    const arr = Array.isArray(roles) ? roles : [roles];
    const invalid = arr.filter((r) => !VALID_ROLES.includes(r));
    if (invalid.length) {
        const err = new Error(`Invalid roles: [${invalid.join(', ')}]. Accepted: [${VALID_ROLES.join(', ')}]`);
        err.statusCode = 400;
        throw err;
    }
    return arr;
};

const isAdminLevel = (roles) => roles.some((r) => ADMIN_ROLES.has(r));
const handleControllerError = (res, error, context) => {
    console.error(`[${context}]`, error.message);
    if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e) => e.message).join(', ');
        return res.status(400).json({ success: false, message: messages });
    }
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
};

const register = async (req, res) => {
    try {
        const { email, password, roles, employeeId, status } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({ success: false, message: `Email "${email}" is already registered` });
        }
        const rolesArr = validateRoles(roles);
        let resolvedEmployeeId = null;
        if (!isAdminLevel(rolesArr)) {
            if (!employeeId) {
                return res.status(400).json({ success: false, message: `employeeId is required for roles: [${rolesArr.join(', ')}]` });
            }
            const emp = await Employee.findOne({ employeeCode: employeeId });
            if (!emp) {
                return res.status(404).json({ success: false, message: `No employee found with code: ${employeeId}` });
            }
            if (emp.status === 'INACTIVE') {
                return res.status(400).json({ success: false, message: `Employee "${emp.name}" is inactive` });
            }
            const empUserExists = await User.findOne({ employeeId: emp._id });
            if (empUserExists) {
                return res.status(409).json({ success: false, message: `Employee already has an account: ${empUserExists.email}` });
            }
            resolvedEmployeeId = emp._id;
        }
        const passwordHash = await hashPassword(password);
        const saved = await new User({
            email: normalizedEmail,
            passwordHash,
            roles: rolesArr,
            employeeId: resolvedEmployeeId,
            status: status || 'ACTIVE',
            approvalStatus: 'APPROVED',
        }).save();
        const populated = await User.findById(saved._id).populate('employeeId', 'employeeCode name designation department email phone');
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: populated.userId,
                email: populated.email,
                roles: populated.roles,
                status: populated.status,
                employee: populated.employeeId || null,
            },
        });
    } catch (err) {
        return handleControllerError(res, err, 'register');
    }
};

const selfRegister = async (req, res) => {
    try {
        const {
            name, phone, email, department, designation,
            medicalRegistrationNo, specialization, qualification,
            consultationFee, availabilitySlots, joiningDate,
            password, roles,
        } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const [empByEmail, userByEmail, empByPhone] = await Promise.all([
            Employee.findOne({ email: normalizedEmail }),
            User.findOne({ email: normalizedEmail }),
            Employee.findOne({ phone }),
        ]);
        if (empByEmail) {
            return res.status(409).json({ success: false, message: `An employee with email "${email}" already exists` });
        }
        if (userByEmail) {
            return res.status(409).json({ success: false, message: `A user account with email "${email}" already exists` });
        }
        if (empByPhone) {
            return res.status(409).json({ success: false, message: `An employee with phone "${phone}" already exists` });
        }
        const rolesArr = validateRoles(roles);
        if (isAdminLevel(rolesArr)) {
            return res.status(403).json({ success: false, message: 'Self-registration is not allowed for OWNER or ADMIN roles' });
        }
        if (medicalRegistrationNo) {
            const regNoConflict = await Employee.findOne({ medicalRegistrationNo });
            if (regNoConflict) {
                return res.status(409).json({ success: false, message: `Medical registration number "${medicalRegistrationNo}" is already in use` });
            }
        }
        const employee = await new Employee({
            name,
            phone,
            email: normalizedEmail,
            department,
            designation,
            medicalRegistrationNo: medicalRegistrationNo?.trim() || undefined,
            specialization,
            qualification,
            consultationFee,
            availabilitySlots,
            joiningDate: joiningDate || Date.now(),
            status: 'ACTIVE',
        }).save();
        const passwordHash = await hashPassword(password);
        const user = await new User({
            email: normalizedEmail,
            passwordHash,
            roles: rolesArr,
            employeeId: employee._id,
            status: 'ACTIVE',
            approvalStatus: 'PENDING',
        }).save();
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@hospital.com';
        await Promise.allSettled([
            sendRegistrationPendingEmail(employee.email, employee.name),
            sendAdminNotificationEmail(adminEmail, employee.name, employee.email),
        ]);
        return res.status(201).json({
            success: true,
            message: 'Registration submitted successfully. Your account is awaiting admin approval.',
            data: {
                userId: user.userId,
                email: user.email,
                roles: user.roles,
                approvalStatus: user.approvalStatus,
                employeeCode: employee.employeeCode,
            },
        });
    } catch (err) {
        return handleControllerError(res, err, 'selfRegister');
    }
};

const patientRegister = async (req, res) => {
    try {
        const { name, email, phone, gender, dob, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const [existingUser, existingPatient] = await Promise.all([
            User.findOne({ email: normalizedEmail }),
            Patient.findOne({ email: normalizedEmail }),
        ]);

        if (existingUser || existingPatient) {
            return res.status(409).json({ success: false, message: `Email "${email}" is already registered` });
        }

        const dobDate = new Date(dob);
        if (dobDate > new Date()) {
            return res.status(400).json({ success: false, message: 'Date of birth cannot be in the future' });
        }

        // Generate matching ObjectIds beforehand to prevent validation hook failures
        const userId = new mongoose.Types.ObjectId();
        const patientId = new mongoose.Types.ObjectId();
        const passwordHash = await bcrypt.hash(password, 12);

        // 1. Create Patient profile
        const patient = new Patient({
            _id: patientId,
            name,
            phone: phone.trim(),
            email: normalizedEmail,
            gender,
            dob: dobDate,
            registeredBy: userId,
            status: 'ACTIVE',
        });
        await patient.save();

        // 2. Create User account
        const user = new User({
            _id: userId,
            email: normalizedEmail,
            passwordHash,
            roles: ['PATIENT'],
            patientId: patientId,
            status: 'ACTIVE',
            approvalStatus: 'APPROVED',
        });
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Patient registered successfully. You can now log in.',
            data: {
                userId: user.userId,
                email: user.email,
                roles: user.roles,
                status: user.status,
                patient: {
                    UHID: patient.UHID,
                    name: patient.name,
                    phone: patient.phone,
                    email: patient.email,
                    gender: patient.gender,
                    age: patient.age,
                }
            }
        });
    }
    catch (err) {
        return handleControllerError(res, err, 'patientRegister');
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+passwordHash +refreshToken')
            .populate('employeeId', 'employeeCode name designation department email phone specialization')
            .populate('patientId', 'UHID name phone email gender dob address emergencyContact medicalHistory');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (user.status === 'INACTIVE') {
            return res.status(403).json({ success: false, message: 'Your account is inactive. Contact administrator' });
        }
        if (user.approvalStatus === 'PENDING') {
            return res.status(403).json({ success: false, message: 'Your account is awaiting admin approval' });
        }
        if (user.approvalStatus === 'REJECTED') {
            return res.status(403).json({ success: false, message: 'Your account registration was rejected. Contact administrator' });
        }
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (user.isTemporaryPassword) {
            return res.status(403).json({
                success: false,
                message: 'You must reset your temporary password before logging in. Check your email for the reset link.',
                requirePasswordReset: true,
            });
        }
        const payload = buildTokenPayload(user);
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken({ id: user._id });
        user.refreshToken = refreshToken;
        user.lastLoginAt = new Date();
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                userId: user.userId,
                email: user.email,
                roles: user.roles,
                status: user.status,
                employee: user.employeeId || null,
                patient: user.patientId || null,
                lastLoginAt: user.lastLoginAt,
                tokens: { accessToken, refreshToken },
            },
        });
    } catch (err) {
        return handleControllerError(res, err, 'login');
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate(
            'employeeId',
            'employeeCode name designation department email phone specialization qualification consultationFee',
            'patientId', 'UHID name phone email gender address emergencyContact medicalHistory'
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: {
                userId: user.userId,
                email: user.email,
                roles: user.roles,
                status: user.status,
                approvalStatus: user.approvalStatus,
                employee: user.employeeId || null,
                patient: user.patientId || null,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        return handleControllerError(res, err, 'getMe');
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('employeeId', 'name');
        if (!user) {
            return res.status(200).json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
        }
        const resetToken = generatePasswordResetToken({ id: user._id, email: user.email });
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3_600_000; // 1 hour
        await user.save();
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const displayName = user.employeeId?.name || user.email;
        await sendPasswordResetEmail(user.email, displayName, resetUrl);
        return res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
    } catch (err) {
        return handleControllerError(res, err, 'forgotPassword');
    }
};

const resetPassword = async (req, res) => {
    try {
        console.log(req.body);
        const { token, newPassword } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        }).select('+resetPasswordToken +resetPasswordExpires');
        if (!user) {
            return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired' });
        }
        user.passwordHash = await hashPassword(newPassword);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.isTemporaryPassword = false;
        await user.save();
        return res.status(200).json({ success: true, message: 'Password reset successful. You may now log in.' });
    } catch (err) {
        return handleControllerError(res, err, 'resetPassword');
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        user.passwordHash = await hashPassword(newPassword);
        user.isTemporaryPassword = false;
        await user.save();
        return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        return handleControllerError(res, err, 'changePassword');
    }
};

module.exports = { register, selfRegister, patientRegister, login, getMe, forgotPassword, resetPassword, changePassword };