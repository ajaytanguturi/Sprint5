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