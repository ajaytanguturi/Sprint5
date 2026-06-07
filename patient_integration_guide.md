# HMS Care: Patient Portal Integration & Walkthrough Guide (Organized Styles)

This guide contains the exact changes to implement for both the **Backend (Node.js/Express/MongoDB)** and the **Frontend (Expo React Native `hms-app`)**. It is designed to be easily copy-pasted and run.

No code has been modified directly in your project. You can copy the code from each section to integrate the features.

---

## Part 1: Backend Integration Changes

To support patients registering, logging in, and retrieving their own data, we will update the backend schemas, controllers, route handlers, and data filters.

### 1. Update the User Model
**File to modify:** `HMS-Backend/src/models/userModel.js`
*   Add `'PATIENT'` to roles.
*   Add `patientId` reference.
*   Update the `pre-save` hook to enforce roles correctly.

Replace the contents of `userModel.js` or apply this diff:

```javascript
const mongoose = require('mongoose');
const Counter = require('./counterModel');

const userSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            select: false,
        },
        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'INACTIVE'],
                message: 'Status must be ACTIVE or INACTIVE',
            },
            default: 'INACTIVE',
        },
        roles: {
            type: [String],
            enum: {
                values: ['OWNER', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'NURSE', 'LAB_TECH', 'PHARMACIST', 'PATIENT'],
                message: 'Invalid role provided',
            },
            required: [true, 'At least one role is required'],
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            default: null,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            default: null,
        },
        approvalStatus: {
            type: String,
            enum: {
                values: ['PENDING', 'APPROVED', 'REJECTED'],
                message: 'Approval status must be PENDING, APPROVED, or REJECTED',
            },
            default: 'PENDING',
        },
        isTemporaryPassword: {
            type: Boolean,
            default: false,
        },
        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            default: null,
            select: false,
        },
        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

userSchema.pre('save', async function () {
    if (!this.userId) {
        const seq = await Counter.getNextSequence('userId');
        this.userId = `USR-${String(seq).padStart(4, '0')}`;
    }
});

userSchema.pre('save', function () {
    const roles = this.roles || [];
    const isAdminLevel = roles.some(
        (r) => r === 'OWNER' || r === 'ADMIN'
    );
    const isPatient = roles.some((r) => r === 'PATIENT');
    
    if (!isAdminLevel) {
        if (isPatient) {
            if (!this.patientId) {
                throw new Error('patientId is required for PATIENT role');
            }
        } else {
            if (!this.employeeId) {
                throw new Error(
                    `employeeId is required for roles: ${roles.join(', ')}`
                );
            }
        }
    }
});

module.exports = mongoose.model('User', userSchema);
```

---

### 2. Update Auth Controller (Register Patients, Login, and getMe)
**File to modify:** `HMS-Backend/src/controllers/authController.js`
*   Add `'PATIENT'` to `VALID_ROLES`.
*   Populate `patientId` in `login` and `getMe` and return the patient profile in the response payload.
*   Implement `patientRegister` to generate pre-linked `Patient` and `User` Mongo ObjectIds (solving the circular validation hook issue).

Add the following import at the top:
```javascript
const Patient = require('../models/patientModel');
const mongoose = require('mongoose');
```

Update `VALID_ROLES` (around line 9):
```javascript
const VALID_ROLES = ['OWNER', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'NURSE', 'LAB_TECH', 'PHARMACIST', 'PATIENT'];
```

Update `buildTokenPayload` (around line 15):
```javascript
const buildTokenPayload = (user) => ({
    id: user._id,
    userId: user.userId,
    email: user.email,
    roles: user.roles,
    status: user.status,
    employeeId: user.employeeId || null,
    patientId: user.patientId || null,
});
```

Add this function to the bottom of the file (or export it in `module.exports`):
```javascript
const patientRegister = async (req, res) => {
    try {
        const { name, email, phone, gender, dob, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const [existingUser, existingPatient] = await Promise.all([
            User.findOne({ email: normalizedEmail }),
            Patient.findOne({ email: normalizedEmail }),
        ]);

        if (existingUser || existingPatient) {
            return res.status(409).json({ success: false, message: `Email "${email}" is already registered` });
        }

        const dobDate = new Date(dob);
        if (dobDate > new Date()) {
            return res.status(400).json({ success: false, message: 'Date of birth cannot be in the future' });
        }

        // Generate matching ObjectIds beforehand to prevent validation hook failures
        const userId = new mongoose.Types.ObjectId();
        const patientId = new mongoose.Types.ObjectId();
        const passwordHash = await bcrypt.hash(password, 12);

        // 1. Create Patient profile
        const patient = new Patient({
            _id: patientId,
            name,
            phone: phone.trim(),
            email: normalizedEmail,
            gender,
            dob: dobDate,
            registeredBy: userId,
            status: 'ACTIVE',
        });
        await patient.save();

        // 2. Create User account
        const user = new User({
            _id: userId,
            email: normalizedEmail,
            passwordHash,
            roles: ['PATIENT'],
            patientId: patientId,
            status: 'ACTIVE',
            approvalStatus: 'APPROVED',
        });
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Patient registered successfully. You can now log in.',
            data: {
                userId: user.userId,
                email: user.email,
                roles: user.roles,
                status: user.status,
                patient: {
                    UHID: patient.UHID,
                    name: patient.name,
                    phone: patient.phone,
                    email: patient.email,
                    gender: patient.gender,
                    age: patient.age,
                }
            }
        });
    } catch (err) {
        return handleControllerError(res, err, 'patientRegister');
    }
};
```

Make sure to populate `patientId` in both `login` and `getMe` controllers:

**In `login`:**
```javascript
        const user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+passwordHash +refreshToken')
            .populate('employeeId', 'employeeCode name designation department email phone specialization')
            .populate('patientId', 'UHID name phone email gender dob address emergencyContact medicalHistory');
```
And return `patient: user.patientId || null` in the `data` response object.

