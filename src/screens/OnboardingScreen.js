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
    const formMaxWidth = isWeb ? Math.min(400, width - 48) : '100%';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={[styles.formWrapper, isWeb && { maxWidth: formMaxWidth, alignSelf: 'center', width: '100%' }]}>
                    <View style={styles.header}>
                        <Image 
                            source={require('../../assets/Wish Me Not Logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.tagline, { color: theme.colors.secondary, fontFamily: theme.fonts.medium }]}>Stop guessing. Start gifting.</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>Create your wish list and share it with friends.</Text>
                    </View>

                    {/* Google Sign In Button */}
                    <TouchableOpacity
                        style={[styles.googleButton, { 
                            backgroundColor: theme.colors.surface, 
                            borderColor: theme.colors.border 
                        }]}
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                    >
                        {googleLoading ? (
                            <ActivityIndicator color={theme.colors.text} />
                        ) : (
                            <>
                                <Image 
                                    source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                                    style={styles.googleIcon}
                                />
                                <Text style={[styles.googleButtonText, { color: theme.colors.text, fontFamily: theme.fonts.medium }]}>
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
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
                            onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPasswordButton}>
                            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>Forgot Password?</Text>
                        </TouchableOpacity>
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
                        <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                            Don't have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>
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
        padding: 24,
        justifyContent: 'center',
    },
    formWrapper: {
        width: '100%',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 70,
        marginBottom: 16,
    },
    tagline: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 20,
    },
    googleIcon: {
        width: 20,
        height: 20,
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 13,
    },
    form: {
        marginBottom: 20,
    },
    input: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 15,
        borderWidth: 1,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        fontSize: 13,
    },
    button: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        alignItems: 'center',
        padding: 10,
    }
});

export default OnboardingScreen;
