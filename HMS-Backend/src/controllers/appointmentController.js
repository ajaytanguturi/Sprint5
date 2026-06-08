const Appointment = require('../models/appointmentModel');
const Patient = require('../models/patientModel');
const Employee = require('../models/employeeModel');
const User = require('../models/userModel');
const { generateBookableSlots, doTimeSlotsOverlap } = require('../utils/slotGenerator');
const {
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
} = require('../utils/appointmentEmailService');

// Constants
const ADMIN_ROLES = new Set(['ADMIN', 'OWNER']);
const VALID_STATUSES = ['BOOKED', 'CANCELLED', 'COMPLETED'];
const SLOT_DURATIONS = [15, 30];

const PATIENT_FIELDS = 'UHID name phone email gender age';
const DOCTOR_FIELDS = 'employeeCode name specialization department consultationFee';
const CREATOR_FIELDS = 'email userId';

// helper methods

const isAdmin = (user) => user.roles.some((r) => ADMIN_ROLES.has(r));

const creatorFilter = (user) => {
    if (isAdmin(user)) return {};
    if (user.roles.includes('PATIENT')) {
        return { patientId: user.patientId };
    }
    return { createdByEmployeeId: user.id };
}

const handleError = (res, error, context) => {
    console.error(`[${context}]`, error.message);
    if (error.name === 'ValidationError') {
        const msgs = Object.values(error.errors).map((e) => e.message).join(', ');
        return res.status(400).json({ success: false, message: msgs });
    }
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
};

