const mongoose = require("mongoose");
const Counter = require("./Counter");
const softDeletePlugin = require("../utils/softDeletePlugin");

const employeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  // Uniqueness enforced in the app layer so a deleted employee's email can be reused
  email: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    enum: [
      "OPD",
      "IPD",
      "Lab",
      "Pharmacy",
      "Administration",
      "Reception",
      "Billing",
    ],
    required: true,
  },
  designation: {
    type: String,
    enum: [
      "OWNER",
      "ADMIN",
      "DOCTOR",
      "RECEPTIONIST",
      "CASHIER",
      "NURSE",
      "LAB_TECH",
      "PHARMACIST",
    ],
    required: true,
  },
  joiningDate: {
    type: Date,
    required: true,
  },
  // Uniqueness enforced in the app layer (validateUniqueEmployeeFields) for reuse after delete
  medicalRegistrationNumber: {
    type: String,
  },
  specialization: {
    type: String,
  },
  // Date on/after which this doctor accepts no new appointments (admin/owner-set)
  bookingCutoffDate: {
    type: Date,
    default: undefined,
  },
  qualification: [
    {
      type: String,
      required: true,
    },
  ],
  consultationFee: {
    type: Number,
  },
  availabilitySlots: {
    type: [
      {
        day: {
          type: String,
          enum: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY",
          ],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],
    default: undefined,
  },
});

// Pre-save hook to generate sequential employee code
employeeSchema.pre("save", async function () {
  if (this.isNew && !this.employeeCode) {
    const counter = await Counter.findOneAndUpdate(
      { name: "employees" },
      { $inc: { seq: 1 } }, // Creates sequence
      { new: true, upsert: true }, // upsert is update and insert
    );
    this.employeeCode = `EMP-${String(counter.seq).padStart(6, "0")}`; // create 6 digit sequence number
  }
});

employeeSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Employee", employeeSchema);