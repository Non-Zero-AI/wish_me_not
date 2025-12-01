import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, updateUserSettings } from '../services/api';
import AppHeader from '../components/AppHeader';

const SettingsScreen = ({ navigation }) => {
    const { theme, toggleTheme, isDark } = useTheme();
    const { user, signOut } = useAuth();
    
    const [revealSurprises, setRevealSurprises] = useState(false);
    const [notifyFriend, setNotifyFriend] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (user) {
            const settings = await getUserSettings(user.id);
            if (settings) {
                setRevealSurprises(settings.reveal_surprises);
                setNotifyFriend(settings.notify_new_friend);
            }
        }
    };

    const handleToggleSurprises = async (value) => {
        setRevealSurprises(value);
        await updateUserSettings(user.id, { reveal_surprises: value });
    };
    
    const handleToggleNotify = async (value) => {
        setNotifyFriend(value);
        await updateUserSettings(user.id, { notify_new_friend: value });
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: signOut }
            ]
        );
    };

    const SettingItem = ({ icon, label, value, onValueChange, type = 'switch', onPress }) => (
        <View style={[styles.item, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name={icon} size={22} color={theme.colors.text} />
                </View>
                <Text style={[styles.itemLabel, { color: theme.colors.text }]}>{label}</Text>
            </View>
            
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#fff"
                />
            ) : (
                <TouchableOpacity onPress={onPress}>
                     <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Settings" showBack={true} />
            
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Preferences</Text>
                    
                    <SettingItem 
                        icon={isDark ? "moon" : "sunny"}
                        label="Dark Mode"
                        value={isDark}
                        onValueChange={toggleTheme}
                    />
                    
                    <SettingItem 
                        icon="gift-outline"
                        label="Reveal Surprises (Who claimed my gifts?)"
                        value={revealSurprises}
                        onValueChange={handleToggleSurprises}
                    />

                     <SettingItem 
                        icon="notifications-outline"
                        label="New Friend Notifications"
                        value={notifyFriend}
                        onValueChange={handleToggleNotify}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Account</Text>
                    
                    <SettingItem 
                        type="link"
                        icon="key-outline"
                        label="Change Password"
                        onPress={() => navigation.navigate('UpdatePassword')}
                    />
                    
                     <SettingItem 
                        type="link"
                        icon="document-text-outline"
                        label="Privacy Policy"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    />
                </View>

                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={[styles.logoutText, { color: theme.colors.error }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    section: {
        marginBottom: 24,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginLeft: 20,
        marginBottom: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemLabel: {
        fontSize: 16,
        flex: 1,
    },
    logoutButton: {
        marginHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderRadius: 12,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    versionText: {
        textAlign: 'center',
        marginBottom: 40,
        fontSize: 12,
    }
});

export default SettingsScreen;
