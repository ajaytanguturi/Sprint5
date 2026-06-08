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