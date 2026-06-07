import { StyleSheet } from 'react-native';
import { Colors, FontSizes } from './Theme';

const AuthStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        paddingHorizontal: 24,
        paddingTop: 70,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 32,
    },

    brandText: {
        fontSize: FontSizes.medium,
        color: Colors.primary,
        fontWeight: "700",
        marginBottom: 8,
    },

    title: {
        fontSize: 26,
        fontWeight: "800",
        color: Colors.text,
        marginBottom: 8,
    },

    subtitle: {
        fontSize: FontSizes.normal,
        color: Colors.muted,
    },

    formContainer: {
        backgroundColor: Colors.white,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    label: {
        fontSize: FontSizes.small,
        fontWeight: "600",
        color: Colors.primaryDark,
        marginBottom: 6,
    },

    input: {

        height: 48,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: FontSizes.normal,
        color: Colors.text,
        backgroundColor: Colors.white,
        marginBottom: 14,

    },

    button: {
        backgroundColor: Colors.primaryMedium,
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 6,
    },

    buttonText: {
        color: Colors.white,
        textAlign: "center",
        fontSize: FontSizes.medium,
        fontWeight: "700",
    },

    linkRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 18,
    },

    linkText: {
        color: Colors.muted,
        fontSize: FontSizes.normal,
    },

    linkAction: {
        color: Colors.primary,
        fontSize: FontSizes.normal,
        fontWeight: "700",
    },
    error: {
        color: 'red',
        marginBottom: 10,
        marginLeft: 5,
    },
});
export default AuthStyles;