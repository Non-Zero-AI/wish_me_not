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
import { addProduct, deleteProduct, getUserWishlist, addManualProduct, updateUserProfile } from '../services/api';

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
            setShowLocalSurprises(userData.showSurprises || false);
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
        }
    };

    const handleShare = async () => {
        try {
            if (!user) return;
            const deepLink = `https://wish-me-not.vercel.app/wishlist/${encodeURIComponent(user.email)}`;
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
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.profileInfoContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('Themes')} style={styles.avatarContainer}> 
                     {/* Navigate to Themes or Edit Profile on press? Maybe Edit Profile in Drawer. */}
                     {user?.image ? (
                        <Image source={{ uri: user.image }} style={[styles.avatar, { borderColor: theme.colors.border }]} />
                     ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                            <Text style={[styles.avatarText, { color: theme.colors.textInverse }]}>
                                {user?.firstName?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                     )}
                </TouchableOpacity>
                
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.colors.text }]}>{items.length}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Wishes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.colors.text }]}>{friendsCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Friends</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.bioContainer}>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                    {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
                </Text>
                <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderWidth: 1 }]}
                    onPress={toggleSurprises}
                >
                    <Ionicons name={showLocalSurprises ? "eye-off" : "eye"} size={20} color={theme.colors.text} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                        {showLocalSurprises ? 'Hide Claims' : 'Reveal Claims'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderWidth: 1 }]}
                    onPress={handleShare}
                >
                    <Ionicons name="share-outline" size={20} color={theme.colors.text} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Share List</Text>
                </TouchableOpacity>
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
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Item</Text>
                        
                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tab, entryMode === 'link' && styles.activeTab]} 
                                onPress={() => setEntryMode('link')}
                            >
                                <Text style={[styles.tabText, entryMode === 'link' && styles.activeTabText]}>Link</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, entryMode === 'manual' && styles.activeTab]} 
                                onPress={() => setEntryMode('manual')}
                            >
                                <Text style={[styles.tabText, entryMode === 'manual' && styles.activeTabText]}>Manual</Text>
                            </TouchableOpacity>
                        </View>

                        {entryMode === 'link' ? (
                            <>
                                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>Paste a product URL below</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                                    placeholder="https://example.com/product"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={url}
                                    onChangeText={setUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </>
                        ) : (
                            <>
                                <TouchableOpacity onPress={handlePickImage} style={styles.imagePreview}>
                                    {manualImage ? (
                                        <Image source={{ uri: manualImage }} style={styles.previewImage} resizeMode="cover" />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="camera-outline" size={32} color={theme.colors.textSecondary} />
                                            <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>Add Image</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 12 }]}
                                    placeholder="Item Name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={manualName}
                                    onChangeText={setManualName}
                                />
                                
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                                    placeholder="Price"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={manualPrice}
                                    onChangeText={setManualPrice}
                                    keyboardType="decimal-pad"
                                />
                            </>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.background }]}
                                onPress={() => setModalVisible(false)}
                                disabled={adding}
                            >
                                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.addButton, { backgroundColor: theme.colors.primary }]}
                                onPress={handleAddItem}
                                disabled={adding}
                            >
                                {adding ? (
                                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                                ) : (
                                    <Text style={[styles.addButtonText, { color: theme.colors.textInverse }]}>Add</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    menuButton: { padding: 8 },
    listContent: { paddingHorizontal: 16 },
    itemContainer: { marginBottom: 16 },
    
    profileHeader: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    avatarContainer: {
        marginRight: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 32, fontWeight: 'bold' },
    statsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
    },
    bioContainer: {
        marginBottom: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 50 },
    emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptySubtext: { fontSize: 14 },
    
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 100,
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
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
    tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 2 },
    tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
    activeTabText: { color: '#000', fontWeight: '600' },
    input: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginBottom: 24, fontSize: 16, borderWidth: 1 },
    imagePreview: { width: '100%', height: 150, borderRadius: 8, marginBottom: 16, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
    previewImage: { width: '100%', height: '100%' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    cancelButton: {},
    addButton: {},
    cancelButtonText: { fontWeight: '600', fontSize: 16 },
    addButtonText: { fontWeight: '600', fontSize: 16 },
});

export default ProfileScreen;
