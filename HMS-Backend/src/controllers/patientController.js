const Patient = require('../models/patientModel');
const { buildOwnershipFilter } = require('../utils/ownershipFilter');

//error display
const handleError = (res, error, context) => {
    console.error(`[${context}]`, error.message);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e) => e.message).join(', ');
        return res.status(400).json({ success: false, message: messages });
    }
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
};

exports.createPatient = async (req, res) => {
    try {
        const { name, phone, email, gender, dob, address, emergencyContact, medicalHistory, status } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const emailTaken = await Patient.findOne({ email: normalizedEmail });
        if (emailTaken) {
            return res.status(409).json({ success: false, message: `Email "${email}" is already registered to a patient` });
        }
        const dobDate = new Date(dob);
        if (dobDate > new Date()) {
            return res.status(400).json({ success: false, message: 'Date of birth cannot be in the future' });
        }
        const patient = await new Patient({
            name,
            phone: phone.trim(),
            email: normalizedEmail,
            gender,
            dob: dobDate,
            address,
            emergencyContact,
            medicalHistory,
            status: status || 'ACTIVE',
            registeredBy: req.user.id,
        }).save();
        return res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            data: {
                UHID: patient.UHID,
                name: patient.name,
                phone: patient.phone,
                email: patient.email,
                gender: patient.gender,
                age: patient.age,
                status: patient.status,
                createdAt: patient.createdAt,
            },
        });
    } catch (err) {
        return handleError(res, err, 'createPatient');
    }
};

exports.getAllPatients = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, gender } = req.query;
        const filter = { ...buildOwnershipFilter(req.user, 'registeredBy') };
        if (status) filter.status = status;
        if (gender) filter.gender = gender;
        const pageNum = Math.max(Number.parseInt(page, 10), 1);
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);
        const [patients, total] = await Promise.all([
            Patient.find(filter)
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('registeredBy', 'email userId'),
            Patient.countDocuments(filter),
        ]);
        return res.status(200).json({
            success: true,
            message: 'Patients retrieved successfully',
            data: patients,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        return handleError(res, err, 'getAllPatients');
    }
};

exports.searchPatients = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }
        const term = q.trim();
        const pattern = { $regex: term, $options: 'i' };
        const ownerFilter = buildOwnershipFilter(req.user, 'registeredBy');
        const searchCriteria = { $or: [{ UHID: pattern }, { name: pattern }, { phone: pattern }, { email: pattern }] };
        const finalFilter = Object.keys(ownerFilter).length
            ? { $and: [ownerFilter, searchCriteria] }
            : searchCriteria;

        const patients = await Patient.find(finalFilter)
            .select('UHID name phone email gender dob status')
            .limit(20);
        return res.status(200).json({
            success: true,
            message: `Found ${patients.length} patient(s)`,
            data: patients,
        });
    } catch (err) {
        return handleError(res, err, 'searchPatients');
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...buildOwnershipFilter(req.user, 'registeredBy') };
        const patient = await Patient.findOne(filter).select('-__v').populate('registeredBy', 'email userId');
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }
        return res.status(200).json({ success: true, message: 'Patient retrieved successfully', data: patient });
    } catch (err) {
        return handleError(res, err, 'getPatientById');
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        delete updates.UHID;
        delete updates.registeredBy;
        if (updates.email) {
            const conflict = await Patient.findOne({
                email: updates.email.toLowerCase().trim(),
                _id: { $ne: id },
            });
            if (conflict) {
                return res.status(409).json({ success: false, message: `Email "${updates.email}" is already in use` });
            }
            updates.email = updates.email.toLowerCase().trim();
        }
        const filter = { _id: id, ...buildOwnershipFilter(req.user, 'registeredBy') };
        const patient = await Patient.findOneAndUpdate(filter, updates, { new: true, runValidators: true });
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }
        return res.status(200).json({ success: true, message: 'Patient updated successfully', data: patient });
    } catch (err) {
        return handleError(res, err, 'updatePatient');
    }
};

exports.deletePatient = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...buildOwnershipFilter(req.user, 'registeredBy') };
        const patient = await Patient.findOneAndDelete(filter);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }
        return res.status(200).json({ success: true, message: 'Patient removed successfully' });
    } catch (err) {
        return handleError(res, err, 'deletePatient');
    }
};