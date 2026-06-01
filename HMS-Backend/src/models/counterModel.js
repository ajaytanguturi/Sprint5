const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    seq: {
        type: Number,
        default: 0,
    },
});

counterSchema.statics.getNextSequence = async function (name) {
    const counter = await this.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
    );
    return counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;