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
    // Floating Action Button
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 110,
        backgroundColor: Colors.primaryMedium,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    closeButton: {
        padding: 4,
    },
    modalScroll: {
        flex: 1,
        marginTop: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.muted,
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        color: Colors.text,
        backgroundColor: '#fcfdfc',
    },
    pickerWrapper: {
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        justifyContent: 'center',
        paddingHorizontal: 12,
        backgroundColor: '#fcfdfc',
    },
    pickerText: {
        fontSize: 14,
        color: Colors.text,
    },

    // Horizontal Date Picker Styles
    dateList: {
        paddingVertical: 4,
    },
    dateCard: {
        width: 60,
        height: 75,
        borderRadius: 12,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    activeDateCard: {
        backgroundColor: Colors.primaryMedium,
        borderColor: Colors.primaryMedium,
    },
    dateDay: {
        fontSize: 11,
        color: Colors.muted,
        fontWeight: '600',
    },
    activeDateDay: {
        color: Colors.white,
    },
    dateNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primaryDark,
        marginTop: 4,
    },
    activeDateNumber: {
        color: Colors.white,
    },

    // Time Slots Layout
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
    },
    slotButton: {
        flexBasis: '30%',
        marginHorizontal: '1.6%',
        marginBottom: 10,
        height: 38,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeSlotButton: {
        backgroundColor: Colors.primaryMedium,
        borderColor: Colors.primaryMedium,
    },
    slotButtonText: {
        fontSize: 12,
        color: Colors.text,
        fontWeight: '500',
    },
    activeSlotButtonText: {
        color: Colors.white,
        fontWeight: 'bold',
    },

    // Consultation Fee Panel
    feeBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0faf4',
        padding: 14,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#d2eedf',
    },
    feeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primaryDark,
    },
    feeValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primaryMedium,
    },

    // Submit button
    submitButton: {
        backgroundColor: Colors.primaryMedium,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 10,
        fontWeight: '500',
    },
});

export default AppointmentsStyles;