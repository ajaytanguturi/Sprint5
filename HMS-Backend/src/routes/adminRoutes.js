const express = require('express');
const { body } = require('express-validator');
const { getPendingApprovals, approveEmployee, rejectEmployee, createEmployeeWithTempPassword, getAllUsers } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();
const VALID_DEPARTMENTS = ['OPD', 'IPD', 'Lab', 'Pharmacy', 'Admin'];

const createEmployeeRules = [
    body('name').trim().notEmpty().withMessage('Employee name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
    body('department')
        .isIn(VALID_DEPARTMENTS)
        .withMessage(`Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
    body('designation').trim().notEmpty().withMessage('Designation is required'),
    body('roles').isArray({ min: 1 }).withMessage('At least one role is required'),
    body('consultationFee')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Consultation fee must be a non-negative number'),
];

const rejectRules = [
    body('reason').optional().trim(),
];

router.use(protect, authorize('ADMIN', 'OWNER'));

router.get('/pending-approvals', getPendingApprovals);
router.put('/approve/:userId', approveEmployee);
router.put('/reject/:userId', rejectRules, validate, rejectEmployee);
router.post('/create-employee', createEmployeeRules, validate, createEmployeeWithTempPassword);
router.get('/users', getAllUsers);


module.exports = router;