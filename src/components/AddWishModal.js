import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { addProduct, addManualProduct } from '../services/api';
import { addItem } from '../services/storage';

const AddWishModal = ({ visible, onClose, user, onAdded }) => {
    const { theme } = useTheme();
    
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

    const handleAddManual = async () => {
        if (!manualName && !manualPrice && !url) return; // Should be handled by disabled button but safety check
        
        // If only URL is present, treat as link add
        if (url && !manualName) {
             handleAddItem();
             return;
        }

        setAdding(true);
        try {
             const product = await addManualProduct({
                 name: manualName,
                 price: manualPrice || '0',
                 image: manualImage,
                 url: url // Optional link
             }, user);
             
             const newItem = await addItem(product);
             if (onAdded) onAdded(newItem);
             handleClose();
        } catch (e) {
             Alert.alert("Error", "Failed to add manual item.");
        } finally {
             setAdding(false);
        }
    };

    const handleAddItem = async () => {
        if (manualName) {
            handleAddManual();
            return;
        }

        if (!url) return;

        setAdding(true);
        try {
            if (!user) {
                Alert.alert('Error', 'User not found.');
                return;
            }

            const productData = await addProduct(url, user);
            const newItem = await addItem(productData);
            if (onAdded) onAdded(newItem);
            handleClose();

        } catch (error) {
            Alert.alert('Error', 'Failed to fetch product details.');
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
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
                            placeholder="What are you wishing for?"
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }}>
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
                <View style={[styles.composerToolbar, { borderTopColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={handlePickImage}>
                        <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 24 }}>
                        <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
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
        borderBottomColor: '#eee'
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
});

export default AddWishModal;
