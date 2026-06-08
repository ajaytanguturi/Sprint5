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