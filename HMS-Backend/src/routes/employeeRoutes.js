const express = require('express');
const { body } = require('express-validator');
const {
    createEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    toggleEmployeeStatus,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ── Validation rule sets ─────────────────────────────────────────────────────

const VALID_DEPARTMENTS = ['OPD', 'IPD', 'Lab', 'Pharmacy', 'Admin'];

const createRules = [
    body('name').trim().notEmpty().withMessage('Employee name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
    body('department')
        .isIn(VALID_DEPARTMENTS)
        .withMessage(`Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
    body('designation').trim().notEmpty().withMessage('Designation is required'),
    body('consultationFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Consultation fee must be a non-negative number'),
];

const updateRules = [
    body('email').optional().isEmail().withMessage('Provide a valid email').normalizeEmail(),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('department')
        .optional()
        .isIn(VALID_DEPARTMENTS)
        .withMessage(`Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
    body('consultationFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Consultation fee must be a non-negative number'),
];

// ── Routes (all require ADMIN or OWNER) ─────────────────────────────────────

router.use(protect, authorize('ADMIN', 'OWNER'));

router.post('/', createRules, validate, createEmployee);
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.put('/:id', updateRules, validate, updateEmployee);
router.patch('/:id/status', toggleEmployeeStatus);

module.exports = router;