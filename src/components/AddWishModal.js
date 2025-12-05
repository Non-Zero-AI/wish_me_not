import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform, Image, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useModal } from '../context/ModalContext';
import { addProduct, addManualProduct } from '../services/api';
import { addItem } from '../services/storage';

const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}: ${message}`);
    } else {
        Alert.alert(title, message);
    }
};

const AddWishModal = ({ visible, onClose, user, onAdded }) => {
    const { theme } = useTheme();
    const { bumpPostsVersion } = useModal();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    
    const [url, setUrl] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualPrice, setManualPrice] = useState('');
    const [manualImage, setManualImage] = useState(null);
    const [adding, setAdding] = useState(false);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const imageUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setManualImage(imageUri);
        }
    };

    const resetForm = () => {
        setManualName(''); 
        setManualPrice(''); 
        setManualImage(null);
        setUrl('');
        setAdding(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleAddItem = async () => {
        // Safety: require at least some input
        if (!url && !manualName && !manualPrice && !manualImage) return;

        setAdding(true);
        try {
            if (!user) {
                showAlert('Error', 'User not found.');
                return;
            }

            let productData;

            if (url) {
                // Primary path: queue product info fetch via webhook while posting the wish immediately
                try {
                    productData = await addProduct(url, user, manualName);
                } catch (err) {
                    console.error('addProduct (webhook) failed, using local fallback item:', err);
                    // Local-only fallback item so the wish still appears for the user
                    productData = {
                        id: Date.now(),
                        name: manualName || 'Unknown Item',
                        price: 'Unavailable',
                        image: null,
                        link: url,
                        created_at: new Date().toISOString(),
                    };
                }
            } else {
                // Fallback: manual item with no URL
                productData = await addManualProduct(
                    {
                        name: manualName || 'New Item',
                        price: manualPrice || '0',
                        image: manualImage,
                        link: '',
                    },
                    user
                );
            }

            const newItem = await addItem(productData);
            if (onAdded) onAdded(newItem);
            if (bumpPostsVersion) bumpPostsVersion();
            handleClose();
        } catch (error) {
            console.error('Error adding wish (outer):', error);
            showAlert('Error', 'Failed to add wish. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            presentationStyle="pageSheet"
            visible={visible}
            onRequestClose={handleClose}
        >
            <SafeAreaView
                style={{
                    flex: 1,
                    backgroundColor: isDesktop ? 'rgba(0,0,0,0.6)' : '#12151d',
                    justifyContent: isDesktop ? 'center' : 'flex-start',
                    alignItems: isDesktop ? 'center' : 'stretch',
                }}
            >
                <View style={[
                    styles.desktopCard,
                    !isDesktop && { flex: 1, borderRadius: 0, width: '100%' },
                    { backgroundColor: '#12151d' }
                ]}>
                <View style={styles.composerHeader}>
                    <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 16, color: theme.colors.text }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.postButton, { backgroundColor: theme.colors.primary, opacity: (!manualName && !url) ? 0.5 : 1 }]}
                        onPress={handleAddItem}
                        disabled={(!manualName && !url) || adding}
                    >
                         {adding ? (
                            <ActivityIndicator size="small" color="#fff" />
                         ) : (
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Wish</Text>
                         )}
                    </TouchableOpacity>
                </View>
                
                <View style={styles.composerContent}>
                     <View style={{ marginRight: 12 }}>
                        <View style={[styles.composerAvatar, { backgroundColor: theme.colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 16 }}>{user?.firstName?.charAt(0) || '?'}</Text>
                        </View>
                     </View>
                     
                     <View style={{ flex: 1 }}>
                        <TextInput
                            placeholder="What are you wishing for? (optional message)"
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            maxLength={180}
                            style={[
                                styles.composerInput, 
                                { color: theme.colors.text },
                                Platform.OS === 'web' && { outlineStyle: 'none' }
                            ]}
                            value={manualName}
                            onChangeText={setManualName}
                            autoFocus
                        />
                        
                        {/* Link Input Area */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#262a34' }}>
                            <Ionicons name="link-outline" size={20} color={theme.colors.primary} />
                            <TextInput 
                                placeholder="Add a product link (optional)"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={url}
                                onChangeText={setUrl}
                                style={[
                                    { flex: 1, marginLeft: 8, color: theme.colors.primary, fontSize: 16 },
                                    Platform.OS === 'web' && { outlineStyle: 'none' }
                                ]}
                                autoCapitalize="none"
                            />
                        </View>
                        
                        {/* Image Preview */}
                        {manualImage && (
                            <View style={{ marginTop: 12, position: 'relative' }}>
                                <Image source={{ uri: manualImage }} style={styles.composerImagePreview} />
                                <TouchableOpacity 
                                    style={styles.removeImageButton}
                                    onPress={() => setManualImage(null)}
                                >
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                     </View>
                </View>
                
                {/* Toolbar */}
                <View style={[styles.composerToolbar, { borderTopColor: '#262a34' }]}>
                    <TouchableOpacity onPress={handlePickImage}>
                        <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 24 }}>
                        <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    composerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#262a34',
    },
    postButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    composerContent: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
    },
    composerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    composerInput: {
        fontSize: 18,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    composerImagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 4,
        borderRadius: 12,
    },
    composerToolbar: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    desktopCard: {
        width: '100%',
        maxWidth: 600,
        borderRadius: 16,
        overflow: 'hidden',
    },
});

export default AddWishModal;
