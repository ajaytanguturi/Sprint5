import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import AuthStyles from '../styles/AuthStyles';

const Login = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Please enter valid email');
            valid = false;
        }
        if (password.length < 8) {
            setPasswordError('Password must be atleast 8 characters');
            valid = false;
        }
        return valid;
    };
    const handleLogin = () => {
        if (validateForm()) {
            console.log('Logging in with', email, password);
        }
    };


    return (
        <View style={AuthStyles.container}>
            <View style={AuthStyles.header}>
                <Text style={AuthStyles.brandText}>HMS Care</Text>
                <Text style={AuthStyles.title}>Welcome Back</Text>
                <Text style={AuthStyles.subtitle}>Login to continue to your account</Text>
            </View>
            <View style={AuthStyles.formContainer}>
                <Text style={AuthStyles.label}>Email</Text>
                <TextInput
                    style={AuthStyles.input}
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <Text style={AuthStyles.label}>Password</Text>
                <TextInput
                    style={AuthStyles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TouchableOpacity style={AuthStyles.button}>
                    <Text style={AuthStyles.buttonText}>Login</Text>
                </TouchableOpacity>
                <View style={AuthStyles.linkRow}>
                    <Text style={AuthStyles.linkText}>Don't have an account ?</Text>
                    <Text style={AuthStyles.linkAction}
                        onPress={() => navigation.navigate("Register")}
                    >Register</Text>
                </View>
            </View>
        </View>
    );
};
export default Login;