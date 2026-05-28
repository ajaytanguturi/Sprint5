process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const Brevo = require('sib-api-v3-sdk');

// ── Brevo client bootstrap ──────────────────────────────────────────────────
const brevoClient = Brevo.ApiClient.instance;
brevoClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const transactionalApi = new Brevo.TransactionalEmailsApi();

const SENDER = {
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@vanguardhms.com',
    name: 'Vanguard HMS',
};

// ── Private dispatcher (single source of Brevo boilerplate) ─────────────────
const dispatch = async (recipientEmail, recipientName, subject, htmlContent) => {
    const payload = {
        sender: SENDER,
        to: [{ email: recipientEmail, name: recipientName || recipientEmail }],
        subject,
        htmlContent,
    };
    const result = await transactionalApi.sendTransacEmail(payload);
    console.info(`[Mail] Sent "${subject}" → ${recipientEmail}`);
    return result;
};

// ── Auth / Account emails ────────────────────────────────────────────────────

const sendRegistrationPendingEmail = (email, name) =>
    dispatch(email, name, 'Registration Received – Pending Approval', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0d9488">Welcome to Vanguard HMS!</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your registration has been received and is pending administrator approval.</p>
          <p>You will get another email once your account is approved.</p>
          <p>Best regards,<br>Vanguard Admin Team</p>
        </div>`);

const sendAdminNotificationEmail = (adminEmail, staffName, staffEmail) =>
    dispatch(adminEmail, 'Administrator', 'New Employee Registration – Approval Required', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#d97706">New Registration Pending</h2>
          <p>A new employee is waiting for your approval:</p>
          <ul>
            <li><strong>Name:</strong> ${staffName}</li>
            <li><strong>Email:</strong> ${staffEmail}</li>
          </ul>
          <p>Please log in to the admin dashboard to review this request.</p>
          <a href="${process.env.FRONTEND_URL}/login"
             style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:5px;margin:16px 0">
            Go to Dashboard
          </a>
        </div>`);

const sendApprovalEmail = (email, name, loginUrl) =>
    dispatch(email, name, 'Account Approved – You Can Now Log In', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#059669">Account Approved!</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your account has been <strong>approved</strong>. You may now log in.</p>
          <a href="${loginUrl}"
             style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:5px;margin:16px 0">
            Log In Now
          </a>
          <p>Best regards,<br>Vanguard Admin Team</p>
        </div>`);

const sendRejectionEmail = (email, name, reason) =>
    dispatch(email, name, 'Account Registration Update', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#dc2626">Registration Update</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>We regret to inform you that your registration could not be approved at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please contact the hospital administration if you believe this is an error.</p>
          <p>Best regards,<br>Vanguard Admin Team</p>
        </div>`);

const sendTemporaryPasswordEmail = (email, name, tempPassword, resetUrl) =>
    dispatch(email, name, 'Your Vanguard HMS Account Has Been Created', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0d9488">Welcome to Vanguard HMS!</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>An account has been set up for you by the administrator.</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:5px;margin:16px 0">
            <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p><strong>Important:</strong> You must reset your password before logging in.</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:5px;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.</p>
          <p>Best regards,<br>Vanguard Admin Team</p>
        </div>`);

const sendPasswordResetEmail = (email, name, resetUrl) =>
    dispatch(email, name, 'Password Reset Request – Vanguard HMS', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0d9488">Password Reset Request</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:5px;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. Ignore this email if you did not request a reset.</p>
          <p>Best regards,<br>Vanguard Admin Team</p>
        </div>`);

// ── Appointment emails ───────────────────────────────────────────────────────

const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

const sendAppointmentConfirmationEmail = ({
    patientEmail, patientName, doctorName, date, timeSlot,
    department, consultationFee, appointmentId,
}) =>
    dispatch(patientEmail, patientName, 'Appointment Confirmed – Vanguard HMS', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0d9488">Appointment Confirmed ✓</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your appointment has been successfully booked.</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:5px;margin:16px 0">
            <p style="margin:4px 0"><strong>ID:</strong> ${appointmentId}</p>
            <p style="margin:4px 0"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin:4px 0"><strong>Date:</strong> ${formatDate(date)}</p>
            <p style="margin:4px 0"><strong>Time:</strong> ${timeSlot}</p>
            <p style="margin:4px 0"><strong>Department:</strong> ${department}</p>
            <p style="margin:4px 0"><strong>Fee:</strong> ₹${consultationFee}</p>
          </div>
          <p><strong>Please arrive 15 minutes early.</strong></p>
          <p>Best regards,<br>Vanguard HMS</p>
        </div>`);

const sendAppointmentCancellationEmail = ({
    patientEmail, patientName, doctorName, date, timeSlot, reason, appointmentId,
}) =>
    dispatch(patientEmail, patientName, 'Appointment Cancelled – Vanguard HMS', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#dc2626">Appointment Cancelled</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your appointment has been cancelled.</p>
          <div style="background:#fef2f2;padding:16px;border-radius:5px;border-left:4px solid #dc2626;margin:16px 0">
            <p style="margin:4px 0"><strong>ID:</strong> ${appointmentId}</p>
            <p style="margin:4px 0"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin:4px 0"><strong>Date:</strong> ${formatDate(date)}</p>
            <p style="margin:4px 0"><strong>Time:</strong> ${timeSlot}</p>
            ${reason ? `<p style="margin:4px 0"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          <p>To book a new appointment please contact our reception.</p>
          <p>Best regards,<br>Vanguard HMS</p>
        </div>`);

const sendAppointmentReminderEmail = ({
    patientEmail, patientName, doctorName, date, timeSlot, appointmentId,
}) =>
    dispatch(patientEmail, patientName, 'Appointment Reminder – Tomorrow', `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#d97706">Appointment Reminder</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>This is a reminder for your appointment <strong>tomorrow</strong>.</p>
          <div style="background:#fef3c7;padding:16px;border-radius:5px;margin:16px 0">
            <p style="margin:4px 0"><strong>ID:</strong> ${appointmentId}</p>
            <p style="margin:4px 0"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin:4px 0"><strong>Date:</strong> ${formatDate(date)}</p>
            <p style="margin:4px 0"><strong>Time:</strong> ${timeSlot}</p>
          </div>
          <p>Please arrive 15 minutes before your scheduled time.</p>
          <p>Best regards,<br>Vanguard HMS</p>
        </div>`);

module.exports = {
    sendRegistrationPendingEmail,
    sendAdminNotificationEmail,
    sendApprovalEmail,
    sendRejectionEmail,
    sendTemporaryPasswordEmail,
    sendPasswordResetEmail,
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
    sendAppointmentReminderEmail,
};