const buildDateRange = (dateStr) => {
    const start = new Date(dateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { $gte: start, $lt: end };
};

exports.createAppointment = async (req, res) => {
    try {
        const { patientId, doctorEmployeeId, date, timeSlot, department, appointmentType, reasonForVisit, consultationFee } = req.body;

        const appointmentDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (appointmentDate < today) {
            return res.status(400).json({ success: false, message: 'Appointment date cannot be in the past' });
        }

        const [patient, doctor] = await Promise.all([
            Patient.findById(patientId),
            Employee.findById(doctorEmployeeId),
        ]);

        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        if (patient.status === 'INACTIVE') return res.status(400).json({ success: false, message: 'Cannot book for an inactive patient' });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
        if (doctor.status === 'INACTIVE') return res.status(400).json({ success: false, message: 'Selected doctor is currently inactive' });

        const doctorUser = await User.findOne({ employeeId: doctor._id });
        if (!doctorUser?.roles.includes('DOCTOR')) {
            return res.status(400).json({ success: false, message: 'Selected employee is not a doctor' });
        }

        const slots = doctor.availabilitySlots || [];
        if (slots.length === 0) {
            return res.status(400).json({ success: false, message: 'Doctor has no availability configured' });
        }

        const slotFitsAvailability = slots.some((s) => doTimeSlotsOverlap(s, timeSlot));
        if (!slotFitsAvailability) {
            return res.status(400).json({
                success: false,
                message: `Doctor is unavailable at ${timeSlot}. Available windows: ${slots.join(', ')}`,
            });
        }

        const conflicting = await Appointment.findOne({
            doctorEmployeeId: doctor._id,
            date: appointmentDate,
            status: { $in: ['BOOKED', 'COMPLETED'] },
        });

        if (conflicting && doTimeSlotsOverlap(conflicting.timeSlot, timeSlot)) {
            return res.status(409).json({
                success: false,
                message: `Doctor already has an appointment at ${conflicting.timeSlot} on this date`,
            });
        }

        const fee = consultationFee === undefined
            ? (doctor.consultationFee || 0)
            : consultationFee;

        const appointment = await new Appointment({
            patientId: patient._id,
            doctorEmployeeId: doctor._id,
            date: appointmentDate,
            timeSlot,
            department: department || doctor.department,
            appointmentType: appointmentType || 'Consultation',
            reasonForVisit,
            consultationFee: fee,
            status: 'BOOKED',
            createdByEmployeeId: req.user.id,
        }).save();

        const populated = await Appointment.findById(appointment._id)
            .populate('patientId', PATIENT_FIELDS)
            .populate('doctorEmployeeId', DOCTOR_FIELDS)
            .populate('createdByEmployeeId', CREATOR_FIELDS);

        sendAppointmentConfirmationEmail({
            patientEmail: patient.email,
            patientName: patient.name,
            doctorName: doctor.name,
            date: appointmentDate,
            timeSlot,
            department: appointment.department,
            consultationFee: fee,
            appointmentId: appointment.appointmentId,
        }).catch((e) => console.warn('[createAppointment] confirmation email failed:', e.message));

        return res.status(201).json({ success: true, message: 'Appointment booked successfully', data: populated });
    } catch (err) {
        return handleError(res, err, 'createAppointment');
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, date, doctorId, patientId, department } = req.query;

        const filter = { ...creatorFilter(req.user) };
        if (status) filter.status = status;
        if (doctorId) filter.doctorEmployeeId = doctorId;
        if (patientId) filter.patientId = patientId;
        if (department) filter.department = department;
        if (date) filter.date = buildDateRange(date);

        const pageNum = Math.max(Number.parseInt(page, 10), 1);
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('patientId', PATIENT_FIELDS)
                .populate('doctorEmployeeId', 'employeeCode name specialization department')
                .populate('createdByEmployeeId', CREATOR_FIELDS)
                .sort({ date: -1, timeSlot: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Appointment.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: 'Appointments retrieved successfully',
            data: appointments,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        return handleError(res, err, 'getAllAppointments');
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, date } = req.query;

        const currentUser = await User.findById(req.user.id);
        if (!currentUser?.employeeId) {
            return res.status(404).json({ success: false, message: 'Employee record not found for this user' });
        }

        const filter = { doctorEmployeeId: currentUser.employeeId };
        if (status) filter.status = status;
        if (date) filter.date = buildDateRange(date);

        const pageNum = Math.max(Number.parseInt(page, 10), 1);
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('patientId', `${PATIENT_FIELDS} medicalHistory`)
                .populate('doctorEmployeeId', 'employeeCode name specialization department')
                .populate('createdByEmployeeId', CREATOR_FIELDS)
                .sort({ date: 1, timeSlot: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Appointment.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: 'Your appointments retrieved successfully',
            data: appointments,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        return handleError(res, err, 'getMyAppointments');
    }
};


exports.getDoctorAppointments = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { page = 1, limit = 10, status, date } = req.query;

        const doctor = await Employee.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        const filter = { doctorEmployeeId: doctorId };
        if (status) filter.status = status;
        if (date) filter.date = buildDateRange(date);

        const pageNum = Math.max(Number.parseInt(page, 10), 1);
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('patientId', PATIENT_FIELDS)
                .populate('doctorEmployeeId', 'employeeCode name specialization department')
                .populate('createdByEmployeeId', CREATOR_FIELDS)
                .sort({ date: 1, timeSlot: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Appointment.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: `Appointments for Dr. ${doctor.name}`,
            data: appointments,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        return handleError(res, err, 'getDoctorAppointments');
    }
};

exports.getPatientAppointments = async (req, res) => {
    try {
        const { patientId } = req.params;
        if (req.user.roles.includes('PATIENT') && req.user.patientId.toString() !== patientId) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only view your own appointments.' });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const filter = { patientId};
        if (!req.user.roles.includes('PATIENT') && !isAdmin(req.user)) {
            filter.createdByEmployeeId = req.user.id;
        }

        const appointments = await Appointment.find(filter)
            .populate('doctorEmployeeId', `${DOCTOR_FIELDS}`)
            .populate('createdByEmployeeId', CREATOR_FIELDS)
            .sort({ date: -1, timeSlot: -1 });

        return res.status(200).json({
            success: true,
            message: `Appointments for ${patient.name}`,
            data: appointments,
        });
    } catch (err) {
        return handleError(res, err, 'getPatientAppointments');
    }
};

exports.getTodayAppointments = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filter = { date: { $gte: today, $lt: tomorrow }, ...creatorFilter(req.user) };

        const appointments = await Appointment.find(filter)
            .populate('patientId', 'UHID name phone gender age')
            .populate('doctorEmployeeId', 'employeeCode name specialization department')
            .sort({ timeSlot: 1 });

        return res.status(200).json({
            success: true,
            message: `${appointments.length} appointment(s) scheduled today`,
            data: appointments,
        });
    } catch (err) {
        return handleError(res, err, 'getTodayAppointments');
    }
};

exports.getAppointmentById = async (req, res) => {
    try {
        let filter = { _id: req.params.id };

        if (!isAdmin(req.user)) {
            if (req.user.roles.includes('DOCTOR')) {
                const currentUser = await User.findById(req.user.id);
                if (!currentUser?.employeeId) {
                    return res.status(404).json({ success: false, message: 'Employee record not found for this user' });
                }
                filter = {
                    _id: req.params.id,
                    $or: [
                        { doctorEmployeeId: currentUser.employeeId },
                        { createdByEmployeeId: req.user.id },
                    ],
                };
            } else {
                filter = { _id: req.params.id, ...creatorFilter(req.user) };
            }
        }

        const appointment = await Appointment.findOne(filter)
            .populate('patientId', 'UHID name phone email gender age dob address medicalHistory')
            .populate('doctorEmployeeId', `${DOCTOR_FIELDS} qualification`)
            .populate('createdByEmployeeId', CREATOR_FIELDS)
            .populate('cancelledBy', CREATOR_FIELDS);

        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        return res.status(200).json({ success: true, message: 'Appointment retrieved successfully', data: appointment });
    } catch (err) {
        return handleError(res, err, 'getAppointmentById');
    }
};

exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        if (appointment.status === 'COMPLETED' && status !== 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Cannot change the status of a completed appointment' });
        }
        if (appointment.status === 'CANCELLED' && status === 'BOOKED') {
            return res.status(400).json({ success: false, message: 'Cannot reactivate a cancelled appointment. Please create a new one.' });
        }

        appointment.status = status;
        await appointment.save();

        const updated = await Appointment.findById(appointment._id)
            .populate('patientId', 'UHID name phone email')
            .populate('doctorEmployeeId', 'employeeCode name specialization department');

        return res.status(200).json({ success: true, message: `Status updated to ${status}`, data: updated });
    } catch (err) {
        return handleError(res, err, 'updateAppointmentStatus');
    }
};

