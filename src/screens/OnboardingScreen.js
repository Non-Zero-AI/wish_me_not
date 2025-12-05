import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { addLocalFriend } from '../services/storage';

const OnboardingScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { signIn, signInWithGoogle } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [pendingFriendEmail, setPendingFriendEmail] = useState(null);

    const handleLogin = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        // DEBUG: Immediate feedback
        console.log('LOGIN BUTTON PRESSED'); 

        if (!email || !password) {
            Alert.alert('Missing Information', 'Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            console.log('Attempting login...');
            const { user, error } = await signIn({ email, password });

            if (error) {
                console.log('Login failed with error object from AuthContext');
                return; // Alert already shown in AuthContext
            }

            if (!user) {
                console.log('Login returned no user and no error');
                Alert.alert(
                    'Login Failed',
                    'We could not log you in. Please double-check your email and password, or confirm your email if you just signed up.'
                );
                return;
            }

            console.log('Login successful, navigating to Main');
            if (pendingFriendEmail) {
                try {
                    await addLocalFriend(pendingFriendEmail);
                } catch (e) {
                    console.warn('Failed to add pending friend', e);
                }
            }

            // Explicitly navigate out of Auth stack to Main
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            });
        } catch (error) {
            console.error('Login Critical Error:', error);
            Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = () => {
        navigation.navigate('SignUp');
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            await signInWithGoogle();
        } finally {
            setGoogleLoading(false);
        }
    };

    // Responsive max width for web
    const formMaxWidth = isWeb ? Math.min(420, width - 32) : '100%';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#1C1E22' }]}> 
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View
                    style={[
                        styles.mobileWrapper,
                        isWeb && { maxWidth: formMaxWidth, alignSelf: 'center', width: '100%' },
                    ]}
                >
                    <View style={styles.main}>
                        {/* Logo / Title */}
                        <View style={styles.logoSection}>
                            <Text style={styles.appTitle}>Wish Me Not</Text>
                            <Text style={styles.appSubtitle}>Stop guessing, Start gifting</Text>
                        </View>

                        {/* Welcome text */}
                        <View style={styles.welcomeSection}>
                            <Text style={styles.welcomeTitle}>Welcome Back</Text>
                            <Text style={styles.welcomeSubtitle}>Sign in to continue your journey</Text>
                        </View>

                        {/* Google Sign-in */}
                        <View style={styles.socialLoginSection}>
                            <TouchableOpacity
                                style={styles.googleButton}
                                onPress={handleGoogleSignIn}
                                disabled={googleLoading}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 8 }} />
                                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerLabel}>or sign in with email</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Email / Password form */}
                        <View style={styles.formSection}>
                            {/* Email */}
                            <View style={styles.fieldBlock}>
                                <Text style={styles.fieldLabel}>Email Address</Text>
                                <View style={styles.fieldInputWrapper}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={18}
                                        color="#AAB2C0"
                                        style={styles.fieldIcon}
                                    />
                                    <TextInput
                                        style={styles.fieldInput}
                                        placeholder="your@email.com"
                                        placeholderTextColor="#6B7280"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View style={styles.fieldBlock}>
                                <Text style={styles.fieldLabel}>Password</Text>
                                <View style={styles.fieldInputWrapper}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={18}
                                        color="#AAB2C0"
                                        style={styles.fieldIcon}
                                    />
                                    <TextInput
                                        style={styles.fieldInput}
                                        placeholder="••••••••"
                                        placeholderTextColor="#6B7280"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        onSubmitEditing={handleLogin}
                                    />
                                </View>
                            </View>

                            {/* Forgot password */}
                            <TouchableOpacity
                                style={styles.forgotPasswordContainer}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Sign in button */}
                        <View style={styles.signInButtonSection}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Sign In</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Sign up link */}
                        <View style={styles.signupRow}>
                            <Text style={styles.signupText}>
                                Not a member?
                            </Text>
                            <TouchableOpacity onPress={handleSignUp}>
                                <Text style={styles.signupLink}> Sign up now!</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    mobileWrapper: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 32,
        backgroundColor: '#1C1E22',
    },
    main: {
        flex: 1,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    appSubtitle: {
        marginTop: 6,
        fontSize: 13,
        color: '#AAB2C0',
    },
    welcomeSection: {
        marginBottom: 20,
    },
    welcomeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontSize: 13,
        color: '#AAB2C0',
    },
    socialLoginSection: {
        marginBottom: 20,
    },
    googleButton: {
        height: 56,
        borderRadius: 16,
        backgroundColor: '#24272C',
        borderWidth: 1,
        borderColor: '#2E3238',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#15171a',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    googleButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#2E3238',
    },
    dividerLabel: {
        marginHorizontal: 12,
        fontSize: 12,
        color: '#AAB2C0',
    },
    formSection: {
        marginBottom: 20,
    },
    fieldBlock: {
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 12,
        color: '#AAB2C0',
        marginBottom: 4,
        marginLeft: 4,
    },
    fieldInputWrapper: {
        height: 56,
        borderRadius: 16,
        backgroundColor: '#1C1E22',
        borderWidth: 1,
        borderColor: '#2E3238',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    fieldIcon: {
        marginRight: 8,
    },
    fieldInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    forgotPasswordLink: {
        fontSize: 13,
        color: '#60A5FA',
        fontWeight: '500',
    },
    signInButtonSection: {
        marginBottom: 12,
    },
    primaryButton: {
        height: 56,
        borderRadius: 16,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(70,80,220,0.6)',
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    signupText: {
        fontSize: 13,
        color: '#AAB2C0',
    },
    signupLink: {
        fontSize: 13,
        color: '#60A5FA',
        fontWeight: '600',
    },
});

export default OnboardingScreen;
