import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import LandingStyles from "../styles/LandingStyles";
import { Ionicons } from "@expo/vector-icons";

const Landing = ({ navigation }: any) => {
    return (
        <View style={LandingStyles.container}>
            <View style={LandingStyles.heroContainer}>
                <View style={LandingStyles.brandBadge}>
                    <Text style={LandingStyles.brandIcon}>✚</Text>
                </View>
                <Text style={LandingStyles.appName}>HMS Care</Text>
                <Text style={LandingStyles.title}>Welcome to your {"\n"} Hospital Management {"\n"} System</Text>
                <Text style={LandingStyles.subtitle}>
                    Book Appointments, manage patient records and access to healthcare services from one place
                </Text>
                <TouchableOpacity
                    style={LandingStyles.primaryButton}
                    onPress={() => navigation.navigate("AuthTab", {
                        screen: "Login",
                    })}>
                    <Text style={LandingStyles.primaryButtonText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={LandingStyles.outlineButton}
                    onPress={() => navigation.navigate("AuthTab", {
                        screen: 'Register'
                    })}>
                    <Text style={LandingStyles.outlineButtonText}>Register</Text>
                </TouchableOpacity>
                <View style={LandingStyles.infoCard}>
                    <Text style={LandingStyles.infoTitle}>Manage Healthcare easily</Text>
                    <Text style={LandingStyles.infoText}>Patients can login, Register, book appointments and view their healthcare details</Text>
                </View>
            </View>
        </View>
    );
};
export default Landing;