**In `getMe`:**
```javascript
        const user = await User.findById(req.user.id)
            .populate('employeeId', 'employeeCode name designation department email phone specialization qualification consultationFee')
            .populate('patientId', 'UHID name phone email gender dob address emergencyContact medicalHistory');
```
And return `patient: user.patientId || null` in the `data` response object.

Remember to export `patientRegister` at the bottom:
```javascript
module.exports = { register, selfRegister, login, getMe, forgotPassword, resetPassword, changePassword, patientRegister };
```

---

### 3. Add Patient Register Route
**File to modify:** `HMS-Backend/src/routes/authroutes.js`
*   Import `patientRegister`.
*   Declare validation rules for patient registration.
*   Register the route.

Apply the following modifications:

```javascript
// Add patientRegister to imports
const { register, selfRegister, login, getMe, forgotPassword, resetPassword, changePassword, patientRegister } = require('../controllers/authController');

// Validation rules
const patientRegisterRules = [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    body('dob').isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// Mount endpoint
router.post('/patient-register', patientRegisterRules, validate, patientRegister);
```

---

### 4. Update the Ownership Filter
**File to modify:** `HMS-Backend/src/utils/ownershipFilter.js`
*   Ensure that when a logged-in user is a `'PATIENT'`, they can only access records matching their own `patientId` (instead of filtering by who registered them).

Update the entire file:

```javascript
const ADMIN_ROLES = new Set(['ADMIN', 'OWNER']);

const buildOwnershipFilter = (user, ownershipField) => {
    if (!user) return {};
    const userRoles = user.roles || [];
    if (userRoles.some((role) => ADMIN_ROLES.has(role))) {
        return {};
    }
    if (userRoles.includes('PATIENT')) {
        // Patients can only read/write their own patient profile record
        return { _id: user.patientId };
    }
    return { [ownershipField]: user.id };
};

module.exports = { buildOwnershipFilter };
```

---

### 5. Update Appointment Filters and Access Rules
**File to modify:** `HMS-Backend/src/controllers/appointmentController.js`
*   Update the `creatorFilter` helper to filter by `patientId` if the logged-in user is a patient.
*   Update `getPatientAppointments` to allow patients to fetch their own records but block them from fetching other patients' records.

Update `creatorFilter` (around line 24):
```javascript
const creatorFilter = (user) => {
    if (isAdmin(user)) return {};
    if (user.roles.includes('PATIENT')) {
        return { patientId: user.patientId };
    }
    return { createdByEmployeeId: user.id };
};
```

Update `getPatientAppointments` (around line 245):
```javascript
exports.getPatientAppointments = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Security check: patients can only fetch their own appointments
        if (req.user.roles.includes('PATIENT') && req.user.patientId.toString() !== patientId) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only view your own appointments.' });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const filter = { patientId };
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
```

---

### 6. Update Route Authorizations for Patients
**File to modify:** `HMS-Backend/src/routes/appointmentRoutes.js`
*   Add `'PATIENT'` to the `getPatientAppointments` role authorization.

Change line 82:
```javascript
router.get('/patient/:patientId', authorize('RECEPTIONIST', 'ADMIN', 'OWNER', 'PATIENT'), getPatientAppointments);
```

**File to modify:** `HMS-Backend/src/routes/patientRoutes.js`
*   Add `'PATIENT'` to the edit patient role authorization.

Change line 47:
```javascript
router.put('/:id', authorize('RECEPTIONIST', 'ADMIN', 'OWNER', 'PATIENT'), updateRules, validate, updatePatient);
```

---

### 7. Create Backend Environment Variables
**File to create:** `HMS-Backend/.env`

Create this file in the root of your `HMS-Backend` folder:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hms
JWT_ACCESS_SECRET=hms_super_access_secret_key_987654321
JWT_REFRESH_SECRET=hms_super_refresh_secret_key_123456789
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d
```

---

## Part 2: Frontend Integration Changes (`hms-app`)

We will install `@react-native-async-storage/async-storage` for persistence, then create the configuration files, context provider, and patient screens.

### 0. Package Installation
Run the following command inside your `hms-app` directory to install AsyncStorage for Expo:
```bash
npx expo install @react-native-async-storage/async-storage
```

---

### 1. Create API Base URL Configuration
**File to create:** `hms-app/src/config/apiConfig.ts`

```typescript
import { Platform } from 'react-native';

export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});
```

---

### 2. Create the Authentication Context (`AuthContext`)
**File to create:** `hms-app/src/context/AuthContext.tsx`

```typescript
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiConfig';

