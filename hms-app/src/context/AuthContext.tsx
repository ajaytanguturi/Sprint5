import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiConfig';

interface AuthContextType {
    user: any;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    registerPatient: (fields: any) => Promise<void>;
    updateProfile: (updatedFields: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCredentials = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                const storedUser = await AsyncStorage.getItem('userData');
                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load credentials from storage', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadCredentials();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Invalid email or password');
        }
        const { tokens, ...userData } = resData.data;
        const jwtToken = tokens.accessToken;

        await AsyncStorage.setItem('userToken', jwtToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setToken(jwtToken);
        setUser(userData);
    };

    const registerPatient = async (fields: any) => {
        const response = await fetch(`${API_BASE_URL}/auth/patient-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Registration failed');
        }
    };

    const updateProfile = async (updatedFields: any) => {
        if (!user || !user.patient || !token) return;
        const response = await fetch(`${API_BASE_URL}/patients/${user.patient._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedFields),
        });
        const resData = await response.json();
        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Profile update failed');
        }
        const updatedUser = {
            ...user,
            patient: resData.data
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, registerPatient, updateProfile, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
};