const express = require('express');
const { body } = require('express-validator');
const { register, selfRegister, login, getMe, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

const registerRules = [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('roles').isArray({ min: 1 }).withMessage('At least one role is required'),
];

const selfRegisterRules = [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('designation').trim().notEmpty().withMessage('Designation is required'),
    body('roles').isArray({ min: 1 }).withMessage('At least one role is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordRules = [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

const resetPasswordRules = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const changePasswordRules = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .custom((val, { req }) => {
            if (val === req.body.currentPassword) {
                throw new Error('New password must differ from the current password');
            }
            return true;
        }),
];

router.post('/register', registerRules, validate, register);
router.post('/self-register', selfRegisterRules, validate, selfRegister);
router.post('/login', loginRules, validate, login);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);

router.get('/me', protect, getMe);
router.put('/change-password', protect, changePasswordRules, validate, changePassword);

module.exports = router;