interface AuthContextType {
    user: any;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    registerPatient: (fields: any) => Promise<void>;
    updateProfile: (updatedFields: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCredentials = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                const storedUser = await AsyncStorage.getItem('userData');
                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load credentials from storage', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadCredentials();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Invalid email or password');
        }
        const { tokens, ...userData } = resData.data;
        const jwtToken = tokens.accessToken;
        
        await AsyncStorage.setItem('userToken', jwtToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setToken(jwtToken);
        setUser(userData);
    };

    const registerPatient = async (fields: any) => {
        const response = await fetch(`${API_BASE_URL}/auth/patient-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Registration failed');
        }
    };

    const updateProfile = async (updatedFields: any) => {
        if (!user || !user.patient || !token) return;
        const response = await fetch(`${API_BASE_URL}/patients/${user.patient._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedFields),
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Profile update failed');
        }
        const updatedUser = {
            ...user,
            patient: resData.data
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, registerPatient, updateProfile, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
};
```

---

### 3. Create Separate Screen Style Files (`src/styles/`)

To keep style sheets cleanly separated from the layout components, create the following files inside `hms-app/src/styles/`.

#### 📄 Styles File A: `hms-app/src/styles/DashboardStyles.tsx`
```typescript
import { StyleSheet } from 'react-native';
import { Colors } from './Theme';

const DashboardStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    banner: {
        backgroundColor: Colors.primaryDark,
        padding: 24,
        borderRadius: 24,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.primaryLight,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        flex: 0.48,
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.muted,
        marginBottom: 6,
    },
    statVal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
    },
    appointmentCard: {
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    doctorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    doctorSpec: {
        fontSize: 14,
        color: Colors.muted,
        marginTop: 2,
    },
    badge: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: Colors.primaryMedium,
        fontSize: 11,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 14,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: Colors.muted,
    },
    detailVal: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    emptyCard: {
        backgroundColor: Colors.white,
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.muted,
        textAlign: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionBtn: {
        flex: 0.48,
        backgroundColor: Colors.primaryMedium,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionBtnText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default DashboardStyles;
```

#### 📄 Styles File B: `hms-app/src/styles/AppointmentsStyles.tsx`
```typescript
import { StyleSheet } from 'react-native';
import { Colors } from './Theme';

const AppointmentsStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primaryDark,
        marginBottom: 16,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#e6ede9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 18,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.muted,
    },
    activeTabText: {
        color: Colors.primaryMedium,
    },
    card: {
        backgroundColor: Colors.white,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    doctorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    doctorSpec: {
        fontSize: 13,
        color: Colors.muted,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        fontSize: 13,
        color: Colors.muted,
    },
    value: {
        fontSize: 13,
        color: Colors.text,
        fontWeight: '500',
    },
    notesBlock: {
        backgroundColor: Colors.primaryLight,
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
    },
    notesTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.primaryDark,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 12,
        color: Colors.text,
        marginBottom: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: Colors.muted,
        fontSize: 14,
    },
});

export default AppointmentsStyles;
```

#### 📄 Styles File C: `hms-app/src/styles/ProfileStyles.tsx`
```typescript
import { StyleSheet } from 'react-native';
import { Colors } from './Theme';

const ProfileStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primaryDark,
        marginBottom: 16,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 16,
    },
    cardHeading: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primaryMedium,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: 4,
    },
    label: {
        fontSize: 12,
        color: Colors.muted,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 4,
    },
    valueText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
        paddingVertical: 2,
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        color: Colors.text,
        fontSize: 14,
        marginTop: 2,
        backgroundColor: '#fafcfa',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    actionBtn: {
        flex: 0.48,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    errorText: {
        color: 'red',
        fontSize: 11,
        marginTop: 2,
    },
    generalError: {
        color: 'red',
        fontWeight: 'bold',
        marginBottom: 12,
    },
});

export default ProfileStyles;
```

---

### 4. Update the Login Screen (Form Validation and Integration)
**File to modify:** `hms-app/src/screens/Login.tsx`

```tsx
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useAuth } from '../context/AuthContext';
import AuthStyles from '../styles/AuthStyles';
import { Colors } from "../styles/Theme";

