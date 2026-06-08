import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Import Screens
import Landing from "../screens/Landing";
import Login from '../screens/Login';
import Register from '../screens/Register';
import Dashboard from '../screens/Dashboard';
import Appointments from '../screens/Appointments';
import Profile from '../screens/Profile';

// Context & Theme
import { AuthProvider, useAuth } from '../context/AuthContext';
import NavigationStyles from "../styles/NavigationStyles";
import { Colors } from "../styles/Theme";

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// Stack for Guest Auth (Login -> Register)
const AuthStackNavigator = () => {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
            <AuthStack.Screen name="Login" component={Login} />
            <AuthStack.Screen name="Register" component={Register} />
        </AuthStack.Navigator>
    );
};

// Bottom tabs displayed to guests
const GuestTabs = () => {
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
    );
};

// Bottom tabs displayed to logged-in patients
const PatientTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="DashboardTab"
            screenOptions={{
                headerShown: false,
                tabBarStyle: NavigationStyles.tabBar,
                tabBarActiveTintColor: Colors.primaryMedium,
                tabBarInactiveTintColor: Colors.primaryDark,
                tabBarLabelStyle: NavigationStyles.tabLabel,
            }}
        >
            <Tab.Screen
                name="DashboardTab"
                component={Dashboard}
                options={{
                    tabBarLabel: "Dashboard",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="AppointmentsTab"
                component={Appointments}
                options={{
                    tabBarLabel: "Appointments",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={Profile}
                options={{
                    tabBarLabel: "Profile",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person" : "person-outline"} color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    );
};

const NavigationWrapper = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
                <ActivityIndicator size="large" color={Colors.primaryMedium} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {user ? <PatientTabs /> : <GuestTabs />}
        </NavigationContainer>
    );
};

const AppNavigation = () => {
    return (
        <AuthProvider>
            <NavigationWrapper />
        </AuthProvider>
    );
};

export default AppNavigation;