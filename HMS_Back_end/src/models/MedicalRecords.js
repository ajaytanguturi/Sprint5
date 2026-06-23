const mongoose = require("mongoose");
const Counter = require("./Counter");
const {
    ADMINISTRATION_CATEGORIES,
    ADMINISTRATION_METHODS,
    FOOD_RELATIONS
} = require("../constants/domain");

const medicalRecordSchema = new mongoose.Schema({
    medicalRecordId: {
        type: String,
        unique: true
    },
    appointmentId: {
        type: String,
        required: true,
        ref: "Appointments"
    },
    patientUHID: {
        type: String,
        required: true,
        ref: "Patients"
    },
    patientName: {
        type: String,
        required: true
    },
    doctorEmployeeId: {
        type: String,
        required: true,
        ref: "Employees"
    },
    doctorName: {
        type: String,
        required: true
    },
    // Patient's reported problem (what they tell the doctor)
    chiefComplaint: {
        type: String,
        required: true
    },
    // Doctor's findings from examination/questioning
    symptoms: {
        type: String,
        required: true
    },
    // Final disease the doctor settles on
    diagnosis: {
        type: String,
        required: true
    },
    // Plain-language guidance shown to the patient (e.g. "take rest, nebulize at home")
    advice: {
        type: String,
        required: true
    },
    // Optional: absent (undefined) until medication is prescribed
    prescriptionItems: {
        type: [{
            name: {type: String, required: true},
            dosage: {type: String, required: true},       // dose only, e.g. "1 tablet", "5 ml"
            frequency: {type: String, required: true},    // e.g. "3 times a day"
            duration: {type: String, required: true},     // e.g. "5 days"
            // When the medicine is taken relative to food; offset stored in minutes
            foodTiming: {
                relation: {type: String, enum: FOOD_RELATIONS},
                offsetMinutes: {type: Number}
            },
            administrationCategory: {type: String, enum: ADMINISTRATION_CATEGORIES, required: true},
            administrationMethod: {type: String, enum: ADMINISTRATION_METHODS, required: true}
        }],
        default: undefined
    },
    // Optional vitals/lab tests; recordedTime is supplied by the clinician (not auto-set)
    medicalObservations: {
        type: [{
            metricName: {type: String, required: true},   // e.g. "BP", "Heart rate", "WBC count"
            metricValue: {type: String, required: true},  // e.g. "120/80", "72 bpm"
            recordedTime: {type: Date, required: true}
        }],
        default: undefined
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ["DRAFT", "FINALIZED"],
        default: "DRAFT"
    },
    // Creator details retained for audit messaging (staff-created -> doctor-finalized)
    createdByEmployeeId: {
        type: String
    },
    createdByName: {
        type: String
    },
    createdByDesignation: {
        type: String
    },
    // Soft-delete fields: absent until a deletion occurs (never null, never set at creation)
    isDeleted: {
        type: Boolean,
        default: undefined
    },
    deletedAt: {
        type: Date,
        default: undefined
    },
    deletedBy: {
        type: String,
        default: undefined
    }
}, {timestamps: { createdAt: "created_at", updatedAt: "updated_at" }}
);

// Pre-save hook to generate sequential medical record id
medicalRecordSchema.pre('save', async function () {
    if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                { name: 'medicalRecord' },
                { $inc: { seq: 1 } }, // Creates sequence
                { new: true, upsert: true } // upsert is update and insert
            );
            this.medicalRecordId = `MEDREC-${String(counter.seq).padStart(6, '0')}`; // create 6 digit sequence number
    }
});

module.exports = mongoose.model("MedicalRecords", medicalRecordSchema);