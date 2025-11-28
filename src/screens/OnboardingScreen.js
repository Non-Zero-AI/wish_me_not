import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { saveUser } from '../services/storage';
import { useTheme } from '../theme/ThemeContext';

const OnboardingScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    const handleGetStarted = async () => {
        if (!firstName || !lastName || !email) {
            Alert.alert('Missing Information', 'Please fill in all fields to continue.');
            return;
        }

        const user = { firstName, lastName, email };
        await saveUser(user);
        navigation.replace('Main');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.primary }]}>Welcome to Wish Me Not</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Create your wish list and share it with friends.</Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border
                        }]}
                        placeholder="First Name"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                    />
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border
                        }]}
                        placeholder="Last Name"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                    />
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border
                        }]}
                        placeholder="Email Address"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]} 
                    onPress={handleGetStarted}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.textInverse }]}>Get Started</Text>
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
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
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
