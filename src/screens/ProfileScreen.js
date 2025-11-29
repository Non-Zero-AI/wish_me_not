import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, SafeAreaView, ActivityIndicator, Switch, ScrollView, Platform, RefreshControl, Modal, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { getUser, saveUser } from '../services/storage';
import { updateUserProfile, fetchUserInfo, sendFeedback } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

const ProfileScreen = ({ navigation }) => {
    const { theme, isDark, toggleTheme } = useTheme();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState(null);
    const [showSurprises, setShowSurprises] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Feedback State
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [sendingFeedback, setSendingFeedback] = useState(false);

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
            setShowSurprises(user.showSurprises || false);
        }
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        try {
            if (email) {
                const userData = await fetchUserInfo(email);
                if (userData) {
                    // Preserve local preferences like showSurprises
                    const user = await getUser();
                    const updatedUser = { 
                        ...userData, 
                        email,
                        showSurprises: user?.showSurprises || false 
                    }; 
                    await saveUser(updatedUser);
                    setFirstName(updatedUser.firstName || '');
                    setLastName(updatedUser.lastName || '');
                    setImage(updatedUser.image || null);
                }
            }
        } catch (e) {
            console.error('Profile refresh failed', e);
        } finally {
            setRefreshing(false);
        }
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

    const handleToggleSurprises = (value) => {
        if (value) {
            // Trying to enable
            if (Platform.OS === 'web') {
                if (window.confirm("Spoiler Alert! 🫣\n\nAre you sure? This will reveal which friends have claimed your gifts. It might ruin the surprise!")) {
                    setShowSurprises(true);
                    // Save immediately
                    saveUserPreference(true);
                }
            } else {
                Alert.alert(
                    "Spoiler Alert! 🫣",
                    "Are you sure? This will reveal which friends have claimed your gifts. It might ruin the surprise!",
                    [
                        { text: "Keep it a Secret", style: "cancel" },
                        { 
                            text: "Reveal All", 
                            style: "destructive",
                            onPress: () => {
                                setShowSurprises(true);
                                saveUserPreference(true);
                            }
                        }
                    ]
                );
            }
        } else {
            setShowSurprises(false);
            saveUserPreference(false);
        }
    };

    const saveUserPreference = async (surprisesValue) => {
         const user = await getUser();
         if (user) {
             await saveUser({ ...user, showSurprises: surprisesValue });
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
        const user = { firstName, lastName, email, image, showSurprises };
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

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) return;
        
        setSendingFeedback(true);
        try {
            await sendFeedback(email, feedbackText);
            setFeedbackVisible(false);
            setFeedbackText('');
            if (Platform.OS === 'web') {
                window.alert('Thank You\n\nYour feedback has been sent!');
            } else {
                Alert.alert('Thank You', 'Your feedback has been sent!');
            }
        } catch (error) {
             if (Platform.OS === 'web') {
                window.alert('Error\n\nFailed to send feedback. Please try again.');
            } else {
                Alert.alert('Error', 'Failed to send feedback. Please try again.');
            }
        } finally {
            setSendingFeedback(false);
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
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                alwaysBounceVertical={true}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                        title="Refreshing..."
                    />
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
                    
                    <View style={styles.row}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={[styles.rowText, { color: theme.colors.text }]}>Reveal Surprises 🫣</Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>See who claimed your gifts</Text>
                        </View>
                        <Switch
                            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                            thumbColor={showSurprises ? theme.colors.secondary : '#f4f3f4'}
                            onValueChange={handleToggleSurprises}
                            value={showSurprises}
                        />
                    </View>

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
                    <TouchableOpacity onPress={() => setFeedbackVisible(true)} style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: theme.colors.text }]}>Send Feedback</Text>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
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

            <Modal
                animationType="slide"
                transparent={true}
                visible={feedbackVisible}
                onRequestClose={() => setFeedbackVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Send Feedback</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                            Have an idea or found a bug? Let us know!
                        </Text>
                        
                        <TextInput
                            style={[styles.input, styles.textArea, { 
                                backgroundColor: theme.colors.background, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border 
                            }]}
                            placeholder="Type your message here..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={feedbackText}
                            onChangeText={setFeedbackText}
                            multiline
                            textAlignVertical="top"
                            autoFocus
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                                onPress={() => setFeedbackVisible(false)}
                                disabled={sendingFeedback}
                            >
                                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                                onPress={handleSendFeedback}
                                disabled={sendingFeedback}
                            >
                                {sendingFeedback ? (
                                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                                ) : (
                                    <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>Send</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    textArea: {
        height: 120,
        paddingTop: 12,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ProfileScreen;
