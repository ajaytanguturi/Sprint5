import { StyleSheet } from 'react-native';
import { Colors } from './Theme';

const NavigationStyles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "#9fe6bd",

        paddingBottom: 12,
        paddingTop: 10,
        elevation: 12,
        shadowColor: Colors.primaryDark,
        shadowOffset: {
            width: 0,
            height: -4
        },
        shadowOpacity: 0.12,
        shadowRadius: 12,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '500',
    },

    iconText: {
        fontSize: 18,
    },

});
export default NavigationStyles;    