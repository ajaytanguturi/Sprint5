import { StyleSheet } from 'react-native';
import { Colors, FontSizes } from './Theme';

const LandingStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        paddingHorizontal: 24,
        paddingTop: 70,
        paddingBottom: 100,
    },
    heroContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    brandBadge: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: Colors.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 22,
    },
    brandIcon: {
        fontSize: 30,
        color: Colors.white,
    },
    appName: {
        fontSize: FontSizes.medium,
        color: Colors.primary,
        fontWeight: '700',
        marginBottom: 10,
        letterSpacing: 1,
    },
    title: {
        fontSize: FontSizes.title,
        fontWeight: "800",
        color: Colors.text,
        lineHeight: 36,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: FontSizes.medium,
        color: Colors.muted,
        lineHeight: 22,
        marginBottom: 32,
    },
    primaryButton: {
        backgroundColor: Colors.primaryMedium,
        paddingVertical: 15,
        borderRadius: 14,
        marginBottom: 12,
    },
    outlineButton: {
        backgroundColor: Colors.white,
        paddingVertical: 15,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    primaryButtonText: {
        color: Colors.white,
        textAlign: 'center',
        fontSize: FontSizes.medium,
        fontWeight: '700',
    },
    outlineButtonText: {
        color: Colors.primary,
        textAlign: 'center',
        fontSize: FontSizes.medium,
        fontWeight: '700',
    },
    infoCard: {
        backgroundColor: Colors.white,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: 30,
    },
    infoTitle: {
        color: Colors.text,
        fontSize: FontSizes.medium,
        fontWeight: "700",
        marginBottom: 6,
    },
    infoText: {
        color: Colors.muted,
        fontSize: FontSizes.small,
        lineHeight: 18,
    },
});
export default LandingStyles;
