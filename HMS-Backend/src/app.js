const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authroutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
});
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    const statusCode = err.status || err.statusCode || 500;
    let clientMessage = err.message || 'Internal server error';
    if (statusCode === 500) {
        clientMessage = 'An unexpected server error occurred';
    }
    res.status(statusCode).json({
        success: false,
        message: clientMessage
    });
});

module.exports = app;