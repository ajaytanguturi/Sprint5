const express = require('express');
const { body } = require('express-validator');
const {
    createAppointment,
    getAllAppointments,
    getMyAppointments,
    getDoctorAppointments,
    getPatientAppointments,
    getTodayAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    addDoctorNotes,
    cancelAppointment,
    deleteAppointment,
    getAvailableSlots,
    getAvailableDoctors,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ── Validation rule sets ─────────────────────────────────────────────────────

const TIME_SLOT_REGEX = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
const VALID_TYPES = ['Consultation', 'Follow-up', 'Emergency', 'Check-up'];
const VALID_DEPARTMENTS = ['OPD', 'IPD', 'Lab', 'Pharmacy', 'Admin'];
const VALID_STATUSES = ['BOOKED', 'CANCELLED', 'COMPLETED'];

const createRules = [
    body('patientId').notEmpty().withMessage('Patient ID is required').isMongoId().withMessage('Invalid Patient ID'),
    body('doctorEmployeeId').notEmpty().withMessage('Doctor ID is required').isMongoId().withMessage('Invalid Doctor ID'),
    body('date').isISO8601().withMessage('Appointment date must be a valid date').custom((val) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(val) < today) throw new Error('Appointment date cannot be in the past');
        return true;
    }),
    body('timeSlot')
        .matches(TIME_SLOT_REGEX)
        .withMessage('Time slot must be in HH:MM-HH:MM format (e.g. 09:00-09:30)'),
    body('reasonForVisit').trim().notEmpty().withMessage('Reason for visit is required'),
    body('department')
        .optional()
        .isIn(VALID_DEPARTMENTS)
        .withMessage(`Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
    body('appointmentType')
        .optional()
        .isIn(VALID_TYPES)
        .withMessage(`Appointment type must be one of: ${VALID_TYPES.join(', ')}`),
    body('consultationFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Consultation fee must be a non-negative number'),
];

const statusRules = [
    body('status')
        .isIn(VALID_STATUSES)
        .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

const cancelRules = [
    body('cancellationReason').optional().trim(),
];

const notesRules = [
    body()
        .custom((_, { req }) => {
            const { doctorNotes, diagnosis, prescription } = req.body || {};
            if (!doctorNotes && !diagnosis && !prescription) {
                throw new Error('At least one field (doctorNotes, diagnosis, prescription) is required');
            }
            return true;
        }),
];

// ── Routes ───────────────────────────────────────────────────────────────────

router.use(protect);

// Specific paths before /:id
router.get('/doctors/available', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), getAvailableDoctors);
router.get('/doctors/:doctorId/slots', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), getAvailableSlots);
router.get('/today', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), getTodayAppointments);
router.get('/my', authorize('DOCTOR'), getMyAppointments);
router.get('/doctor/:doctorId', authorize('ADMIN', 'NURSE', 'OWNER'), getDoctorAppointments);
router.get('/patient/:patientId', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), getPatientAppointments);

// Collection
router.post('/', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), createRules, validate, createAppointment);
router.get('/', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), getAllAppointments);

// Single resource
router.get('/:id', getAppointmentById);
router.put('/:id/status', authorize('RECEPTIONIST', 'DOCTOR', 'ADMIN', 'OWNER'), statusRules, validate, updateAppointmentStatus);
router.put('/:id/notes', authorize('DOCTOR', 'ADMIN', 'OWNER'), notesRules, validate, addDoctorNotes);
router.put('/:id/cancel', authorize('RECEPTIONIST', 'ADMIN', 'OWNER'), cancelRules, validate, cancelAppointment);
router.delete('/:id', authorize('ADMIN', 'OWNER'), deleteAppointment);

module.exports = router;