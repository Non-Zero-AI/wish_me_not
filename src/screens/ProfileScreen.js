import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Share, RefreshControl, Platform, Image, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import SwipeableRow from '../components/SwipeableRow';
import ProductCard from '../components/ProductCard';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../theme/ThemeContext';
import { useModal } from '../context/ModalContext';
import { getItems, addItem, getUser, deleteItem, saveItems, saveUser, getFriends } from '../services/storage';
import { addProduct, deleteProduct, getUserWishlist, addManualProduct, updateUserProfile, updateUserSettings, getUserSettings } from '../services/api';

const ProfileScreen = ({ navigation, route }) => {
    const { theme } = useTheme();
    const { postsVersion, setAddModalVisible } = useModal();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    
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
    const [activeTab, setActiveTab] = useState('wishes'); // 'wishes' | 'claimed' | 'likes'
    const [isPollingUpdates, setIsPollingUpdates] = useState(false);
    
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
        }, [postsVersion])
    );

    // Ensure updates while screen is already focused
    useEffect(() => {
        loadData();
    }, [postsVersion]);

    // Automatically refresh any posts that are still waiting on webhook-enriched product data.
    useEffect(() => {
        if (!user) return;

        const hasFetchingPosts = items.some(
            (item) => item.price === 'Fetching details…' && !!item.link
        );

        if (!hasFetchingPosts || isPollingUpdates) {
            return;
        }

        let isCancelled = false;
        let attempts = 0;
        setIsPollingUpdates(true);

        const intervalId = setInterval(async () => {
            if (isCancelled) return;
            attempts += 1;

            try {
                const serverItems = await getUserWishlist(user.email);
                if (Array.isArray(serverItems) && serverItems.length > 0) {
                    // Overwrite local cache with the freshest data
                    setItems(serverItems);
                    await saveItems(serverItems);

                    const stillFetching = serverItems.some(
                        (item) => item.price === 'Fetching details…' && !!item.link
                    );

                    if (!stillFetching) {
                        clearInterval(intervalId);
                        setIsPollingUpdates(false);
                    }
                }
            } catch (err) {
                console.error('Polling sync error:', err);
            }

            // Safety: stop polling after ~1 minute (12 attempts at 5s)
            if (attempts >= 12) {
                clearInterval(intervalId);
                setIsPollingUpdates(false);
            }
        }, 5000);

        return () => {
            isCancelled = true;
            clearInterval(intervalId);
            setIsPollingUpdates(false);
        };
    }, [items, user, isPollingUpdates]);

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
            if (Array.isArray(serverItems) && serverItems.length > 0) {
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
        const start = Date.now();
        await loadData();
        const elapsed = Date.now() - start;
        if (elapsed < 500) {
            await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }
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

            if (Platform.OS === 'web') {
                try {
                    if (navigator.share) {
                        await navigator.share({ title: 'My Wish List', text: shareMessage, url: deepLink });
                        return;
                    }
                } catch (shareErr) {
                    console.warn('navigator.share failed, falling back:', shareErr);
                }

                if (navigator.clipboard?.writeText) {
                    try {
                        await navigator.clipboard.writeText(deepLink);
                        if (window?.alert) window.alert('Wishlist link copied to clipboard');
                        return;
                    } catch (clipErr) {
                        console.warn('Clipboard write failed:', clipErr);
                    }
                }

                if (window?.prompt) {
                    window.prompt('Copy this link:', deepLink);
                    return;
                }

                // Last resort: open wishlist URL in a new tab/window
                if (window?.open) {
                    window.open(deepLink, '_blank');
                }
            } else {
                await Share.share({
                    message: shareMessage,
                    title: 'My Wish List',
                    url: deepLink,
                });
            }
        } catch (error) {
            console.error('Share error:', error);
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
            // On web, delete immediately when the user chooses Delete Post in the overflow
            executeDelete(itemId);
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

    const renderHeader = () => {
        const claimedCount = items.filter((i) => i.isClaimed ?? i.is_claimed).length;

        return (
            <View style={styles.profileHeaderContainer}>
                {/* Avatar + Name */}
                <View style={styles.profileTopSection}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarOuterRing}>
                            <View style={styles.avatarInnerRing}>
                                <Text style={styles.avatarInitial}>
                                    {user?.firstName?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.avatarBadge}>
                            <View style={styles.avatarBadgeInner}>
                                <Ionicons name="star" size={14} color="#ffffff" />
                            </View>
                        </View>
                    </View>

                    <Text style={styles.profileName}>
                        {user ? `${user.firstName} ${user.lastName || ''}` : 'Loading...'}
                    </Text>
                    <Text style={styles.profileHandle}>
                        @{user?.username || user?.firstName?.toLowerCase().replace(/\s/g, '') || 'user'}
                    </Text>
                    <View style={styles.memberSincePill}>
                        <Text style={styles.memberSinceText}>Member since 2024</Text>
                    </View>

                    {/* Header actions */}
                    <View style={styles.headerActionsRow}>
                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={toggleSurprises}
                        >
                            <Ionicons
                                name={showLocalSurprises ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#A8AAB5"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={handleShare}
                        >
                            <Ionicons
                                name="share-social-outline"
                                size={20}
                                color="#A8AAB5"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <View style={styles.tabsInnerRow}>
                        <TouchableOpacity
                            style={[styles.tabPill, activeTab === 'wishes' && styles.tabPillActive]}
                            onPress={() => setActiveTab('wishes')}
                        >
                            <Ionicons
                                name="heart"
                                size={16}
                                color={activeTab === 'wishes' ? '#ffffff' : '#8b8d98'}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={[
                                    styles.tabPillText,
                                    activeTab === 'wishes' && styles.tabPillTextActive,
                                ]}
                            >
                                Wishlist
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabPill, activeTab === 'claimed' && styles.tabPillActive]}
                            onPress={() => setActiveTab('claimed')}
                        >
                            <Ionicons
                                name="cube"
                                size={16}
                                color={activeTab === 'claimed' ? '#ffffff' : '#8b8d98'}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={[
                                    styles.tabPillText,
                                    activeTab === 'claimed' && styles.tabPillTextActive,
                                ]}
                            >
                                Claimed Gifts
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats cards */}
                <View style={styles.statsCardsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#4F46E5' }]}>
                            <Ionicons name="gift" size={18} color="#ffffff" />
                        </View>
                        <Text style={styles.statCardValue}>{items.length}</Text>
                        <Text style={styles.statCardLabel}>Wishes</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#10B981' }]}>
                            <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                        </View>
                        <Text style={styles.statCardValue}>{claimedCount}</Text>
                        <Text style={styles.statCardLabel}>Claimed</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#F59E0B' }]}>
                            <Ionicons name="trophy" size={18} color="#ffffff" />
                        </View>
                        <Text style={styles.statCardValue}>0</Text>
                        <Text style={styles.statCardLabel}>Achievements</Text>
                    </View>
                </View>

                {/* Achievements section (placeholder, static for now) */}
                <View style={styles.achievementsSection}>
                    <Text style={styles.achievementsTitle}>Achievements</Text>
                    <Text style={styles.achievementsSubtitle}>
                        Unlock badges as you add wishes, claim gifts, and connect with friends.
                    </Text>
                </View>
            </View>
        );
    };

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

    const filteredItems = items.filter((item) => {
        const isClaimed = item.isClaimed ?? item.is_claimed;
        if (activeTab === 'claimed') return !!isClaimed;
        if (activeTab === 'likes') return true; // placeholder until likes are persisted
        // wishes tab: items not claimed
        return !isClaimed;
    });

    if (isDesktop) {
        // On desktop/web, scroll the entire profile page (header + cards) together
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#12151d' }]}>        
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 48 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                            tintColor={theme.colors.primary}
                            colors={[theme.colors.primary]}
                        />
                    }
                >
                    {renderHeader()}
                    {filteredItems.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.text }]}>Your wish list is empty.</Text>
                            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Tap + to start adding wishes!</Text>
                        </View>
                    ) : (
                        filteredItems.map((item) => (
                            <View key={item.id} style={styles.itemContainer}>
                                <SwipeableRow renderRightActions={(p, d) => renderRightActions(p, d, item)}>
                                    <ProductCard 
                                        item={item} 
                                        user={user}
                                        shouldShowWished={showLocalSurprises}
                                        onDelete={() => handleDeleteItem(item.id)}
                                    />
                                </SwipeableRow>
                            </View>
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Mobile / non-desktop: keep FlatList for better performance
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#12151d' }]}>        
            {renderHeader()}
            <FlatList
                style={{ flex: 1 }}
                data={filteredItems}
                renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                        <SwipeableRow renderRightActions={(p, d) => renderRightActions(p, d, item)}>
                            <ProductCard 
                                item={item} 
                                user={user}
                                shouldShowWished={showLocalSurprises}
                                onDelete={() => handleDeleteItem(item.id)}
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
            {/* Bottom navigation with floating + button (mobile only) */}
            {!isDesktop && (
                <View style={styles.bottomNavContainer}>
                    <View style={styles.bottomNavInner}>
                        <TouchableOpacity
                            style={styles.bottomNavItem}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <View style={styles.bottomNavIconWrapper}>
                                <Ionicons name="home" size={20} color="#A8AAB5" />
                            </View>
                            <Text style={styles.bottomNavLabel}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.bottomNavItem}
                            onPress={() => navigation.navigate('Friends')}
                        >
                            <View style={styles.bottomNavIconWrapper}>
                                <Ionicons name="people" size={20} color="#A8AAB5" />
                            </View>
                            <Text style={styles.bottomNavLabel}>Friends</Text>
                        </TouchableOpacity>
                        <View style={{ width: 72 }} />
                        <TouchableOpacity
                            style={styles.bottomNavItem}
                            onPress={() => navigation.navigate('Messages')}
                        >
                            <View style={styles.bottomNavIconWrapper}>
                                <Ionicons name="chatbubbles" size={20} color="#A8AAB5" />
                            </View>
                            <Text style={styles.bottomNavLabel}>Messages</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.bottomNavItem}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <View style={[styles.bottomNavIconWrapper, styles.bottomNavIconActive]}>
                                <Ionicons name="person" size={20} color="#ffffff" />
                            </View>
                            <Text style={styles.bottomNavLabelActive}>Profile</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.plusButtonWrapper}>
                        <TouchableOpacity
                            style={styles.plusButton}
                            onPress={() => setAddModalVisible(true)}
                        >
                            <Ionicons name="add" size={28} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    profileTopSection: {
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarOuterRing: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#1a1d27',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0e1117',
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 0.9,
        shadowRadius: 16,
    },
    avatarInnerRing: {
        width: 104,
        height: 104,
        borderRadius: 52,
        backgroundColor: '#252835',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: '700',
        color: '#E8EAF0',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#252835',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadgeInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(99,102,241,0.5)',
        shadowOpacity: 0.8,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
    },
    profileName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#E8EAF0',
        textAlign: 'center',
        marginTop: 4,
    },
    profileHandle: {
        fontSize: 16,
        color: '#8B8D98',
        textAlign: 'center',
        marginTop: 4,
    },
    memberSincePill: {
        alignSelf: 'center',
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#1f222d',
    },
    memberSinceText: {
        fontSize: 12,
        color: '#A8AAB5',
    },
    headerActionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 12,
    },
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1f222d',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#252835',
    },
    tabsContainer: {
        marginTop: 24,
    },
    tabsInnerRow: {
        flexDirection: 'row',
        backgroundColor: '#1f222d',
        borderRadius: 20,
        padding: 4,
    },
    tabPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 16,
    },
    tabPillActive: {
        backgroundColor: '#6366F1',
    },
    tabPillText: {
        fontSize: 13,
        color: '#8b8d98',
        fontWeight: '600',
    },
    tabPillTextActive: {
        color: '#FFFFFF',
    },
    statsCardsRow: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 8,
        backgroundColor: '#1a1d27',
        alignItems: 'center',
    },
    statIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    statCardValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#E8EAF0',
        marginBottom: 2,
    },
    statCardLabel: {
        fontSize: 12,
        color: '#8B8D98',
    },
    achievementsSection: {
        marginTop: 28,
        marginBottom: 12,
    },
    achievementsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#E8EAF0',
        marginBottom: 4,
    },
    achievementsSubtitle: {
        fontSize: 13,
        color: '#A8AAB5',
    },

    // Bottom nav + floating plus
    bottomNavContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        backgroundColor: 'rgba(18,21,29,0.98)',
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
    },
    bottomNavInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 420,
        alignSelf: 'center',
        columnGap: 16,
    },
    bottomNavItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomNavIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#1f222d',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomNavIconActive: {
        backgroundColor: '#6366F1',
    },
    bottomNavLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
    },
    bottomNavLabelActive: {
        fontSize: 10,
        color: '#6366F1',
        marginTop: 4,
        fontWeight: '600',
    },
    plusButtonWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#22C55E',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(34,197,94,0.6)',
        shadowOpacity: 0.8,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
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