exports.addDoctorNotes = async (req, res) => {
    try {
        const { doctorNotes, diagnosis, prescription } = req.body;
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        const currentUser = await User.findById(req.user.id);
        const isDoctorOnly = currentUser.roles.includes('DOCTOR') && !isAdmin(currentUser);
        if (isDoctorOnly && appointment.doctorEmployeeId.toString() !== currentUser.employeeId?.toString()) {
            return res.status(403).json({ success: false, message: 'You can only add notes to your own appointments' });
        }

        if (doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;
        if (diagnosis !== undefined) appointment.diagnosis = diagnosis;
        if (prescription !== undefined) appointment.prescription = prescription;
        await appointment.save();

        const updated = await Appointment.findById(appointment._id)
            .populate('patientId', 'UHID name phone email')
            .populate('doctorEmployeeId', 'employeeCode name specialization');

        return res.status(200).json({ success: true, message: 'Doctor notes saved successfully', data: updated });
    } catch (err) {
        return handleError(res, err, 'addDoctorNotes');
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const { cancellationReason } = req.body;
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'UHID name email')
            .populate('doctorEmployeeId', 'name');

        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
        if (appointment.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
        if (appointment.status === 'COMPLETED') return res.status(400).json({ success: false, message: 'Cannot cancel a completed appointment' });

        appointment.status = 'CANCELLED';
        appointment.cancelledBy = req.user.id;
        appointment.cancellationReason = cancellationReason || 'No reason provided';
        await appointment.save();

        sendAppointmentCancellationEmail({
            patientEmail: appointment.patientId.email,
            patientName: appointment.patientId.name,
            doctorName: appointment.doctorEmployeeId.name,
            date: appointment.date,
            timeSlot: appointment.timeSlot,
            reason: appointment.cancellationReason,
            appointmentId: appointment.appointmentId,
        }).catch((e) => console.warn('[cancelAppointment] email failed:', e.message));

        return res.status(200).json({ success: true, message: 'Appointment cancelled successfully', data: appointment });
    } catch (err) {
        return handleError(res, err, 'cancelAppointment');
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        return res.status(200).json({ success: true, message: 'Appointment deleted successfully' });
    } catch (err) {
        return handleError(res, err, 'deleteAppointment');
    }
};

exports.getAvailableDoctors = async (req, res) => {
    try {
        const { specialization, department } = req.query;

        const empFilter = { status: 'ACTIVE' };
        if (specialization) empFilter.specialization = { $regex: specialization, $options: 'i' };
        if (department) empFilter.department = department;

        const employees = await Employee.find(empFilter)
            .select('employeeCode name specialization department consultationFee availabilitySlots qualification');

        const employeeIds = employees.map((e) => e._id);
        const approvedDoctorUsers = await User.find({
            employeeId: { $in: employeeIds },
            roles: 'DOCTOR',
            status: 'ACTIVE',
            approvalStatus: 'APPROVED',
        }).select('employeeId');

        const doctorIdSet = new Set(approvedDoctorUsers.map((u) => u.employeeId.toString()));
        const doctors = employees.filter((e) => doctorIdSet.has(e._id.toString()));

        return res.status(200).json({
            success: true,
            message: `${doctors.length} doctor(s) available`,
            data: doctors,
        });
    } catch (err) {
        return handleError(res, err, 'getAvailableDoctors');
    }
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, duration } = req.query;

        if (!date) return res.status(400).json({ success: false, message: 'Query param "date" is required' });

        const slotDuration = Number.parseInt(duration, 10) || 30;
        if (!SLOT_DURATIONS.includes(slotDuration)) {
            return res.status(400).json({ success: false, message: `Duration must be one of: ${SLOT_DURATIONS.join(', ')} minutes` });
        }

        const doctor = await Employee.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        if (!doctor.availabilitySlots?.length) {
            return res.status(200).json({
                success: true,
                message: 'Doctor has no availability slots configured',
                data: { doctorName: doctor.name, date: new Date(date), availableSlots: [], bookedSlots: [], totalSlots: 0, slotDuration },
            });
        }

        const dateRange = buildDateRange(date);
        const bookedAppts = await Appointment.find({
            doctorEmployeeId: doctorId,
            date: dateRange,
            status: { $in: ['BOOKED', 'COMPLETED'] },
        }).select('timeSlot');

        const booked = bookedAppts.map((a) => a.timeSlot);
        const { available, allGenerated, mergedRanges } = generateBookableSlots(doctor.availabilitySlots, booked, slotDuration);

        return res.status(200).json({
            success: true,
            message: `${available.length} slot(s) available (${slotDuration}-min intervals)`,
            data: { doctorName: doctor.name, date: new Date(date), slotDuration, mergedRanges, allSlots: allGenerated, availableSlots: available, bookedSlots: booked, totalAvailable: available.length },
        });
    } catch (err) {
        return handleError(res, err, 'getAvailableSlots');
    }
};