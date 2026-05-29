const mongoose = require('mongoose');
const Counter = require('./counterModel');

const userSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            select: false,
        },
        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'INACTIVE'],
                message: 'Status must be ACTIVE or INACTIVE',
            },
            default: 'INACTIVE',
        },
        roles: {
            type: [String],
            enum: {
                values: ['OWNER', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'NURSE', 'LAB_TECH', 'PHARMACIST'],
                message: 'Invalid role provided',
            },
            required: [true, 'At least one role is required'],
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            default: null,
        },
        approvalStatus: {
            type: String,
            enum: {
                values: ['PENDING', 'APPROVED', 'REJECTED'],
                message: 'Approval status must be PENDING, APPROVED, or REJECTED',
            },
            default: 'PENDING',
        },
        isTemporaryPassword: {
            type: Boolean,
            default: false,
        },
        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            default: null,
            select: false,
        },
        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

userSchema.pre('save', async function () {
    if (!this.userId) {
        const seq = await Counter.getNextSequence('userId');
        this.userId = `USR-${String(seq).padStart(4, '0')}`;
    }
});

userSchema.pre('save', function () {
    const isAdminLevel = this.roles.some(
        (r) => r === 'OWNER' || r === 'ADMIN'
    );

    if (!isAdminLevel && !this.employeeId) {
        throw new Error(
            `employeeId is required for roles: ${this.roles.join(', ')}`
        );
    }
});

module.exports = mongoose.model('User', userSchema);