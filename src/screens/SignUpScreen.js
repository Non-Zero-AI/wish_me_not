import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { createUser } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const SignUpScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { signUp } = useAuth();
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = (pass) => {
        // Must contain letters, numbers, and at least one of !@#$%&*
        const hasLetter = /[a-zA-Z]/.test(pass);
        const hasNumber = /\d/.test(pass);
        const hasSpecial = /[!@#$%&*]/.test(pass);
        const minLength = pass.length >= 8; // Assuming 8 chars min length for safety

        return hasLetter && hasNumber && hasSpecial && minLength;
    };

    const handleSignUp = async () => {
        if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
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
            await signUp({
                email,
                password,
                firstName,
                lastName,
                username,
            });

            Alert.alert(
                'Check your email',
                'We have sent a confirmation link to your email. Please confirm your account, then return here to log in.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Sign up error:', error);
            // Alert is already handled in AuthContext
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
             <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>Create Account</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

                        <Text style={[styles.label, { color: theme.colors.text }]}>Username</Text>
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.surface, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                                fontFamily: theme.fonts.regular
                            }]}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />

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
                        <Text style={[styles.buttonText, { color: theme.colors.textInverse, fontFamily: theme.fonts.bold }]}>
                            {loading ? 'Creating...' : 'Sign Up'}
                        </Text>
                    </TouchableOpacity>
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
    header: {
        padding: 24,
        paddingBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    form: {
        marginBottom: 32,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    helperText: {
        fontSize: 12,
        marginTop: -12,
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
});

export default SignUpScreen;
