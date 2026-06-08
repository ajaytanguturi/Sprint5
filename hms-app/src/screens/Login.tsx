import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useAuth } from '../context/AuthContext';
import AuthStyles from '../styles/AuthStyles';
import { Colors } from "../styles/Theme";

const Login = ({ navigation }: any) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitError, setSubmitError] = useState('');

    const validateForm = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');
        setSubmitError('');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!emailRegex.test(email.trim())) {
            setEmailError('Please enter a valid email address');
            valid = false;
        }
        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            valid = false;
        }
        return valid;
    };
    const handleLogin = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setSubmitError('');
        try {
            await login(email.trim(), password);
        } catch (err: any) {
            setSubmitError(err.message || 'Login failed. Try again.');
        } finally {
            setLoading(false);
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
                {submitError ? <Text style={[AuthStyles.error, { color: 'red', fontWeight: 'bold' }]}>{submitError}</Text> : null}
                <Text style={AuthStyles.label}>Email</Text>
                <TextInput
                    style={[AuthStyles.input, emailError ? { borderColor: 'red' } : null]}
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {emailError ? <Text style={AuthStyles.error}>{emailError}</Text> : null}

                <Text style={AuthStyles.label}>Password</Text>
                <TextInput
                    style={[AuthStyles.input, passwordError ? { borderColor: 'red' } : null]}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                {passwordError ? <Text style={AuthStyles.error}>{passwordError}</Text> : null}
                <TouchableOpacity style={AuthStyles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={AuthStyles.buttonText}>Login</Text>
                    )}
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