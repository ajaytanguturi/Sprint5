import React from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import Landing from "../screens/Landing";
import Login from '../screens/Login';
import Register from '../screens/Register';

import NavigationStyles from "../styles/NavigationStyles";
import { Colors } from "../styles/Theme";

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

const AuthStackNavigator = () => {
    return (
        <AuthStack.Navigator screenOptions={{
            headerShown: false,
            animation: "fade_from_bottom"

        }}
        >
            <AuthStack.Screen name="Login" component={Login} />
            <AuthStack.Screen name="Register" component={Register} />
        </AuthStack.Navigator>
    );
};
const BottomTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="HomeTab"
            screenOptions={{
                headerShown: false,
                tabBarStyle: NavigationStyles.tabBar,
                tabBarActiveTintColor: Colors.primaryMedium,
                tabBarInactiveTintColor: Colors.primaryDark,
                tabBarLabelStyle: NavigationStyles.tabLabel,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={Landing}
                options={{
                    tabBarLabel: "Home",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="AuthTab"
                component={AuthStackNavigator}
                options={{
                    tabBarLabel: "Login",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "log-in" : "log-in-outline"} color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    )
}

const AppNavigation = () => {
    return (
        <NavigationContainer>
            <BottomTabs />
        </NavigationContainer>
    )
}
export default AppNavigation;