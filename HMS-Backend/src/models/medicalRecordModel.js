const mongoose = require('mongoose');
const Counter = require('./counterModel');

const prescriptionItemSchema = new mongoose.Schema({
    medicineName: { type: String, required: [true, 'Medicine name is required'], trim: true },
    dosage: { type: String, required: [true, 'Dosage is required'], trim: true },
    duration: { type: String, required: [true, 'Duration is required'], trim: true },
});

const medicalRecordSchema = new mongoose.Schema(
    {
        medicalRecordId: {
            type: String,
            unique: true,
            trim: true,
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: [true, 'Appointment ID is required'],
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient ID is required'],
        },
        doctorEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: [true, 'Doctor employee ID is required'],
        },
        symptoms: {
            type: String,
            trim: true,
            required: [true, 'Symptoms description is required'],
        },
        diagnosis: {
            type: String,
            trim: true,
            required: [true, 'Diagnosis is required'],
        },
        prescriptionItems: [prescriptionItemSchema],
        notes: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { timestamps: true }
);

medicalRecordSchema.pre('save', async function () {
    if (!this.medicalRecordId) {
        const seq = await Counter.getNextSequence('medicalRecordId');
        this.medicalRecordId = `MED-${String(seq).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);