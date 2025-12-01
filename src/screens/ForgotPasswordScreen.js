import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

const ForgotPasswordScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            // Redirect back to the app after clicking the link
            // URL scheme: wishmenot://reset-password
            const redirectUrl = Linking.createURL('/reset-password');
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            Alert.alert(
                'Check your email', 
                'We have sent a password reset link to your email address.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Password Reset Error:', error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>Reset Password</Text>
            </View>

            <View style={styles.content}>
                <Text style={[styles.description, { color: theme.colors.text }]}>
                    Enter the email address associated with your account and we'll send you a link to reset your password.
                </Text>

                <View style={styles.form}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Email Address</Text>
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
                        placeholder="Enter your email"
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                        <Text style={[styles.buttonText, { color: theme.colors.textInverse, fontFamily: theme.fonts.bold }]}>
                            Send Reset Link
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
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
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
        opacity: 0.8,
    },
    form: {
        marginBottom: 32,
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

export default ForgotPasswordScreen;
