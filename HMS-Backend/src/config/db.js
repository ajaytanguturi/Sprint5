const mongoose = require('mongoose');

// Mongoose connection event listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose default connection is open');
});

mongoose.connection.on('error', (err) => {
    console.error(`Mongoose default connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose default connection is disconnected');
});

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;