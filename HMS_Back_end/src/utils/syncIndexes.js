const User = require("../models/Users");
const Employee = require("../models/Employees");
const Patient = require("../models/Patients");

// Reconciles DB indexes with the current schemas. Drops the legacy unique
// indexes on username/email/medicalRegistrationNumber that were removed when
// soft-delete made those values reusable after deletion.
async function syncIndexes() {
    await Promise.all([
        User.syncIndexes(),
        Employee.syncIndexes(),
        Patient.syncIndexes(),
    ]);
}

module.exports = syncIndexes;
