const User = require("../models/Users");
const Employee = require("../models/Employees");

// Soft-deletes both the Employee record and the linked User account. The records
// remain in the DB (flagged) so history is preserved and the email/username free
// up for reuse (uniqueness is enforced in the app layer against active rows only).
async function deleteEmployeeAccount(employeeCode, deletedBy, { userStatus = "INACTIVE" } = {}) {
  const deletedAt = new Date();

  await Promise.all([
    Employee.updateOne(
      { employeeCode },
      { $set: { isDeleted: true, deletedAt, deletedBy } },
    ),
    User.updateOne(
      { employeeCode },
      { $set: { isDeleted: true, deletedAt, deletedBy, status: userStatus } },
    ),
  ]);
}

module.exports = deleteEmployeeAccount;
