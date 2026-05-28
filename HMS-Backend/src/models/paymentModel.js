const mongoose = require('mongoose');
const Counter = require('./counterModel');

const paymentSchema = new mongoose.Schema(
    {
        paymentId: {
            type: String,
            unique: true,
            trim: true,
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bill',
            required: [true, 'Bill reference is required'],
            unique: true,
        },
        amount: {
            type: Number,
            required: [true, 'Payment amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        method: {
            type: String,
            enum: {
                values: ['CASH', 'CARD', 'UPI'],
                message: 'Payment method must be CASH, CARD, or UPI',
            },
            required: [true, 'Payment method is required'],
        },
        paidAt: {
            type: Date,
            default: Date.now,
        },
        receivedByEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: [true, 'Receiving employee reference is required'],
        },
    },
    { timestamps: true }
);

paymentSchema.pre('save', async function () {
    if (!this.paymentId) {
        const seq = await Counter.getNextSequence('paymentId');
        this.paymentId = `PMT-${String(seq).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Payment', paymentSchema);