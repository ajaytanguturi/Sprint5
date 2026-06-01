const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const User = require('../models/userModel');
const Employee = require('../models/employeeModel');
const { generatePasswordResetToken } = require('../utils/generateToken');
const { generateTemporaryPassword } = require('../utils/passwordGenerator');
const { findEmployeeConflicts } = require('./employeeController');
const { sendApprovalEmail, sendRejectionEmail, sendTemporaryPasswordEmail } = require('../utils/emailService');

const saltRound = 12;
const tempPasswordExpire = 24 * 3_600_000; // 1 day

const getPendingApprovals = async (req, res) => {
    try {
        const pending = await User.find({ approvalStatus: 'PENDING' })
            .populate('employeeId', 'employeeCode name designation department email phone specialization')
            .sort({ createdAt: -1 });
        const data = pending.map((u) => ({
            userId: u.userId,
            email: u.email,
            roles: u.roles,
            status: u.status,
            approvalStatus: u.approvalStatus,
            employee: u.employeeId,
            registeredAt: u.createdAt,
        }));
        return res.status(200).json({ success: true, message: 'Pending approvals retrieved', data });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

const approveEmployee = async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId }).populate('employeeId', 'name email');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.approvalStatus !== 'PENDING') {
            return res.status(400).json({ success: false, message: `User is already ${user.approvalStatus.toLowerCase()}` });
        }
        user.approvalStatus = 'APPROVED';
        await user.save();
        const loginUrl = `${process.env.FRONTEND_URL}/login`;
        const displayName = user.employeeId?.name || user.email;
        await sendApprovalEmail(user.email, displayName, loginUrl).catch((e) =>
            console.warn('[approveEmployee] email failed:', e.message)
        );
        return res.status(200).json({
            success: true,
            message: 'Employee approved. Confirmation email sent.',
            data: { userId: user.userId, email: user.email, approvalStatus: user.approvalStatus },
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

const rejectEmployee = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findOne({ userId: req.params.userId }).populate('employeeId', 'name email');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.approvalStatus !== 'PENDING') {
            return res.status(400).json({ success: false, message: `User is already ${user.approvalStatus.toLowerCase()}` });
        }
        user.approvalStatus = 'REJECTED';
        await user.save();
        const displayName = user.employeeId?.name || user.email;
        await sendRejectionEmail(user.email, displayName, reason).catch((e) =>
            console.warn('[rejectEmployee] email failed:', e.message)
        );
        return res.status(200).json({
            success: true,
            message: 'Employee rejected. Notification email sent.',
            data: { userId: user.userId, email: user.email, approvalStatus: user.approvalStatus },
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

const createEmployeeWithTempPassword = async (req, res) => {
    try {
        const {
            name, phone, email, department, designation,
            medicalRegistrationNo, specialization, qualification,
            consultationFee, availabilitySlots, joiningDate, roles,
        } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const [employeeConflicts, existingUser] = await Promise.all([
            findEmployeeConflicts({ email: normalizedEmail, phone, medicalRegistrationNo }),
            User.findOne({ email: normalizedEmail }),
        ]);
        if (employeeConflicts.length) {
            return res.status(409).json({ success: false, message: employeeConflicts.join('; ') });
        }
        if (existingUser) {
            return res.status(409).json({ success: false, message: `A user account with email "${email}" already exists` });
        }
        const rolesArr = Array.isArray(roles) ? roles : [roles];
        const isAdminLevel = rolesArr.some((r) => r === 'OWNER' || r === 'ADMIN');
        let resolvedEmployeeId = null;
        if (!isAdminLevel) {
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
            resolvedEmployeeId = employee._id;
        }
        const tempPassword = generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(tempPassword, bcrypt.genSalt(saltRound));
        const user = await new User({
            email: normalizedEmail,
            passwordHash,
            roles: rolesArr,
            employeeId: resolvedEmployeeId,
            status: 'ACTIVE',
            approvalStatus: 'APPROVED',
            isTemporaryPassword: true,
        }).save();
        const resetToken = generatePasswordResetToken({ id: user._id, email: user.email });
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + tempPasswordExpire;
        await user.save();
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        await sendTemporaryPasswordEmail(user.email, name, tempPassword, resetUrl).catch((e) =>
            console.warn('[createEmployeeWithTempPassword] email failed:', e.message)
        );
        let employeeCode = null;
        if (resolvedEmployeeId) {
            const emp = await Employee.findById(resolvedEmployeeId).select('employeeCode');
            employeeCode = emp?.employeeCode || null;
        }
        return res.status(201).json({
            success: true,
            message: 'Employee created. Password setup link sent to their email.',
            data: { userId: user.userId, email: user.email, roles: user.roles, employeeCode },
        });
    } catch (error) {
        console.error(error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message).join(', ');
            return res.status(400).json({ success: false, message: messages });
        }
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .populate('employeeId', 'employeeCode name designation department email phone')
            .sort({ createdAt: -1 });
        const data = users.map((u) => ({
            userId: u.userId,
            email: u.email,
            roles: u.roles,
            status: u.status,
            approvalStatus: u.approvalStatus,
            employee: u.employeeId,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
        }));
        return res.status(200).json({ success: true, message: 'All users retrieved successfully', data });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

module.exports = { getPendingApprovals, approveEmployee, rejectEmployee, createEmployeeWithTempPassword, getAllUsers };