import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { createUser } from '../services/api';
import { addLocalFriend } from '../services/storage';

const OnboardingScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingFriendEmail, setPendingFriendEmail] = useState(null);

    useEffect(() => {
        const checkInitialURL = async () => {
            try {
                const url = await Linking.getInitialURL();
                if (url) {
                    // Parse email from wishlist/:email pattern
                    // Support both scheme and https
                    const match = url.match(/wishlist\/([^/?]+)/);
                    if (match && match[1]) {
                        const friendEmail = decodeURIComponent(match[1]);
                        console.log('Deep link detected, pending friend:', friendEmail);
                        setPendingFriendEmail(friendEmail);
                    }
                }
            } catch (e) {
                console.warn('Deep link check failed', e);
            }
        };
        checkInitialURL();
    }, []);

    const handleGetStarted = async () => {
        if (!username || !email) {
            Alert.alert('Missing Information', 'Please fill in all fields to continue.');
            return;
        }

        setLoading(true);
        try {
            // Map username to firstName for backward compatibility
            const user = { firstName: username, lastName: '', email, username };
            // Send to automation webhook
            await createUser(user);
            
            // Add pending friend if any
            if (pendingFriendEmail) {
                await addLocalFriend(pendingFriendEmail);
            }

            // Login locally
            await login(user);
        } catch (error) {
            console.error('Onboarding error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <Text style={{ fontSize: 20, color: theme.colors.text }}>Onboarding Screen Debug</Text>
            <TouchableOpacity onPress={handleGetStarted} style={{ marginTop: 20, padding: 10, backgroundColor: theme.colors.primary }}>
                <Text style={{ color: 'white' }}>Force Login</Text>
            </TouchableOpacity>
        </View>
    );

    /*
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
    ...
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
    */
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
});

export default OnboardingScreen;