const Login = ({ navigation }: any) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitError, setSubmitError] = useState('');

    const validateForm = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');
        setSubmitError('');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!emailRegex.test(email.trim())) {
            setEmailError('Please enter a valid email address');
            valid = false;
        }

        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            valid = false;
        }

        return valid;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setSubmitError('');
        try {
            await login(email.trim(), password);
        } catch (err: any) {
            setSubmitError(err.message || 'Login failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={AuthStyles.container}>
            <View style={AuthStyles.header}>
                <Text style={AuthStyles.brandText}>HMS Care</Text>
                <Text style={AuthStyles.title}>Welcome Back</Text>
                <Text style={AuthStyles.subtitle}>Login to continue to your account</Text>
            </View>
            <View style={AuthStyles.formContainer}>
                {submitError ? <Text style={[AuthStyles.error, { color: 'red', fontWeight: 'bold' }]}>{submitError}</Text> : null}

                <Text style={AuthStyles.label}>Email</Text>
                <TextInput
                    style={[AuthStyles.input, emailError ? { borderColor: 'red' } : null]}
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {emailError ? <Text style={AuthStyles.error}>{emailError}</Text> : null}

                <Text style={AuthStyles.label}>Password</Text>
                <TextInput
                    style={[AuthStyles.input, passwordError ? { borderColor: 'red' } : null]}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                {passwordError ? <Text style={AuthStyles.error}>{passwordError}</Text> : null}

                <TouchableOpacity style={AuthStyles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={AuthStyles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <View style={AuthStyles.linkRow}>
                    <Text style={AuthStyles.linkText}>Don't have an account? </Text>
                    <Text style={AuthStyles.linkAction} onPress={() => navigation.navigate("Register")}>
                        Register
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default Login;
```

---

### 5. Update the Register Screen (Gender & DOB Fields + Full Validation)
**File to modify:** `hms-app/src/screens/Register.tsx`

```tsx
import React, { useState } from "react";
import { Alert, Text, View, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from "react-native";
import { useAuth } from '../context/AuthContext';
import AuthStyles from "../styles/AuthStyles";
import { Colors } from "../styles/Theme";

const Register = ({ navigation }: any) => {
    const { registerPatient } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState('Male');
    const [dob, setDob] = useState('');
    const [password, setPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [genderModalVisible, setGenderModalVisible] = useState(false);

    const [nameError, setNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [dobError, setDobError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitError, setSubmitError] = useState('');

    const validateForm = () => {
        let valid = true;
        setNameError('');
        setPhoneError('');
        setEmailError('');
        setDobError('');
        setPasswordError('');
        setSubmitError('');

        if (!name.trim()) {
            setNameError('Full name is required');
            valid = false;
        }

        const phoneRegex = /^\d{10}$/;
        if (!phone.trim()) {
            setPhoneError('Phone number is required');
            valid = false;
        } else if (!phoneRegex.test(phone.trim())) {
            setPhoneError('Phone must be a 10-digit number');
            valid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!emailRegex.test(email.trim())) {
            setEmailError('Please enter a valid email address');
            valid = false;
        }

        const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dob.trim()) {
            setDobError('Date of birth is required');
            valid = false;
        } else if (!dobRegex.test(dob.trim())) {
            setDobError('DOB must be in YYYY-MM-DD format');
            valid = false;
        } else {
            const parsedDob = new Date(dob);
            if (isNaN(parsedDob.getTime())) {
                setDobError('Invalid date entered');
                valid = false;
            } else if (parsedDob > new Date()) {
                setDobError('Date of birth cannot be in the future');
                valid = false;
            }
        }

        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            valid = false;
        }

        return valid;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setSubmitError('');
        try {
            await registerPatient({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                gender,
                dob,
                password,
            });
            Alert.alert('Success', 'Registration successful! You can now log in.');
            navigation.navigate('Login');
        } catch (err: any) {
            setSubmitError(err.message || 'Registration failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={[AuthStyles.container, { paddingTop: 40, paddingBottom: 40 }]}>
            <View style={AuthStyles.header}>
                <Text style={AuthStyles.brandText}>HMS Care</Text>
                <Text style={AuthStyles.title}>Create Account</Text>
                <Text style={AuthStyles.subtitle}>Register to start using hospital Services</Text>
            </View>
            <View style={AuthStyles.formContainer}>
                {submitError ? <Text style={[AuthStyles.error, { color: 'red', fontWeight: 'bold' }]}>{submitError}</Text> : null}

                <Text style={AuthStyles.label}>Full Name</Text>
                <TextInput
                    style={[AuthStyles.input, nameError ? { borderColor: 'red' } : null]}
                    placeholder="Enter full name"
                    value={name}
                    onChangeText={setName}
                />
                {nameError ? <Text style={AuthStyles.error}>{nameError}</Text> : null}

                <Text style={AuthStyles.label}>Phone Number</Text>
                <TextInput
                    style={[AuthStyles.input, phoneError ? { borderColor: 'red' } : null]}
                    placeholder="10-digit phone number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                />
                {phoneError ? <Text style={AuthStyles.error}>{phoneError}</Text> : null}

                <Text style={AuthStyles.label}>Email Address</Text>
                <TextInput
                    style={[AuthStyles.input, emailError ? { borderColor: 'red' } : null]}
                    placeholder="you@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {emailError ? <Text style={AuthStyles.error}>{emailError}</Text> : null}

                <Text style={AuthStyles.label}>Gender</Text>
                <TouchableOpacity
                    style={[AuthStyles.input, { justifyContent: 'center' }]}
                    onPress={() => setGenderModalVisible(true)}
                >
                    <Text style={{ color: Colors.text }}>{gender}</Text>
                </TouchableOpacity>

                <Text style={AuthStyles.label}>Date of Birth</Text>
                <TextInput
                    style={[AuthStyles.input, dobError ? { borderColor: 'red' } : null]}
                    placeholder="YYYY-MM-DD"
                    value={dob}
                    onChangeText={setDob}
                />
                {dobError ? <Text style={AuthStyles.error}>{dobError}</Text> : null}

                <Text style={AuthStyles.label}>Password</Text>
                <TextInput
                    style={[AuthStyles.input, passwordError ? { borderColor: 'red' } : null]}
                    placeholder="Create password (min 8 chars)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                {passwordError ? <Text style={AuthStyles.error}>{passwordError}</Text> : null}

                <TouchableOpacity style={AuthStyles.button} onPress={handleRegister} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={AuthStyles.buttonText}>Register</Text>
                    )}
                </TouchableOpacity>

                <View style={AuthStyles.linkRow}>
                    <Text style={AuthStyles.linkText}>Already have an account? </Text>
                    <Text style={AuthStyles.linkAction} onPress={() => navigation.navigate("Login")}>
                        Login
                    </Text>
                </View>
            </View>

            {/* Gender Picker Modal */}
            <Modal transparent visible={genderModalVisible} animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.primaryDark, marginBottom: 16 }}>Select Gender</Text>
                        {['Male', 'Female', 'Other'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: Colors.border }}
                                onPress={() => {
                                    setGender(item);
                                    setGenderModalVisible(false);
                                }}
                            >
                                <Text style={{ fontSize: 16, color: Colors.text }}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={{ marginTop: 16, padding: 14, backgroundColor: Colors.primaryLight, borderRadius: 12 }}
                            onPress={() => setGenderModalVisible(false)}
                        >
                            <Text style={{ textAlign: 'center', color: Colors.primaryMedium, fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default Register;
```

---

### 6. Create Patient Dashboard Screen
**File to create:** `hms-app/src/screens/Dashboard.tsx`
*   Import styles from `../styles/DashboardStyles`.

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';
import DashboardStyles from '../styles/DashboardStyles';
import { Colors } from '../styles/Theme';

const Dashboard = ({ navigation }: any) => {
    const { user, token } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = async () => {
        if (!user || !user.patient || !token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/patient/${user.patient._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAppointments(data.data);
            }
        } catch (e) {
            console.error('Error fetching dashboard appointments', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const patientName = user?.patient?.name || 'Patient';
    const nextAppt = appointments.find(appt => appt.status === 'BOOKED');

    return (
        <ScrollView style={DashboardStyles.container} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Header Greeting Banner */}
            <View style={DashboardStyles.banner}>
                <Text style={DashboardStyles.greeting}>Hello, {patientName}</Text>
                <Text style={DashboardStyles.subtitle}>Welcome to HMS Care. Have a healthy day!</Text>
            </View>

            {/* Quick Stats Grid */}
            <View style={DashboardStyles.statsRow}>
                <View style={DashboardStyles.statCard}>
                    <Text style={DashboardStyles.statLabel}>Hospital ID (UHID)</Text>
                    <Text style={DashboardStyles.statVal}>{user?.patient?.UHID || 'N/A'}</Text>
                </View>
                <View style={DashboardStyles.statCard}>
                    <Text style={DashboardStyles.statLabel}>Total Bookings</Text>
                    <Text style={DashboardStyles.statVal}>{appointments.length}</Text>
                </View>
            </View>

            {/* Next Appointment Section */}
            <Text style={DashboardStyles.sectionTitle}>Your Next Appointment</Text>
            {loading ? (
                <ActivityIndicator size="large" color={Colors.primaryMedium} style={{ marginTop: 20 }} />
            ) : nextAppt ? (
                <View style={DashboardStyles.appointmentCard}>
                    <View style={DashboardStyles.cardHeader}>
                        <Text style={DashboardStyles.doctorName}>Dr. {nextAppt.doctorEmployeeId?.name}</Text>
                        <View style={DashboardStyles.badge}>
                            <Text style={DashboardStyles.badgeText}>{nextAppt.status}</Text>
                        </View>
                    </View>
                    <Text style={DashboardStyles.doctorSpec}>{nextAppt.doctorEmployeeId?.specialization || 'General'}</Text>
                    
                    <View style={DashboardStyles.divider} />
                    
                    <View style={DashboardStyles.detailRow}>
                        <Text style={DashboardStyles.detailLabel}>Date:</Text>
                        <Text style={DashboardStyles.detailVal}>{new Date(nextAppt.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={DashboardStyles.detailRow}>
                        <Text style={DashboardStyles.detailLabel}>Time Slot:</Text>
                        <Text style={DashboardStyles.detailVal}>{nextAppt.timeSlot}</Text>
                    </View>
                    <View style={DashboardStyles.detailRow}>
                        <Text style={DashboardStyles.detailLabel}>Reason:</Text>
                        <Text style={DashboardStyles.detailVal}>{nextAppt.reasonForVisit}</Text>
                    </View>
                </View>
            ) : (
                <View style={DashboardStyles.emptyCard}>
                    <Text style={DashboardStyles.emptyText}>No upcoming appointments scheduled.</Text>
                </View>
            )}

            {/* Quick Actions */}
            <Text style={DashboardStyles.sectionTitle}>Quick Actions</Text>
            <View style={DashboardStyles.actionsRow}>
                <TouchableOpacity style={DashboardStyles.actionBtn} onPress={() => navigation.navigate('Appointments')}>
                    <Text style={DashboardStyles.actionBtnText}>View Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={DashboardStyles.actionBtn} onPress={() => navigation.navigate('Profile')}>
                    <Text style={DashboardStyles.actionBtnText}>Update Profile</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default Dashboard;
```

---

### 7. Create Patient Appointments Screen
**File to create:** `hms-app/src/screens/Appointments.tsx`
*   Import styles from `../styles/AppointmentsStyles`.

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';
import AppointmentsStyles from '../styles/AppointmentsStyles';
import { Colors } from '../styles/Theme';

const Appointments = () => {
    const { user, token } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    const fetchAppointments = async () => {
        if (!user || !user.patient || !token) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/patient/${user.patient._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAppointments(data.data);
            }
        } catch (e) {
            console.error('Error fetching appointments', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [activeTab]);

    const filteredAppointments = appointments.filter(appt => {
        if (activeTab === 'upcoming') {
            return appt.status === 'BOOKED';
        } else {
            return appt.status === 'COMPLETED' || appt.status === 'CANCELLED';
        }
    });

    const renderAppointmentItem = ({ item }: { item: any }) => (
        <View style={AppointmentsStyles.card}>
            <View style={AppointmentsStyles.cardHeader}>
                <Text style={AppointmentsStyles.doctorName}>Dr. {item.doctorEmployeeId?.name}</Text>
                <View style={[
                    AppointmentsStyles.badge, 
                    item.status === 'CANCELLED' ? { backgroundColor: '#ffebee' } : 
                    item.status === 'COMPLETED' ? { backgroundColor: '#e8f5e9' } : { backgroundColor: Colors.primaryLight }
                ]}>
                    <Text style={[
                        AppointmentsStyles.badgeText,
                        item.status === 'CANCELLED' ? { color: '#c62828' } :
                        item.status === 'COMPLETED' ? { color: '#2e7d32' } : { color: Colors.primaryMedium }
                    ]}>
                        {item.status}
                    </Text>
                </View>
            </View>
            <Text style={AppointmentsStyles.doctorSpec}>{item.doctorEmployeeId?.specialization || 'General Medicine'}</Text>
            
            <View style={AppointmentsStyles.divider} />
            
            <View style={AppointmentsStyles.row}>
                <Text style={AppointmentsStyles.label}>Date / Time:</Text>
                <Text style={AppointmentsStyles.value}>{new Date(item.date).toLocaleDateString()} at {item.timeSlot}</Text>
            </View>
            <View style={AppointmentsStyles.row}>
                <Text style={AppointmentsStyles.label}>Reason for Visit:</Text>
                <Text style={AppointmentsStyles.value}>{item.reasonForVisit}</Text>
            </View>
            <View style={AppointmentsStyles.row}>
                <Text style={AppointmentsStyles.label}>Consultation Fee:</Text>
                <Text style={AppointmentsStyles.value}>₹{item.consultationFee}</Text>
            </View>

            {/* Render Clinical Notes if completed */}
            {item.status === 'COMPLETED' && (item.diagnosis || item.prescription) ? (
                <View style={AppointmentsStyles.notesBlock}>
                    <Text style={AppointmentsStyles.notesTitle}>Clinical Notes</Text>
                    {item.diagnosis ? (
                        <Text style={AppointmentsStyles.notesText}><Text style={{ fontWeight: '600' }}>Diagnosis:</Text> {item.diagnosis}</Text>
                    ) : null}
                    {item.prescription ? (
                        <Text style={AppointmentsStyles.notesText}><Text style={{ fontWeight: '600' }}>Prescription:</Text> {item.prescription}</Text>
                    ) : null}
                </View>
            ) : null}
        </View>
    );

    return (
        <View style={AppointmentsStyles.container}>
            <Text style={AppointmentsStyles.title}>Your Appointments</Text>
            
            {/* Custom Tab Bar */}
            <View style={AppointmentsStyles.tabBar}>
                <TouchableOpacity 
                    style={[AppointmentsStyles.tab, activeTab === 'upcoming' ? AppointmentsStyles.activeTab : null]} 
                    onPress={() => setActiveTab('upcoming')}
                >
                    <Text style={[AppointmentsStyles.tabText, activeTab === 'upcoming' ? AppointmentsStyles.activeTabText : null]}>Upcoming</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[AppointmentsStyles.tab, activeTab === 'past' ? AppointmentsStyles.activeTab : null]} 
                    onPress={() => setActiveTab('past')}
                >
                    <Text style={[AppointmentsStyles.tabText, activeTab === 'past' ? AppointmentsStyles.activeTabText : null]}>Past Visits</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primaryMedium} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredAppointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListEmptyComponent={
                        <View style={AppointmentsStyles.emptyState}>
                            <Text style={AppointmentsStyles.emptyStateText}>No appointments found.</Text>
                        </View>
                    }
                    onRefresh={fetchAppointments}
                    refreshing={loading}
                />
            )}
        </View>
    );
};

export default Appointments;
```

---

### 8. Create Patient Profile Screen (View & Edit with Strict Validation)
**File to create:** `hms-app/src/screens/Profile.tsx`
*   Import styles from `../styles/ProfileStyles`.

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import ProfileStyles from '../styles/ProfileStyles';
import { Colors } from '../styles/Theme';

const Profile = () => {
    const { user, updateProfile, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form Field States
    const [name, setName] = useState(user?.patient?.name || '');
    const [phone, setPhone] = useState(user?.patient?.phone || '');
    
    // Address
    const [line1, setLine1] = useState(user?.patient?.address?.line1 || '');
    const [city, setCity] = useState(user?.patient?.address?.city || '');
    const [postcode, setPostcode] = useState(user?.patient?.address?.postcode || '');

    // Emergency Contact
    const [emergencyName, setEmergencyName] = useState(user?.patient?.emergencyContact?.name || '');
    const [emergencyPhone, setEmergencyPhone] = useState(user?.patient?.emergencyContact?.phone || '');
    const [emergencyRelation, setEmergencyRelation] = useState(user?.patient?.emergencyContact?.relation || '');

    // Medical History
    const [medicalHistory, setMedicalHistory] = useState(user?.patient?.medicalHistory || '');

    // Error States
    const [nameError, setNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [emergencyPhoneError, setEmergencyPhoneError] = useState('');
    const [submitError, setSubmitError] = useState('');

    const validateForm = () => {
        let valid = true;
        setNameError('');
        setPhoneError('');
        setEmergencyPhoneError('');
        setSubmitError('');

        if (!name.trim()) {
            setNameError('Full name is required');
            valid = false;
        }

        const phoneRegex = /^\d{10}$/;
        if (!phone.trim()) {
            setPhoneError('Phone number is required');
            valid = false;
        } else if (!phoneRegex.test(phone.trim())) {
            setPhoneError('Phone must be a 10-digit number');
            valid = false;
        }

        if (emergencyPhone.trim() && !phoneRegex.test(emergencyPhone.trim())) {
            setEmergencyPhoneError('Emergency phone must be a 10-digit number');
            valid = false;
        }

        return valid;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            await updateProfile({
                name: name.trim(),
                phone: phone.trim(),
                address: { line1, city, postcode },
                emergencyContact: { name: emergencyName, phone: emergencyPhone, relation: emergencyRelation },
                medicalHistory,
            });
            Alert.alert('Success', 'Profile updated successfully');
            setIsEditing(false);
        } catch (e: any) {
            setSubmitError(e.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset states to original user values
        setName(user?.patient?.name || '');
        setPhone(user?.patient?.phone || '');
        setLine1(user?.patient?.address?.line1 || '');
        setCity(user?.patient?.address?.city || '');
        setPostcode(user?.patient?.address?.postcode || '');
        setEmergencyName(user?.patient?.emergencyContact?.name || '');
        setEmergencyPhone(user?.patient?.emergencyContact?.phone || '');
        setEmergencyRelation(user?.patient?.emergencyContact?.relation || '');
        setMedicalHistory(user?.patient?.medicalHistory || '');
        
        // Reset errors
        setNameError('');
        setPhoneError('');
        setEmergencyPhoneError('');
        setSubmitError('');
        setIsEditing(false);
    };

    const formatDob = (dobStr: string) => {
        if (!dobStr) return 'N/A';
        return new Date(dobStr).toLocaleDateString();
    };

    return (
        <ScrollView style={ProfileStyles.container} contentContainerStyle={{ paddingBottom: 120 }}>
            <Text style={ProfileStyles.title}>My Profile</Text>

            {submitError ? <Text style={ProfileStyles.generalError}>{submitError}</Text> : null}

            <View style={ProfileStyles.card}>
                <Text style={ProfileStyles.cardHeading}>Basic Info</Text>
                
                <Text style={ProfileStyles.label}>Full Name</Text>
                {isEditing ? (
                    <TextInput 
                        style={[ProfileStyles.input, nameError ? { borderColor: 'red' } : null]} 
                        value={name} 
                        onChangeText={setName} 
                    />
                ) : (
                    <Text style={ProfileStyles.valueText}>{user?.patient?.name}</Text>
                )}
                {nameError ? <Text style={ProfileStyles.errorText}>{nameError}</Text> : null}

                <Text style={ProfileStyles.label}>Phone Number</Text>
                {isEditing ? (
                    <TextInput 
                        style={[ProfileStyles.input, phoneError ? { borderColor: 'red' } : null]} 
                        value={phone} 
                        onChangeText={setPhone} 
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                ) : (
                    <Text style={ProfileStyles.valueText}>{user?.patient?.phone}</Text>
                )}
                {phoneError ? <Text style={ProfileStyles.errorText}>{phoneError}</Text> : null}

                <Text style={ProfileStyles.label}>Email Address (Read-only)</Text>
                <Text style={[ProfileStyles.valueText, { color: Colors.muted }]}>{user?.patient?.email}</Text>

                <View style={ProfileStyles.row}>
                    <View style={{ flex: 0.48 }}>
                        <Text style={ProfileStyles.label}>Gender</Text>
                        <Text style={ProfileStyles.valueText}>{user?.patient?.gender}</Text>
                    </View>
                    <View style={{ flex: 0.48 }}>
                        <Text style={ProfileStyles.label}>Date of Birth (Age)</Text>
                        <Text style={ProfileStyles.valueText}>{formatDob(user?.patient?.dob)} ({user?.patient?.age} yrs)</Text>
                    </View>
                </View>
            </View>

            <View style={ProfileStyles.card}>
                <Text style={ProfileStyles.cardHeading}>Address</Text>
                
                <Text style={ProfileStyles.label}>Line 1</Text>
                {isEditing ? (
                    <TextInput style={ProfileStyles.input} value={line1} onChangeText={setLine1} />
                ) : (
                    <Text style={ProfileStyles.valueText}>{line1 || 'N/A'}</Text>
                )}

                <View style={ProfileStyles.row}>
                    <View style={{ flex: 0.48 }}>
                        <Text style={ProfileStyles.label}>City</Text>
                        {isEditing ? (
                            <TextInput style={ProfileStyles.input} value={city} onChangeText={setCity} />
                        ) : (
                            <Text style={ProfileStyles.valueText}>{city || 'N/A'}</Text>
                        )}
                    </View>
                    <View style={{ flex: 0.48 }}>
                        <Text style={ProfileStyles.label}>Postcode</Text>
                        {isEditing ? (
                            <TextInput style={ProfileStyles.input} value={postcode} onChangeText={setPostcode} />
                        ) : (
                            <Text style={ProfileStyles.valueText}>{postcode || 'N/A'}</Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={ProfileStyles.card}>
                <Text style={ProfileStyles.cardHeading}>Emergency Contact</Text>
                
                <Text style={ProfileStyles.label}>Contact Name</Text>
                {isEditing ? (
                    <TextInput style={ProfileStyles.input} value={emergencyName} onChangeText={setEmergencyName} />
                ) : (
                    <Text style={ProfileStyles.valueText}>{emergencyName || 'N/A'}</Text>
                )}

                <Text style={ProfileStyles.label}>Phone Number</Text>
                {isEditing ? (
                    <TextInput 
                        style={[ProfileStyles.input, emergencyPhoneError ? { borderColor: 'red' } : null]} 
                        value={emergencyPhone} 
                        onChangeText={setEmergencyPhone} 
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                ) : (
                    <Text style={ProfileStyles.valueText}>{emergencyPhone || 'N/A'}</Text>
                )}
                {emergencyPhoneError ? <Text style={ProfileStyles.errorText}>{emergencyPhoneError}</Text> : null}

                <Text style={ProfileStyles.label}>Relation</Text>
                {isEditing ? (
                    <TextInput style={ProfileStyles.input} value={emergencyRelation} onChangeText={setEmergencyRelation} />
                ) : (
                    <Text style={ProfileStyles.valueText}>{emergencyRelation || 'N/A'}</Text>
                )}
            </View>

            <View style={ProfileStyles.card}>
                <Text style={ProfileStyles.cardHeading}>Medical History</Text>
                {isEditing ? (
                    <TextInput 
                        style={[ProfileStyles.input, { height: 80, textAlignVertical: 'top' }]} 
                        value={medicalHistory} 
                        onChangeText={setMedicalHistory} 
                        multiline 
                    />
                ) : (
                    <Text style={ProfileStyles.valueText}>{medicalHistory || 'No medical history reported.'}</Text>
                )}
            </View>

            {/* Action Buttons */}
            {isEditing ? (
                <View style={ProfileStyles.btnRow}>
                    <TouchableOpacity style={[ProfileStyles.actionBtn, { backgroundColor: '#e0e0e0' }]} onPress={handleCancel}>
                        <Text style={[ProfileStyles.btnText, { color: Colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[ProfileStyles.actionBtn, { backgroundColor: Colors.primaryMedium }]} onPress={handleSave} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={ProfileStyles.btnText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={ProfileStyles.btnRow}>
                    <TouchableOpacity style={[ProfileStyles.actionBtn, { backgroundColor: Colors.primaryMedium }]} onPress={() => setIsEditing(true)}>
                        <Text style={ProfileStyles.btnText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[ProfileStyles.actionBtn, { backgroundColor: '#c62828' }]} onPress={logout}>
                        <Text style={ProfileStyles.btnText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

export default Profile;
```

---

### 9. Update Application Navigation Setup
**File to modify:** `hms-app/src/navigations/AppNavigation.tsx`

```tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Import Screens
import Landing from "../screens/Landing";
import Login from '../screens/Login';
import Register from '../screens/Register';
import Dashboard from '../screens/Dashboard';
import Appointments from '../screens/Appointments';
import Profile from '../screens/Profile';

// Context & Theme
import { AuthProvider, useAuth } from '../context/AuthContext';
import NavigationStyles from "../styles/NavigationStyles";
import { Colors } from "../styles/Theme";

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// Stack for Guest Auth (Login -> Register)
const AuthStackNavigator = () => {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
            <AuthStack.Screen name="Login" component={Login} />
            <AuthStack.Screen name="Register" component={Register} />
        </AuthStack.Navigator>
    );
};

// Bottom tabs displayed to guests
const GuestTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="HomeTab"
            screenOptions={{
                headerShown: false,
                tabBarStyle: NavigationStyles.tabBar,
                tabBarActiveTintColor: Colors.primaryMedium,
                tabBarInactiveTintColor: Colors.primaryDark,
                tabBarLabelStyle: NavigationStyles.tabLabel,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={Landing}
                options={{
                    tabBarLabel: "Home",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="AuthTab"
                component={AuthStackNavigator}
                options={{
                    tabBarLabel: "Login",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "log-in" : "log-in-outline"} color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    );
};

// Bottom tabs displayed to logged-in patients
const PatientTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="DashboardTab"
            screenOptions={{
                headerShown: false,
                tabBarStyle: NavigationStyles.tabBar,
                tabBarActiveTintColor: Colors.primaryMedium,
                tabBarInactiveTintColor: Colors.primaryDark,
                tabBarLabelStyle: NavigationStyles.tabLabel,
            }}
        >
            <Tab.Screen
                name="DashboardTab"
                component={Dashboard}
                options={{
                    tabBarLabel: "Dashboard",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="AppointmentsTab"
                component={Appointments}
                options={{
                    tabBarLabel: "Appointments",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={Profile}
                options={{
                    tabBarLabel: "Profile",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person" : "person-outline"} color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    );
};

const NavigationWrapper = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
                <ActivityIndicator size="large" color={Colors.primaryMedium} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {user ? <PatientTabs /> : <GuestTabs />}
        </NavigationContainer>
    );
};

const AppNavigation = () => {
    return (
        <AuthProvider>
            <NavigationWrapper />
        </AuthProvider>
    );
};

export default AppNavigation;
```

---

## Part 3: Seed Script for Testing

To check that your app is loading appointments from the database, you can use this seed script.

**File to create:** `HMS-Backend/src/seed_data.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Employee = require('./models/employeeModel');
const Patient = require('./models/patientModel');
const Appointment = require('./models/appointmentModel');
const Counter = require('./models/counterModel');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Create Counter seeds
        const counters = ['userId', 'UHID', 'appointmentModel', 'employeeCode', 'appointmentId'];
        for (const c of counters) {
            const exists = await Counter.findOne({ id: c });
            if (!exists) {
                await new Counter({ id: c, seq: 1 }).save();
            }
        }

        // Create Doctor Employee if none exists
        let doctor = await Employee.findOne({ email: 'doctor@hospital.com' });
        if (!doctor) {
            doctor = new Employee({
                name: 'Albert Smith',
                phone: '9999999999',
                email: 'doctor@hospital.com',
                department: 'OPD',
                designation: 'Senior Cardiologist',
                specialization: 'Cardiology',
                availabilitySlots: ['09:00-09:30', '09:30-10:00', '10:00-10:30'],
                consultationFee: 500,
                status: 'ACTIVE',
            });
            await doctor.save();
            console.log('Doctor created!');

            const docUser = new User({
                email: 'doctor@hospital.com',
                passwordHash: '$2a$12$R.SDR/R0D7gqgQWv3pGqeu8Q1eJ9fO6N51zS3f8yH5kQ8f36H6K9G', // password123
                roles: ['DOCTOR'],
                employeeId: doctor._id,
                status: 'ACTIVE',
                approvalStatus: 'APPROVED',
            });
            await docUser.save();
        }

        // Find any Patient to attach mock appointments to
        const patient = await Patient.findOne();
        if (patient) {
            console.log(`Found patient ${patient.name}. Adding 2 mock appointments...`);
            
            // Check if user account exists for patient
            let userAcc = await User.findOne({ patientId: patient._id });
            if (!userAcc) {
                userAcc = new User({
                    email: patient.email,
                    passwordHash: '$2a$12$R.SDR/R0D7gqgQWv3pGqeu8Q1eJ9fO6N51zS3f8yH5kQ8f36H6K9G', // password123
                    roles: ['PATIENT'],
                    patientId: patient._id,
                    status: 'ACTIVE',
                    approvalStatus: 'APPROVED',
                });
                await userAcc.save();
                console.log(`Created User login account for ${patient.email} (password: password123)`);
            }

            // Clean up existing appointments to avoid duplication
            await Appointment.deleteMany({ patientId: patient._id });

            // Create upcoming appointment
            const appt1 = new Appointment({
                patientId: patient._id,
                doctorEmployeeId: doctor._id,
                date: new Date(Date.now() + 86400000), // tomorrow
                timeSlot: '09:00-09:30',
                department: 'OPD',
                appointmentType: 'Consultation',
                reasonForVisit: 'General chest pain follow up',
                consultationFee: 500,
                status: 'BOOKED',
                createdByEmployeeId: userAcc._id,
            });
            await appt1.save();

            // Create past appointment
            const appt2 = new Appointment({
                patientId: patient._id,
                doctorEmployeeId: doctor._id,
                date: new Date(Date.now() - 86400000), // yesterday
                timeSlot: '10:00-10:30',
                department: 'OPD',
                appointmentType: 'Consultation',
                reasonForVisit: 'Initial cardiovascular screening',
                consultationFee: 500,
                status: 'COMPLETED',
                doctorNotes: 'Patient cardiovascular metrics look stable. Suggested regular exercise.',
                diagnosis: 'Mild arrhythmia',
                prescription: 'Aspirin 75mg daily',
                createdByEmployeeId: userAcc._id,
            });
            await appt2.save();

            console.log('Mock appointments seeded!');
        } else {
            console.log('Register a patient on the app first, then run this script to seed mock appointments for them!');
        }

        mongoose.connection.close();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
```
