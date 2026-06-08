const express = require('express');
const { body } = require('express-validator');
const { createPatient, getAllPatients, getPatientById, updatePatient, deletePatient, searchPatients } = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

const VALID_GENDERS = ['Male', 'Female', 'Other'];
const createRules = [
    body('name').trim().notEmpty().withMessage('Patient name is required'),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('gender')
        .isIn(VALID_GENDERS)
        .withMessage(`Gender must be one of: ${VALID_GENDERS.join(', ')}`),
    body('dob')
        .isISO8601()
        .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
        .custom((val) => {
            if (new Date(val) > new Date()) {
                throw new Error('Date of birth cannot be in the future');
            }
            return true;
        }),
];

const updateRules = [
    body('email').optional().isEmail().withMessage('Provide a valid email').normalizeEmail(),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('gender')
        .optional()
        .isIn(VALID_GENDERS)
        .withMessage(`Gender must be one of: ${VALID_GENDERS.join(', ')}`),
    body('dob')
        .optional()
        .isISO8601()
        .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
];

router.use(protect);

router.post('/', authorize('RECEPTIONIST', 'NURSE', 'ADMIN', 'OWNER'), createRules, validate, createPatient);
router.get('/', authorize('RECEPTIONIST', 'NURSE', 'ADMIN', 'OWNER'), getAllPatients);
router.get('/search', authorize('RECEPTIONIST', 'NURSE', 'ADMIN', 'OWNER'), searchPatients);
router.get('/:id', getPatientById);
router.put('/:id', authorize('RECEPTIONIST', 'ADMIN', 'OWNER', 'PATIENT'), updateRules, validate, updatePatient);
router.delete('/:id', authorize('ADMIN', 'OWNER'), deletePatient);

module.exports = router;