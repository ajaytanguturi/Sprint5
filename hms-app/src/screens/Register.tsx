import React, { useState } from "react";
import styles from '../styles/AuthStyles';
import { Alert, Text, View, TextInput, TouchableOpacity } from "react-native";
import AuthStyles from "../styles/AuthStyles";


const Register = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [nameError, setNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = () => {
        let valid = true;
        setNameError('');
        setPhoneError('');
        setEmailError('');
        setPasswordError('');

        if (!name.trim()) {
            setNameError('Name is required');
            valid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Email is required');
            valid = false;
        }
        if (password.length < 8) {
            setPasswordError('Password is Required');
            valid = false;
        }
        return valid;
    };
    const handleRegister = () => {
        const isValid = validateForm();
        if (!isValid) {
            return;
        }
        Alert.alert('Success', 'Register successful');
        navigation.navigate('Login');
    };
    return (
        <View style={AuthStyles.container}>
            <View style={AuthStyles.header}>
                <Text style={AuthStyles.brandText}>HMS Care</Text>
                <Text style={AuthStyles.title}>Create Account</Text>
                <Text style={AuthStyles.subtitle}>Register to start using hospital Services</Text>
            </View>
            <View style={AuthStyles.formContainer}>
                <Text style={AuthStyles.label}>Full name</Text>
                <TextInput style={AuthStyles.input}
                    placeholder="Enter full name"
                    value={name}
                    onChangeText={setName}
                />
                <Text style={AuthStyles.label}>Phone number</Text>
                <TextInput
                    style={AuthStyles.input}
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />

                <Text style={AuthStyles.label}>Email address</Text>
                <TextInput
                    style={AuthStyles.input}
                    placeholder="you@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <Text style={AuthStyles.label}>Password</Text>
                <TextInput
                    style={AuthStyles.input}
                    placeholder="Create password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={AuthStyles.button}>
                    <Text style={AuthStyles.buttonText}>Register</Text>
                </TouchableOpacity>

                <View style={AuthStyles.linkRow}>
                    <Text style={AuthStyles.linkText}>Already have an account? </Text>
                    <Text
                        style={AuthStyles.linkAction}
                        onPress={() => navigation.navigate("Login")}
                    >
                        Login
                    </Text>

                </View>
            </View>
        </View>
    );
};

export default Register;
