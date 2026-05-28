/**
 * Appointment email notifications.
 * Delegates to the central emailService so there is a single Brevo setup.
 */
const {
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
    sendAppointmentReminderEmail,
} = require('./emailService');

module.exports = {
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
    sendAppointmentReminderEmail,
};