import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Share, RefreshControl, Platform, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import SwipeableRow from '../components/SwipeableRow';
import ProductCard from '../components/ProductCard';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../theme/ThemeContext';
import { getItems, addItem, getUser, deleteItem, saveItems, saveUser, getFriends } from '../services/storage';
import { addProduct, deleteProduct, getUserWishlist, addManualProduct, updateUserProfile, updateUserSettings, getUserSettings } from '../services/api';

const ProfileScreen = ({ navigation, route }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Handle Add Tab Press
    React.useEffect(() => {
        if (route?.params?.openModal) {
            setModalVisible(true);
            // Clear the param so it doesn't reopen on re-renders or back nav
            navigation.setParams({ openModal: undefined });
        }
    }, [route?.params?.openModal]);

    // User & Profile State
    const [user, setUser] = useState(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [showLocalSurprises, setShowLocalSurprises] = useState(false);
    
    // Wishlist State
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Manual Entry / Add Item State
    const [modalVisible, setModalVisible] = useState(false);
    const [entryMode, setEntryMode] = useState('link');
    const [url, setUrl] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualPrice, setManualPrice] = useState('');
    const [manualImage, setManualImage] = useState(null);
    const [adding, setAdding] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const userData = await getUser();
        setUser(userData);
        if (userData) {
            // Load Settings
            const settings = await getUserSettings(userData.id);
            if (settings) {
                setShowLocalSurprises(settings.reveal_surprises);
            } else {
                setShowLocalSurprises(userData.showSurprises || false);
            }
            
            loadItems(userData.email);
            
            // Load friends count
            const friends = await getFriends();
            setFriendsCount(friends.length);
        }
    };

    const loadItems = async (email) => {
        // Local first
        const storedItems = await getItems();
        setItems(storedItems);

        // Server sync
        try {
            const serverItems = await getUserWishlist(email);
            if (Array.isArray(serverItems)) {
                setItems(serverItems);
                await saveItems(serverItems);
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadData();
        setRefreshing(false);
    };

    const toggleSurprises = async () => {
        const newValue = !showLocalSurprises;
        setShowLocalSurprises(newValue);
        if (user) {
            const updatedUser = { ...user, showSurprises: newValue };
            setUser(updatedUser);
            await saveUser(updatedUser);
            await updateUserSettings(user.id, { reveal_surprises: newValue });
        }
    };

    const handleShare = async () => {
        try {
            if (!user) return;
            const deepLink = `https://wishmenot.app/wishlist/${encodeURIComponent(user.email)}`;
            const shareMessage = `Check out my wishlist on Wish Me Not!\n\n${deepLink}`;
            await Share.share({
                message: shareMessage,
                title: 'My Wish List',
                url: deepLink,
            });
        } catch (error) {
            console.error(error);
        }
    };

    // --- Item Management ---

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

    const handleAddManual = async () => {
        if (!manualName || !manualPrice) {
             Alert.alert("Missing Info", "Please enter name and price.");
             return;
        }
        setAdding(true);
        const tempId = Date.now().toString();
        
        const tempItem = { 
            id: tempId, 
            name: manualName, 
            price: manualPrice, 
            image: manualImage, 
            loading: true,
            isManual: true
        };
        
        setItems(prevItems => [tempItem, ...prevItems]);
        setModalVisible(false);
        
        // Reset form
        setManualName(''); 
        setManualPrice(''); 
        setManualImage(null);

        try {
             const product = await addManualProduct({
                 name: manualName,
                 price: manualPrice,
                 image: manualImage
             }, user);
             
             const newItems = await addItem(product);
             setItems(newItems);
        } catch (e) {
             Alert.alert("Error", "Failed to add manual item.");
             setItems(prev => prev.filter(i => i.id !== tempId));
        } finally {
             setAdding(false);
        }
    };

    const handleAddItem = async () => {
        if (entryMode === 'manual') {
            handleAddManual();
            return;
        }

        if (!url) return;

        const tempId = Date.now().toString();
        const tempItem = { id: tempId, url, loading: true };

        setItems(prevItems => [tempItem, ...prevItems]);
        setUrl('');
        setModalVisible(false);

        try {
            if (!user) {
                Alert.alert('Error', 'User not found.');
                return;
            }

            const productData = await addProduct(url, user);
            const newItems = await addItem(productData);
            setItems(newItems);

        } catch (error) {
            Alert.alert('Error', 'Failed to fetch product details.');
            setItems(prevItems => prevItems.filter(i => i.id !== tempId));
        }
    };

    const executeDelete = async (itemId) => {
        const itemToDelete = items.find(i => i.id === itemId);
        if (!itemToDelete) return;

        setItems(prevItems => prevItems.filter(i => i.id !== itemId));
        await deleteItem(itemId);

        if (itemToDelete.link && user) {
            deleteProduct(itemToDelete.link, user.email, itemToDelete.id).catch(console.error);
        }
    };

    const handleDeleteItem = (itemId) => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this item?")) executeDelete(itemId);
        } else {
            Alert.alert(
                "Delete Item",
                "Are you sure you want to delete this item?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => executeDelete(itemId) }
                ]
            );
        }
    };

    // --- Rendering ---

    const renderHeader = () => (
        <View style={styles.profileHeaderContainer}>
            {/* Banner Image - Placeholder or dynamic if available */}
            <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1000&auto=format&fit=crop' }} 
                style={styles.bannerImage}
                resizeMode="cover"
            />
            
            <View style={styles.profileContent}>
                <View style={styles.headerTopRow}>
                    {/* Avatar - Overlapping Banner */}
                    <TouchableOpacity onPress={() => navigation.navigate('Themes')} activeOpacity={0.8}> 
                         {user?.image ? (
                            <Image source={{ uri: user.image }} style={[styles.avatar, { borderColor: theme.colors.background }]} />
                         ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary, borderColor: theme.colors.background }]}>
                                <Text style={[styles.avatarText, { color: theme.colors.textInverse }]}>
                                    {user?.firstName?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                         )}
                    </TouchableOpacity>
                    
                    {/* Action Buttons (Right Side) */}
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            style={[styles.pillButton, { borderColor: theme.colors.border }]}
                            onPress={toggleSurprises}
                        >
                            <Ionicons name={showLocalSurprises ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.pillButton, { borderColor: theme.colors.border }]}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-social-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                {/* User Info */}
                <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.name, { color: theme.colors.text }]}>
                            {user ? `${user.firstName} ${user.lastName || ''}` : 'Loading...'}
                        </Text>
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>
                        @{user?.username || user?.firstName?.toLowerCase().replace(/\s/g, '') || 'user'}
                    </Text>
                    
                    <Text style={[styles.bio, { color: theme.colors.text }]}>
                        Wishlist creator. Gift enthusiast. 🎁
                    </Text>
                    
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                            <Text style={[styles.statCount, { color: theme.colors.text }]}>{friendsCount}</Text> Friends
                        </Text>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                            <Text style={[styles.statCount, { color: theme.colors.text }]}>{items.length}</Text> Wishes
                        </Text>
                    </View>
                </View>

                {/* Tabs (Visual Only) */}
                <View style={[styles.tabRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={[styles.activeTab, { borderBottomColor: theme.colors.primary }]}>
                        <Text style={[styles.activeTabText, { color: theme.colors.text }]}>Wishes</Text>
                    </View>
                    <View style={styles.inactiveTab}>
                        <Text style={[styles.inactiveTabText, { color: theme.colors.textSecondary }]}>Claimed</Text>
                    </View>
                    <View style={styles.inactiveTab}>
                        <Text style={[styles.inactiveTabText, { color: theme.colors.textSecondary }]}>Likes</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderRightActions = (progress, dragX, item) => (
        <TouchableOpacity
            style={styles.deleteActionContainer}
            onPress={() => handleDeleteItem(item.id)}
        >
            <View style={[styles.deleteAction, { backgroundColor: theme.colors.error }]}>
                <Ionicons name="trash" size={24} color="#fff" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title="Profile" 
                leftAction={
                    <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.menuButton}>
                         <Ionicons name="home" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
                rightAction={
                    <TouchableOpacity onPress={onRefresh} style={styles.menuButton}>
                         <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                style={{ flex: 1 }}
                data={items}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                        <SwipeableRow renderRightActions={(p, d) => renderRightActions(p, d, item)}>
                            <ProductCard 
                                item={item} 
                                user={user}
                                shouldShowWished={showLocalSurprises}
                            />
                        </SwipeableRow>
                    </View>
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.text }]}>Your wish list is empty.</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Tap + to start adding wishes!</Text>
                    </View>
                }
            />

            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]} 
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={32} color={theme.colors.textInverse} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                presentationStyle="pageSheet"
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={styles.composerHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 8 }}>
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
                             {user?.image ? (
                                <Image source={{ uri: user.image }} style={styles.composerAvatar} />
                             ) : (
                                <View style={[styles.composerAvatar, { backgroundColor: theme.colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ color: theme.colors.textInverse, fontWeight: 'bold', fontSize: 16 }}>{user?.firstName?.charAt(0)}</Text>
                                </View>
                             )}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    menuButton: { padding: 8 },
    listContent: { paddingHorizontal: 0 },
    itemContainer: { marginHorizontal: 16, marginBottom: 16 },
    
    // Profile Header
    profileHeaderContainer: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 0
    },
    bannerImage: {
        width: '100%',
        height: 120,
    },
    profileContent: {
        paddingHorizontal: 16,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: -40,
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 32, fontWeight: 'bold' },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 0,
    },
    pillButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        marginBottom: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 2,
    },
    handle: {
        fontSize: 15,
    },
    bio: {
        fontSize: 15,
        marginVertical: 12,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statText: {
        fontSize: 15,
    },
    statCount: {
        fontWeight: 'bold',
    },
    tabRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    activeTab: {
        paddingVertical: 12,
        borderBottomWidth: 3,
        marginRight: 24,
    },
    inactiveTab: {
        paddingVertical: 12,
        marginRight: 24,
    },
    activeTabText: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    inactiveTabText: {
        fontWeight: '600',
        fontSize: 15,
    },

    // Composer
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
    
    deleteActionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    deleteAction: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 50 },
    emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptySubtext: { fontSize: 14 },
    
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
});

export default ProfileScreen;
