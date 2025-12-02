import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const SignUpScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { signUp, signInWithGoogle } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const validatePassword = (pass) => {
        // Must contain letters, numbers, and at least one of !@#$%&*
        const hasLetter = /[a-zA-Z]/.test(pass);
        const hasNumber = /\d/.test(pass);
        const hasSpecial = /[!@#$%&*]/.test(pass);
        const minLength = pass.length >= 8; // Assuming 8 chars min length for safety

        return hasLetter && hasNumber && hasSpecial && minLength;
    };

    const handleSignUp = async () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Alert.alert('Missing Information', 'Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Password Error', 'Passwords do not match.');
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert('Weak Password', 'Password must contain letters, numbers, and at least one special character (!@#$%&*).');
            return;
        }

        setLoading(true);
        try {
            const result = await signUp({
                email,
                password,
                firstName,
                lastName,
            });

            console.log('SignUp result:', result);

            // Check if auth succeeded (user object exists)
            if (result?.user) {
                console.log('Sign up succeeded, showing alert');
                
                if (Platform.OS === 'web') {
                    // On web, window.alert is synchronous
                    window.alert('Check your email: We have sent a confirmation link to your email. Please confirm your account, then return here to log in.');
                    navigation.goBack();
                } else {
                    Alert.alert(
                        'Check your email',
                        'We have sent a confirmation link to your email. Please confirm your account, then return here to log in.',
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                }
            } else {
                console.log('Sign up returned no user');
                Alert.alert('Sign Up Issue', 'Account may have been created. Please check your email or try logging in.');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Sign up error:', error);
            // Alert is already handled in AuthContext
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
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
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.formWrapper, isWeb && { maxWidth: formMaxWidth, alignSelf: 'center', width: '100%' }]}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>Create Account</Text>
                        </View>

                        {/* Google Sign Up Button */}
                        <TouchableOpacity
                            style={[styles.googleButton, { 
                                backgroundColor: theme.colors.surface, 
                                borderColor: theme.colors.border 
                            }]}
                            onPress={handleGoogleSignUp}
                            disabled={googleLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator color={theme.colors.text} />
                            ) : (
                                <Text style={[styles.googleButtonText, { color: theme.colors.text, fontFamily: theme.fonts.medium }]}>
                                    Sign up with Google
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        </View>

                        <View style={styles.form}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>First Name</Text>
                                <TextInput
                                    style={[styles.input, { 
                                        backgroundColor: theme.colors.surface, 
                                        color: theme.colors.text,
                                        borderColor: theme.colors.border,
                                        fontFamily: theme.fonts.regular
                                    }]}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Last Name</Text>
                                <TextInput
                                    style={[styles.input, { 
                                        backgroundColor: theme.colors.surface, 
                                        color: theme.colors.text,
                                        borderColor: theme.colors.border,
                                        fontFamily: theme.fonts.regular
                                    }]}
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.surface, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                                fontFamily: theme.fonts.regular
                            }]}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.surface, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                                fontFamily: theme.fonts.regular
                            }]}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                            Must contain letters, numbers, and !@#$%&*
                        </Text>

                        <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Confirm Password</Text>
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.surface, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                                fontFamily: theme.fonts.regular
                            }]}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                    </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                            onPress={handleSignUp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.textInverse} />
                            ) : (
                                <Text style={[styles.buttonText, { color: theme.colors.textInverse, fontFamily: theme.fonts.bold }]}>
                                    Sign Up
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                                Already have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Log In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    formWrapper: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        marginRight: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 16,
    },
    googleButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
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
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 15,
        borderWidth: 1,
    },
    helperText: {
        fontSize: 11,
        marginTop: -8,
        marginBottom: 8,
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
        padding: 12,
        marginTop: 8,
    },
});

export default SignUpScreen;
