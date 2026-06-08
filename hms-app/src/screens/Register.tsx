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