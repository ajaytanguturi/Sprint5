const mongoose = require('mongoose');
const Counter = require('./counterModel');

const billSchema = new mongoose.Schema(
    {
        billId: {
            type: String,
            unique: true,
            trim: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient ID is required'],
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            default: null,
        },
        items: [
            {
                serviceName: { type: String, trim: true },
                amount: { type: Number, min: [0, 'Amount cannot be negative'] },
            },
        ],
        total: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: [0, 'Total cannot be negative'],
        },
        status: {
            type: String,
            enum: {
                values: ['PENDING', 'PARTIAL', 'PAID'],
                message: 'Status must be PENDING, PARTIAL, or PAID',
            },
            default: 'PENDING',
        },
        createdByEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: [true, 'Created-by employee reference is required'],
        },
    },
    { timestamps: true }
);

billSchema.pre('save', async function () {
    if (!this.billId) {
        const seq = await Counter.getNextSequence('billId');
        this.billId = `BILL-${String(seq).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Bill', billSchema);