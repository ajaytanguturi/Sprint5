const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");
const controller = require("../controllers/patientController");
const {
    createPatientValidation,
    updatePatientValidation,
    uhidValidation
} = require("../validators/patientValidators");

// All the routes require authentication and reception-level authorization
router.use(auth, authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST"));

// Patient CRUD routes
router.post(
    "/create-patient",
    createPatientValidation,
    validate,
    controller.createPatient
);

// Search must precede /:UHID to avoid the param route capturing "search"
router.get(
    "/search",
    controller.searchPatients
);

router.get(
    "/",
    controller.getPatients
);

router.get(
    "/:UHID",
    uhidValidation,
    validate,
    controller.getPatientById
);

router.put(
    "/:UHID",
    updatePatientValidation,
    validate,
    controller.updatePatient
);

// Soft delete — restricted to admin/owner (receptionist passes the router-level
// designation guard but not the role guard)
router.delete(
    "/:UHID",
    authorizeRoles("OWNER", "ADMIN"),
    uhidValidation,
    validate,
    controller.deletePatient
);

module.exports = router;