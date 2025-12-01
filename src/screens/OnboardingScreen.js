import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { createUser } from '../services/api';
import { addLocalFriend } from '../services/storage';

const OnboardingScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingFriendEmail, setPendingFriendEmail] = useState(null);

    // ... existing useEffect ...

    const handleLogin = async () => {
        console.log('Login button pressed. Email:', email, 'Password length:', password?.length);
        if (!email || !password) {
            Alert.alert('Missing Information', 'Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            console.log('Verifying credentials via webhook...');
            // User request: Call create_user webhook for sign in verification
            // Payload includes all filled info (email, password)
            // We wait for confirmation (success response)
            await createUser({ email, password });
            console.log('Credentials verified.');

            // Now fetch full user profile to populate app state
            console.log('Fetching user profile...');
            const userInfo = await fetchUserInfo(email);
            console.log('User info fetched:', userInfo);
            
            if (userInfo) {
                 // Add pending friend if any
                if (pendingFriendEmail) {
                    await addLocalFriend(pendingFriendEmail);
                }

                console.log('Logging in...');
                // Persist login with password if needed, or just profile
                await login({ ...userInfo, email }); 
            } else {
                Alert.alert('Login Failed', 'User profile not found after verification.');
            }
        } catch (error) {
            console.error('Login error:', error);
            // If createUser fails (400/500), we assume invalid credentials or server error
            Alert.alert('Login Failed', 'Invalid credentials or server error.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = () => {
        navigation.navigate('SignUp');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/splash-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>Wish Me Not</Text>
                    <Text style={[styles.tagline, { color: theme.colors.secondary, fontFamily: theme.fonts.medium }]}>Stop guessing. Start gifting.</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>Create your wish list and share it with friends.</Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border,
                            fontFamily: theme.fonts.regular
                        }]}
                        placeholder="Email Address"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border,
                            fontFamily: theme.fonts.regular
                        }]}
                        placeholder="Password"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                        <Text style={[styles.buttonText, { color: theme.colors.textInverse, fontFamily: theme.fonts.bold }]}>Log In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.secondaryButton, { marginTop: 16 }]}
                    onPress={handleSignUp}
                >
                    <Text style={{ color: theme.colors.text, fontSize: 16 }}>
                        Don't have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 48,
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        marginBottom: 32,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    secondaryButton: {
        alignItems: 'center',
        padding: 12,
    }
});

export default OnboardingScreen;
