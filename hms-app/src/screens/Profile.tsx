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