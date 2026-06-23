const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/medicalRecordController");
const {
    createMedicalRecordValidation,
    updateMedicalRecordValidation,
    medicalRecordIdValidation,
    appointmentIdParamValidation
} = require("../validators/medicalRecordValidators");

// All routes require authentication
router.use(auth);

// Roles permitted to work with medical records
const STAFF_LEVEL = authorizeDesignation(
    "OWNER",
    "ADMIN",
    "RECEPTIONIST",
    "DOCTOR"
);

// Only Admin/Owner may delete (soft delete)
const DELETE_LEVEL = authorizeDesignation("OWNER", "ADMIN");

router.post(
    "/",
    STAFF_LEVEL,
    createMedicalRecordValidation,
    validate,
    controller.createMedicalRecord
);

router.get(
    "/",
    STAFF_LEVEL,
    controller.listMedicalRecords
);

router.get(
    "/by-appointment/:appointmentId",
    STAFF_LEVEL,
    appointmentIdParamValidation,
    validate,
    controller.getMedicalRecordByAppointment
);

router.get(
    "/:medicalRecordId",
    STAFF_LEVEL,
    medicalRecordIdValidation,
    validate,
    controller.getMedicalRecordById
);

router.put(
    "/:medicalRecordId",
    STAFF_LEVEL,
    updateMedicalRecordValidation,
    validate,
    controller.updateMedicalRecord
);

router.delete(
    "/:medicalRecordId",
    DELETE_LEVEL,
    medicalRecordIdValidation,
    validate,
    controller.deleteMedicalRecord
);

module.exports = router;
