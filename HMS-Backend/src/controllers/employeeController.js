const Employee = require('../models/employeeModel');

// ── Shared uniqueness checker ────────────────────────────────────────────────

/**
 * Checks whether the given employee fields are already taken by another record.
 * Pass `excludeId` when updating so the employee being edited is ignored.
 * Returns an array of conflict messages; empty array means no conflicts.
 *
 * @param {{ email?, phone?, medicalRegistrationNo? }} fields
 * @param {string} [excludeId] - MongoDB _id to exclude from the search
 * @returns {Promise<string[]>}
 */
const findEmployeeConflicts = async ({ email, phone, medicalRegistrationNo }, excludeId) => {
    const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
    const messages = [];

    const checks = [
        email && Employee.findOne({ email: email.toLowerCase().trim(), ...exclude }),
        phone && Employee.findOne({ phone, ...exclude }),
        medicalRegistrationNo && Employee.findOne({ medicalRegistrationNo, ...exclude }),
    ];

    const [byEmail, byPhone, byRegNo] = await Promise.all(checks);

    if (byEmail) messages.push(`Email "${email}" is already in use by another employee`);
    if (byPhone) messages.push(`Phone "${phone}" is already in use by another employee`);
    if (byRegNo) messages.push(`Medical registration number "${medicalRegistrationNo}" is already in use`);

    return messages;
};

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/employees
 * Creates a standalone employee profile (no user account).
 * Access: ADMIN, OWNER
 */
exports.createEmployee = async (req, res) => {
    try {
        const {
            name, phone, email, department, designation,
            medicalRegistrationNo, specialization, qualification,
            consultationFee, availabilitySlots, joiningDate, status,
        } = req.body;

        const conflicts = await findEmployeeConflicts({ email, phone, medicalRegistrationNo });
        if (conflicts.length) {
            return res.status(409).json({ success: false, message: conflicts.join('; ') });
        }

        const employee = await new Employee({
            name,
            phone,
            email: email.toLowerCase().trim(),
            department,
            designation,
            medicalRegistrationNo,
            specialization,
            qualification,
            consultationFee,
            availabilitySlots,
            joiningDate: joiningDate || Date.now(),
            status: status || 'ACTIVE',
        }).save();

        return res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee,
        });
    } catch (error) {
        console.error('[createEmployee]', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message).join(', ');
            return res.status(400).json({ success: false, message: messages });
        }
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

/**
 * GET /api/employees
 * Lists employees with optional search, status, and department filters.
 * Supports pagination via `page` and `limit` query params.
 * Access: ADMIN, OWNER
 */
exports.getEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, department, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (department) filter.department = department;

        if (search && search.trim().length >= 2) {
            const pattern = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: pattern },
                { phone: pattern },
                { email: pattern },
                { employeeCode: pattern },
            ];
        }

        const pageNum = Math.max(Number.parseInt(page, 10), 1);
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        const [employees, total] = await Promise.all([
            Employee.find(filter)
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Employee.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully',
            data: employees,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        console.error('[getEmployees]', error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

/**
 * GET /api/employees/:id
 * Access: ADMIN, OWNER
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-__v');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        return res.status(200).json({ success: true, data: employee });
    } catch (error) {
        console.error('[getEmployeeById]', error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

/**
 * PUT /api/employees/:id
 * Partial update; runs uniqueness checks on mutable fields.
 * Access: ADMIN, OWNER
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Prevent overwriting system-generated identifiers
        delete updates.employeeCode;
        delete updates._id;

        const conflicts = await findEmployeeConflicts(
            {
                email: updates.email,
                phone: updates.phone,
                medicalRegistrationNo: updates.medicalRegistrationNo,
            },
            id
        );

        if (conflicts.length) {
            return res.status(409).json({ success: false, message: conflicts.join('; ') });
        }

        if (updates.email) updates.email = updates.email.toLowerCase().trim();
        if (updates.qualification) {
            updates.qualification = updates.qualification.filter((q) => q && q.trim());
        }

        const employee = await Employee.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        return res.status(200).json({ success: true, message: 'Employee updated successfully', data: employee });
    } catch (error) {
        console.error('[updateEmployee]', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message).join(', ');
            return res.status(400).json({ success: false, message: messages });
        }
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

/**
 * PATCH /api/employees/:id/status
 * Toggles ACTIVE ↔ INACTIVE.
 * Access: ADMIN, OWNER
 */
exports.toggleEmployeeStatus = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        employee.status = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await employee.save();

        const action = employee.status === 'ACTIVE' ? 'activated' : 'deactivated';
        return res.status(200).json({
            success: true,
            message: `Employee ${action} successfully`,
            data: employee,
        });
    } catch (error) {
        console.error('[toggleEmployeeStatus]', error.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
};

// Export the shared helper so adminController can reuse it without duplication
exports.findEmployeeConflicts = findEmployeeConflicts;