import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';
import AppointmentsStyles from '../styles/AppointmentsStyles';
import { Colors } from '../styles/Theme';

const Appointments = () => {
    const { user, token } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Doctor Modal Picker State
    const [doctorModalVisible, setDoctorModalVisible] = useState(false);

    // Date calculations (next 8 days)
    const getNextSevenDays = () => {
        const days = [];
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 8; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;

            days.push({
                dateString,
                dayName: weekdays[date.getDay()],
                dayNumber: date.getDate(),
            });
        }
        return days;
    };
    const dateOptions = getNextSevenDays();


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

    const fetchDoctors = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/doctors/available`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setDoctors(data.data);
                if (data.data.length > 0) {
                    setSelectedDoctor(data.data[0]);
                }
            }
        } catch (e) {
            console.error('Error fetching doctors', e);
        }
    };

    const fetchAvailableSlots = async (doctorId: string, dateStr: string) => {
        if (!doctorId || !dateStr || !token) return;
        setLoadingSlots(true);
        setSlotsError('');
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/doctors/${doctorId}/slots?date=${dateStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAvailableSlots(data.data.availableSlots || []);
                if (data.data.availableSlots && data.data.availableSlots.length > 0) {
                    setSelectedSlot(data.data.availableSlots[0]);
                } else {
                    setSelectedSlot('');
                    setSlotsError('Doctor has no available slots on this date.');
                }
            } else {
                setAvailableSlots([]);
                setSelectedSlot('');
                setSlotsError(data.message || 'Failed to load slots');
            }
        } catch (e) {
            console.error('Error fetching slots', e);
            setSlotsError('Error fetching availability slots');
            setAvailableSlots([]);
            setSelectedSlot('');
        } finally {
            setLoadingSlots(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [activeTab]);

    useEffect(() => {
        if (bookingModalVisible) {
            fetchDoctors();
            setSelectedDate(dateOptions[0].dateString);
        }
    }, [bookingModalVisible]);

    useEffect(() => {
        if (selectedDoctor && selectedDate) {
            fetchAvailableSlots(selectedDoctor._id, selectedDate);
        }
    }, [selectedDoctor, selectedDate]);

    const handleOpenBooking = () => {
        setReason('');
        setSelectedSlot('');
        setAvailableSlots([]);
        setBookingModalVisible(true);
    };

    const handleCreateAppointment = async () => {
        if (!selectedDoctor || !selectedDate || !selectedSlot || !reason.trim() || !user?.patient?._id || !token) {
            Alert.alert('Error', 'Please fill in all details and choose a time slot.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientId: user.patient._id,
                    doctorEmployeeId: selectedDoctor._id,
                    date: selectedDate,
                    timeSlot: selectedSlot,
                    reasonForVisit: reason.trim(),
                    department: selectedDoctor.department,
                    consultationFee: selectedDoctor.consultationFee
                })
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert('Success', 'Appointment booked successfully!');
                setBookingModalVisible(false);
                fetchAppointments();
            } else {
                Alert.alert('Booking Failed', data.message || 'Unable to book appointment.');
            }
        } catch (e) {
            console.error('Error creating appointment', e);
            Alert.alert('Error', 'An error occurred while booking.');
        } finally {
            setSubmitting(false);
        }
    };

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

            {/* Floating Action Button for Booking */}
            <TouchableOpacity style={AppointmentsStyles.fab} onPress={handleOpenBooking}>
                <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>

            {/* Book Appointment Modal */}
            <Modal transparent visible={bookingModalVisible} animationType="slide" onRequestClose={() => setBookingModalVisible(false)}>
                <View style={AppointmentsStyles.modalContainer}>
                    <View style={AppointmentsStyles.modalContent}>
                        <View style={AppointmentsStyles.modalHeader}>
                            <Text style={AppointmentsStyles.modalTitle}>Book Appointment</Text>
                            <TouchableOpacity style={AppointmentsStyles.closeButton} onPress={() => setBookingModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.primaryDark} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={AppointmentsStyles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Doctor Selector */}
                            <View style={AppointmentsStyles.formGroup}>
                                <Text style={AppointmentsStyles.formLabel}>Select Doctor</Text>
                                <TouchableOpacity
                                    style={AppointmentsStyles.pickerWrapper}
                                    onPress={() => setDoctorModalVisible(true)}
                                >
                                    <Text style={AppointmentsStyles.pickerText}>
                                        {selectedDoctor ? `Dr. ${selectedDoctor.name} (${selectedDoctor.specialization})` : 'Select a doctor'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Date Selector */}
                            <View style={AppointmentsStyles.formGroup}>
                                <Text style={AppointmentsStyles.formLabel}>Select Date</Text>
                                <FlatList
                                    horizontal
                                    data={dateOptions}
                                    keyExtractor={(item) => item.dateString}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={AppointmentsStyles.dateList}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedDate === item.dateString;
                                        return (
                                            <TouchableOpacity
                                                style={[AppointmentsStyles.dateCard, isSelected ? AppointmentsStyles.activeDateCard : null]}
                                                onPress={() => setSelectedDate(item.dateString)}
                                            >
                                                <Text style={[AppointmentsStyles.dateDay, isSelected ? AppointmentsStyles.activeDateDay : null]}>
                                                    {item.dayName}
                                                </Text>
                                                <Text style={[AppointmentsStyles.dateNumber, isSelected ? AppointmentsStyles.activeDateNumber : null]}>
                                                    {item.dayNumber}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </View>

                            {/* Time Slots Selector */}
                            <View style={AppointmentsStyles.formGroup}>
                                <Text style={AppointmentsStyles.formLabel}>Available Time Slots</Text>
                                {loadingSlots ? (
                                    <ActivityIndicator size="small" color={Colors.primaryMedium} style={{ marginVertical: 10 }} />
                                ) : slotsError ? (
                                    <Text style={AppointmentsStyles.errorText}>{slotsError}</Text>
                                ) : (
                                    <View style={AppointmentsStyles.slotsGrid}>
                                        {availableSlots.map((slot) => {
                                            const isSelected = selectedSlot === slot;
                                            return (
                                                <TouchableOpacity
                                                    key={slot}
                                                    style={[AppointmentsStyles.slotButton, isSelected ? AppointmentsStyles.activeSlotButton : null]}
                                                    onPress={() => setSelectedSlot(slot)}
                                                >
                                                    <Text style={[AppointmentsStyles.slotButtonText, isSelected ? AppointmentsStyles.activeSlotButtonText : null]}>
                                                        {slot}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* Reason for Visit */}
                            <View style={AppointmentsStyles.formGroup}>
                                <Text style={AppointmentsStyles.formLabel}>Reason for Visit</Text>
                                <TextInput
                                    style={[AppointmentsStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Enter reason (e.g. Chest pain, Regular checkup)"
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                />
                            </View>

                            {/* Consultation Fee Display */}
                            {selectedDoctor ? (
                                <View style={AppointmentsStyles.feeBlock}>
                                    <Text style={AppointmentsStyles.feeLabel}>Consultation Fee</Text>
                                    <Text style={AppointmentsStyles.feeValue}>₹{selectedDoctor.consultationFee}</Text>
                                </View>
                            ) : null}

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={AppointmentsStyles.submitButton}
                                onPress={handleCreateAppointment}
                                disabled={submitting || !selectedSlot}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={AppointmentsStyles.submitButtonText}>Confirm Booking</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Doctor Select Picker Modal */}
            <Modal transparent visible={doctorModalVisible} animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.primaryDark, marginBottom: 16 }}>Select Doctor</Text>
                        <FlatList
                            data={doctors}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: Colors.border }}
                                    onPress={() => {
                                        setSelectedDoctor(item);
                                        setDoctorModalVisible(false);
                                    }}
                                >
                                    <Text style={{ fontSize: 16, color: Colors.text, fontWeight: '600' }}>
                                        Dr. {item.name}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: Colors.muted, marginTop: 2 }}>
                                        {item.specialization} • {item.qualification || 'General'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={{ marginTop: 16, padding: 14, backgroundColor: Colors.primaryLight, borderRadius: 12 }}
                            onPress={() => setDoctorModalVisible(false)}
                        >
                            <Text style={{ textAlign: 'center', color: Colors.primaryMedium, fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Appointments;