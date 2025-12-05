import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, TextInput, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, updateUserSettings, isUsernameAvailable, updateUsername } from '../services/api';
import { getUser, saveUser, getLocalSettings, saveLocalSettings, clearLocalCache } from '../services/storage';
import AppHeader from '../components/AppHeader';

const SettingsScreen = ({ navigation }) => {
    const { theme, toggleTheme, isDark } = useTheme();
    const { user, signOut } = useAuth();
    
    const [revealSurprises, setRevealSurprises] = useState(false);
    const [notifyFriend, setNotifyFriend] = useState(true);
    const [defaultPublicPosts, setDefaultPublicPosts] = useState(false);
    const [username, setUsername] = useState('');
    const [updatingUsername, setUpdatingUsername] = useState(false);

    const [notifyGiftClaims, setNotifyGiftClaims] = useState(true);
    const [notifyLikesComments, setNotifyLikesComments] = useState(true);
    const [notifyEvents, setNotifyEvents] = useState(true);
    const [notifyEmailDigest, setNotifyEmailDigest] = useState(false);
    const [privateAccount, setPrivateAccount] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (user) {
            const settings = await getUserSettings(user.id);
            if (settings) {
                setRevealSurprises(settings.reveal_surprises);
                setNotifyFriend(settings.notify_new_friend);
                if (typeof settings.default_posts_public === 'boolean') {
                    setDefaultPublicPosts(settings.default_posts_public);
                }
            }

            // Initial username from auth user metadata if available
            const metaUsername = user.user_metadata?.username || '';
            setUsername(metaUsername.replace(/^@/, ''));
        }

        const local = await getLocalSettings();
        if (local) {
            if (typeof local.notifyGiftClaims === 'boolean') setNotifyGiftClaims(local.notifyGiftClaims);
            if (typeof local.notifyLikesComments === 'boolean') setNotifyLikesComments(local.notifyLikesComments);
            if (typeof local.notifyEvents === 'boolean') setNotifyEvents(local.notifyEvents);
            if (typeof local.notifyEmailDigest === 'boolean') setNotifyEmailDigest(local.notifyEmailDigest);
            if (typeof local.privateAccount === 'boolean') setPrivateAccount(local.privateAccount);
            if (typeof local.twoFactorEnabled === 'boolean') setTwoFactorEnabled(local.twoFactorEnabled);
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

    const handleToggleDefaultPublic = async (value) => {
        setDefaultPublicPosts(value);
        await updateUserSettings(user.id, { default_posts_public: value });
    };

    const persistLocalSettings = async (overrides) => {
        const existing = await getLocalSettings();
        const next = { ...existing, ...overrides };
        await saveLocalSettings(next);
    };

    const handleToggleGiftClaims = async (value) => {
        setNotifyGiftClaims(value);
        await persistLocalSettings({ notifyGiftClaims: value });
    };

    const handleToggleLikesComments = async (value) => {
        setNotifyLikesComments(value);
        await persistLocalSettings({ notifyLikesComments: value });
    };

    const handleToggleEvents = async (value) => {
        setNotifyEvents(value);
        await persistLocalSettings({ notifyEvents: value });
    };

    const handleToggleEmailDigest = async (value) => {
        setNotifyEmailDigest(value);
        await persistLocalSettings({ notifyEmailDigest: value });
    };

    const handleTogglePrivateAccount = async (value) => {
        setPrivateAccount(value);
        await persistLocalSettings({ privateAccount: value });
    };

    const handleToggleTwoFactor = async (value) => {
        setTwoFactorEnabled(value);
        await persistLocalSettings({ twoFactorEnabled: value });
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

    const handleOpenUrl = (url) => {
        if (!url) return;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open link.');
        });
    };

    const handleContactSupport = () => {
        const email = 'support@wishmenot.app';
        const subject = encodeURIComponent('Support request');
        const body = encodeURIComponent('Describe your issue here...');
        handleOpenUrl(`mailto:${email}?subject=${subject}&body=${body}`);
    };

    const handleReportProblem = () => {
        const email = 'support@wishmenot.app';
        const subject = encodeURIComponent('Bug report');
        const body = encodeURIComponent('Describe the problem you encountered, including steps to reproduce.');
        handleOpenUrl(`mailto:${email}?subject=${subject}&body=${body}`);
    };

    const handleRateApp = () => {
        const url = 'https://wishmenot.app/rate';
        handleOpenUrl(url);
    };

    const handleShareApp = async () => {
        try {
            await Share.share({
                message: 'Check out Wish Me Not – a better way to share and manage wishlists: https://wishmenot.app',
            });
        } catch (e) {
            console.error('Share failed', e);
        }
    };

    const handleManageSubscription = () => {
        Alert.alert('Manage Subscription', 'Subscription management will be available in a future update.');
    };

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'This will clear locally cached wishlist items and friends, but will not affect your account or remote data.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await clearLocalCache();
                        Alert.alert('Cache Cleared', 'Local cache has been cleared.');
                    },
                },
            ],
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Account deletion is not yet self-serve. Please contact support to permanently remove your data.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Contact Support',
                    style: 'destructive',
                    onPress: handleContactSupport,
                },
            ],
        );
    };

    const handleChangeUsername = async () => {
        if (!user) return;

        const raw = username.trim();
        const normalized = raw.replace(/^@/, '');

        if (!normalized) {
            Alert.alert('Invalid Username', 'Please enter a username.');
            return;
        }

        const valid = /^[A-Za-z0-9_]+$/.test(normalized);
        if (!valid) {
            Alert.alert('Invalid Username', 'Usernames can only contain letters, numbers, and underscores.');
            return;
        }

        setUpdatingUsername(true);
        try {
            const available = await isUsernameAvailable(normalized, user.id);
            if (!available) {
                Alert.alert('Username Taken', 'That username is already in use. Please choose another.');
                return;
            }

            await updateUsername(user.id, normalized);

            // Update locally cached user so Profile screen picks up new username
            const existing = await getUser();
            if (existing && existing.id === user.id) {
                await saveUser({ ...existing, username: normalized });
            }

            Alert.alert('Username Updated', `Your username is now @${normalized}.`);
        } catch (error) {
            Alert.alert('Error', 'Could not update username. Please try again.');
        } finally {
            setUpdatingUsername(false);
        }
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
                        icon="globe-outline"
                        label="Make my posts public by default"
                        value={defaultPublicPosts}
                        onValueChange={handleToggleDefaultPublic}
                    />

                     <SettingItem 
                        icon="notifications-outline"
                        label="New Friend Notifications"
                        value={notifyFriend}
                        onValueChange={handleToggleNotify}
                    />

                    <SettingItem 
                        type="link"
                        icon="color-palette-outline"
                        label="Theme & Colors"
                        onPress={() => navigation.navigate('Themes')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Notifications</Text>

                    <SettingItem 
                        icon="gift"
                        label="Gift Claims"
                        value={notifyGiftClaims}
                        onValueChange={handleToggleGiftClaims}
                    />

                    <SettingItem 
                        icon="heart"
                        label="Likes & Comments"
                        value={notifyLikesComments}
                        onValueChange={handleToggleLikesComments}
                    />

                    <SettingItem 
                        icon="calendar"
                        label="Event Reminders"
                        value={notifyEvents}
                        onValueChange={handleToggleEvents}
                    />

                    <SettingItem 
                        icon="mail"
                        label="Email Notifications"
                        value={notifyEmailDigest}
                        onValueChange={handleToggleEmailDigest}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Privacy & Security</Text>

                    <SettingItem 
                        icon="lock-closed"
                        label="Private Account"
                        value={privateAccount}
                        onValueChange={handleTogglePrivateAccount}
                    />

                    <SettingItem 
                        type="link"
                        icon="shield-outline"
                        label="Block List"
                        onPress={() => Alert.alert('Block List', 'Managing blocked users will be available in a future update.')}
                    />

                    <SettingItem 
                        icon="finger-print"
                        label="Two-Factor Authentication"
                        value={twoFactorEnabled}
                        onValueChange={handleToggleTwoFactor}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Account</Text>
                    
                    {/* Username editor */}
                    <View style={styles.item}>
                        <View style={styles.itemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }] }>
                                <Ionicons name="at-outline" size={22} color={theme.colors.text} />
                            </View>
                            <Text style={[styles.itemLabel, { color: theme.colors.text }]}>Username</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                            <Text style={{ color: theme.colors.textSecondary, marginRight: 4 }}>@</Text>
                            <TextInput
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={{
                                    color: theme.colors.text,
                                    minWidth: 80,
                                    paddingVertical: 0,
                                    borderBottomWidth: StyleSheet.hairlineWidth,
                                    borderBottomColor: theme.colors.border,
                                }}
                            />
                            <TouchableOpacity onPress={handleChangeUsername} disabled={updatingUsername} style={{ marginLeft: 12 }}>
                                <Text style={{ color: theme.colors.primary }}>
                                    {updatingUsername ? 'Saving...' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <SettingItem 
                        type="link"
                        icon="key-outline"
                        label="Change Password"
                        onPress={() => navigation.navigate('UpdatePassword')}
                    />

                    <SettingItem 
                        type="link"
                        icon="mail-outline"
                        label="Email Address"
                        onPress={() => Alert.alert('Email Address', user?.email || 'Email details coming soon.')}
                    />

                    <SettingItem 
                        type="link"
                        icon="call-outline"
                        label="Phone Number"
                        onPress={() => Alert.alert('Phone Number', 'Phone number management will be available in a future update.')}
                    />

                    <SettingItem 
                        type="link"
                        icon="calendar-outline"
                        label="Birthday"
                        onPress={() => Alert.alert('Birthday', 'Birthday management will be available in a future update.')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Subscription</Text>

                    <SettingItem 
                        type="link"
                        icon="star"
                        label="Premium Plan"
                        onPress={handleManageSubscription}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Support & Legal</Text>

                    <SettingItem 
                        type="link"
                        icon="help-circle-outline"
                        label="Help Center"
                        onPress={() => handleOpenUrl('https://wishmenot.app/help')}
                    />

                    <SettingItem 
                        type="link"
                        icon="headset-outline"
                        label="Contact Support"
                        onPress={handleContactSupport}
                    />

                    <SettingItem 
                        type="link"
                        icon="document-text-outline"
                        label="Terms of Service"
                        onPress={() => navigation.navigate('UserAgreement')}
                    />

                    <SettingItem 
                        type="link"
                        icon="shield-checkmark-outline"
                        label="Privacy Policy"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    />

                    <SettingItem 
                        type="link"
                        icon="flag-outline"
                        label="Report a Problem"
                        onPress={handleReportProblem}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>About</Text>

                    <SettingItem 
                        type="link"
                        icon="information-circle-outline"
                        label="App Version"
                        onPress={() => {}}
                        value={false}
                    />

                    <SettingItem 
                        type="link"
                        icon="star-outline"
                        label="Rate Us"
                        onPress={handleRateApp}
                    />

                    <SettingItem 
                        type="link"
                        icon="share-social-outline"
                        label="Share App"
                        onPress={handleShareApp}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Danger Zone</Text>

                    <SettingItem 
                        type="link"
                        icon="trash-outline"
                        label="Clear Cache"
                        onPress={handleClearCache}
                    />

                    <SettingItem 
                        type="link"
                        icon="person-remove-outline"
                        label="Delete Account"
                        onPress={handleDeleteAccount}
                    />

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
