import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, SafeAreaView, ActivityIndicator, Switch, ScrollView, Platform, RefreshControl } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { getUser, saveUser } from '../services/storage';
import { updateUserProfile, fetchUserInfo } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

const ProfileScreen = ({ navigation }) => {
    const { theme, isDark, toggleTheme } = useTheme();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const user = await getUser();
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setEmail(user.email || '');
            setImage(user.image || null);
        }
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (email) {
            try {
                const userData = await fetchUserInfo(email);
                if (userData) {
                    const updatedUser = { ...userData, email }; // Ensure email is preserved
                    await saveUser(updatedUser);
                    setFirstName(updatedUser.firstName || '');
                    setLastName(updatedUser.lastName || '');
                    setImage(updatedUser.image || null);
                }
            } catch (e) {
                console.error('Profile refresh failed', e);
            }
        }
        setRefreshing(false);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true, // Request base64
        });

        if (!result.canceled) {
            if (Platform.OS !== 'web') {
                Haptics.selectionAsync();
            }
            
            const asset = result.assets[0];
            let imageUri = asset.uri;

            if (Platform.OS === 'web' && asset.base64) {
                // Use base64 for web persistence
                imageUri = `data:image/jpeg;base64,${asset.base64}`;
            }
            
            setImage(imageUri);

            // Immediate Background Upload
            if (email) {
                console.log('Uploading profile image for:', email);
                updateUserProfile({ firstName, lastName, email }, imageUri)
                    .then(res => {
                        console.log('Upload success:', res);
                        // If webhook returns a public URL, use it
                        // Assuming structure: { output: { profile_image_url: '...' } } or { profile_image_url: '...' }
                        const remoteUrl = res?.output?.profile_image_url || res?.profile_image_url;
                        if (remoteUrl) {
                            setImage(remoteUrl);
                            // Also save user with new URL immediately to be safe
                            saveUser({ firstName, lastName, email, image: remoteUrl });
                        }
                    })
                    .catch(err => {
                        console.warn('Background upload failed', err);
                    });
            }
        }
    };

    const handleSave = async () => {
        if (Platform.OS !== 'web') {
             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        if (!firstName || !lastName || !email) {
            if (Platform.OS === 'web') {
                window.alert('Please fill in all fields.');
            } else {
                Alert.alert('Error', 'Please fill in all fields.');
            }
            return;
        }

        setSaving(true);
        const user = { firstName, lastName, email, image };
        await saveUser(user);
        
        // Sync with Server
        try {
            await updateUserProfile(user, image);
        } catch (e) {
            console.error('Failed to sync profile with server', e);
        }

        setSaving(false);
        
        if (Platform.OS === 'web') {
            window.alert('Profile updated!');
        } else {
            Alert.alert('Success', 'Profile updated!');
        }
    };

    const handleAppRefresh = () => {
        if (Platform.OS === 'web') {
            window.location.reload();
        } else {
            Alert.alert('Info', 'This feature is only for the web version to clear cache.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Profile" />
            <ScrollView 
                contentContainerStyle={styles.content}
                alwaysBounceVertical={true}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                    {image ? (
                        <Image source={{ uri: image }} style={[styles.profileImage, { borderColor: theme.colors.border, borderWidth: 2 }]} />
                    ) : (
                        <View style={[styles.placeholderImage, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 2 }]}>
                            <Ionicons name="camera" size={40} color={theme.colors.textSecondary} />
                        </View>
                    )}
                    <View style={[styles.editIcon, { backgroundColor: theme.colors.secondary, borderColor: theme.colors.background }]}>
                        <Ionicons name="pencil" size={16} color={theme.colors.textInverse} />
                    </View>
                </TouchableOpacity>

                <View style={styles.form}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>First Name</Text>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border
                        }]}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholderTextColor={theme.colors.textSecondary}
                    />

                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last Name</Text>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border
                        }]}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholderTextColor={theme.colors.textSecondary}
                    />

                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email</Text>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border
                        }]}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={theme.colors.textSecondary}
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={theme.colors.textInverse} />
                        ) : (
                            <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
                    <View style={styles.row}>
                        <Text style={[styles.rowText, { color: theme.colors.text }]}>Dark Mode</Text>
                        <Switch
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={isDark ? theme.colors.secondary : '#f4f3f4'}
                            onValueChange={toggleTheme}
                            value={isDark}
                        />
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Themes')} style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: theme.colors.text }]}>Choose Theme</Text>
                        <Ionicons name="color-palette" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
                    <TouchableOpacity onPress={handleAppRefresh} style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: theme.colors.primary }]}>Force App Refresh</Text>
                        <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: theme.colors.secondary }]}>Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('UserAgreement')} style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: theme.colors.secondary }]}>User Agreement</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                
                <View style={{ height: 40 }} /> 
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    imageContainer: {
        marginBottom: 32,
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    form: {
        width: '100%',
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 20,
        fontSize: 16,
        borderWidth: 1,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    section: {
        width: '100%',
        borderTopWidth: 1,
        paddingTop: 24,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    rowText: {
        fontSize: 16,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default ProfileScreen;
