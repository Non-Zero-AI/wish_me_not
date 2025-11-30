import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { getUserWishlist, getUserFriends, deleteFriend, claimGift } from '../services/api';
import { getFriends, saveFriends, getUser } from '../services/storage';
import AppHeader from '../components/AppHeader';
import ProductCard from '../components/ProductCard';

const FriendsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [friends, setFriends] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newFriendEmail, setNewFriendEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'feed'
    const [feedItems, setFeedItems] = useState([]);
    const [loadingFeed, setLoadingFeed] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                // Only show loading on first load or if explicitly needed
                // setLoading(true); 
                const userData = await getUser();
                setUser(userData);
                if (userData) {
                    await loadFriends(userData.email);
                }
                // setLoading(false);
            };
            init();
        }, [])
    );

    // Trigger feed load when switching to feed mode or when friends update
    useEffect(() => {
        if (viewMode === 'feed' && friends.length > 0) {
            loadFeed();
        }
    }, [viewMode, friends]);

    const loadFeed = async () => {
        setLoadingFeed(true);
        try {
            let allItems = [];
            // Fetch wishlists for all friends in parallel
            const promises = friends.map(async (friend) => {
                try {
                    const items = await getUserWishlist(friend.email);
                    // Attach friend info to each item
                    return items.map(item => ({
                        ...item,
                        friendName: friend.name,
                        friendEmail: friend.email,
                        friendId: friend.id,
                        friendImage: friend.image
                    }));
                } catch (e) {
                    console.warn(`Failed to load wishlist for ${friend.email}`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            results.forEach(items => allItems.push(...items));
            
            // Sort by something? Maybe random or name for now.
            // Let's shuffle for "Feed" feel or just list them.
            // sorting by reversed ID might give "newest" if IDs are timestamps
            allItems.sort((a, b) => b.id - a.id);

            setFeedItems(allItems);
        } catch (e) {
            console.error("Error loading feed", e);
        } finally {
            setLoadingFeed(false);
        }
    };

    const loadFriends = async (email) => {
        // 1. Load Local FIRST for speed (prevents "No friends" flash)
        const storedFriends = await getFriends();
        if (storedFriends.length > 0) {
            setFriends(storedFriends);
        }

        // 2. Then try Server for updates
        try {
            const serverFriends = await getUserFriends(email);
            if (serverFriends && serverFriends.length > 0) {
                // Deep compare to avoid re-renders if data hasn't changed
                // This prevents image flashing
                const hasChanged = JSON.stringify(serverFriends) !== JSON.stringify(friends);
                
                if (hasChanged || friends.length === 0) {
                    setFriends(serverFriends);
                    await saveFriends(serverFriends); // Cache
                }
            }
        } catch (e) {
            console.error('Server fetch failed, keeping local', e);
        }
    };

    const handleAddFriend = async () => {
        if (!newFriendEmail.trim()) {
            Alert.alert('Error', 'Please enter an email address');
            return;
        }

        setLoading(true);
        try {
            const wishlist = await getUserWishlist(newFriendEmail.trim());
            
            if (wishlist && wishlist.length > 0) {
                // Try to find a name from the items
                const friendName = wishlist[0].userName || 'Unknown Friend';
                
                const newFriend = {
                    id: Date.now().toString(),
                    name: friendName,
                    email: newFriendEmail.trim()
                };

                // Check if already exists
                if (friends.some(f => f.email.toLowerCase() === newFriend.email.toLowerCase())) {
                    Alert.alert('Info', 'Friend already in your list');
                } else {
                    const updatedFriends = [...friends, newFriend];
                    setFriends(updatedFriends);
                    await saveFriends(updatedFriends);
                    setNewFriendEmail('');
                    setModalVisible(false);
                    // Note: We don't have an API to add friend to server yet, so this is local-only for now.
                }
            } else {
                Alert.alert('Not Found', 'No wishlist found for this email. They might not have added any items yet.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to look up friend. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFriend = (friendId) => {
        Alert.alert(
            "Remove Friend",
            "Are you sure you want to remove this friend?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistic update
                        const updatedFriends = friends.filter(f => f.id !== friendId);
                        setFriends(updatedFriends);
                        
                        // Call server
                        const friendToDelete = friends.find(f => f.id === friendId);
                        if (user && friendToDelete) {
                             deleteFriend(user.email, friendToDelete.email).catch(e => console.error('Delete friend failed', e));
                        }
                        
                        await saveFriends(updatedFriends);
                    }
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            let currentUser = user;
            if (!currentUser) {
                currentUser = await getUser();
                setUser(currentUser);
            }
            
            if (currentUser) {
                await loadFriends(currentUser.email);
                if (viewMode === 'feed') {
                    await loadFeed();
                }
            }
        } catch (error) {
            console.error("Refresh failed:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const switchMode = (mode) => {
        if (mode !== viewMode) {
            Haptics.selectionAsync();
            setViewMode(mode);
        }
    };

    const executeClaim = async (item) => {
        try {
            const recipient = {
                name: item.friendName,
                email: item.friendEmail,
                id: item.friendId
            };
            
            await claimGift(item, user, recipient);
            
            // Update Feed UI locally
            setFeedItems(prevItems => 
                prevItems.map(i => 
                    // Match by ID and friend email to be specific
                    i.id === item.id && i.friendEmail === item.friendEmail 
                        ? { ...i, wishedBy: user.firstName || 'You' } 
                        : i
                )
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Claim error", error);
            Alert.alert('Error', 'Failed to claim gift. Please try again.');
        }
    };

    const handleWishItem = (item) => {
        if (!user) return;

        if (item.wishedBy) {
            Alert.alert("Already Wished", `This item has already been claimed by ${item.wishedBy}.`);
            return;
        }

        const message = `Mark ${item.name} as wished for ${item.friendName}? This claims the gift!`;

        if (Platform.OS === 'web') {
            if (window.confirm(message)) {
                executeClaim(item);
            }
        } else {
            Alert.alert(
                "Wish Item",
                message,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Confirm",
                        onPress: () => executeClaim(item)
                    }
                ]
            );
        }
    };

    const renderFriend = ({ item }) => (
        <Swipeable
            renderRightActions={() => (
                <TouchableOpacity
                    style={[styles.deleteAction, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleDeleteFriend(item.id)}
                >
                    <Text style={styles.actionText}>Remove</Text>
                </TouchableOpacity>
            )}
        >
            <TouchableOpacity
                style={[styles.friendCard, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.navigate('FriendWishlist', { friend: item })}
            >
                <View style={[styles.avatar, { backgroundColor: theme.colors.secondary, overflow: 'hidden' }]}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.avatarImage} />
                    ) : (
                        <Text style={[styles.avatarText, { color: theme.colors.textInverse }]}>{item.name.charAt(0).toUpperCase()}</Text>
                    )}
                </View>
                <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.friendEmail, { color: theme.colors.textSecondary }]}>
                        {item.email}
                        {item.itemCount !== undefined && ` • ${item.itemCount} Items`}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </Swipeable>
    );

    const renderFeedRightActions = (progress, dragX, item) => {
        if (item.wishedBy) return null;
        
        return (
            <TouchableOpacity
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 80,
                    height: '100%',
                }}
                onPress={() => handleWishItem(item)}
            >
                <View style={{ 
                    backgroundColor: theme.colors.success || '#4CAF50', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    width: 60, 
                    height: 60, 
                    borderRadius: 30 
                }}>
                    <Ionicons name="gift" size={24} color="#fff" />
                </View>
            </TouchableOpacity>
        );
    };

    const renderFeedItem = ({ item }) => (
        <View style={styles.feedItemContainer}>
            <View style={styles.feedHeader}>
                <View style={[styles.avatarSmall, { backgroundColor: theme.colors.secondary, overflow: 'hidden' }]}>
                     {item.friendImage ? (
                        <Image source={{ uri: item.friendImage }} style={styles.avatarImage} />
                    ) : (
                        <Text style={[styles.avatarTextSmall, { color: theme.colors.textInverse }]}>
                            {item.friendName?.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View>
                    <Text style={[styles.feedFriendName, { color: theme.colors.text }]}>{item.friendName}</Text>
                    <Text style={[styles.feedTimestamp, { color: theme.colors.textSecondary }]}>Added an item</Text>
                </View>
            </View>
            <Swipeable renderRightActions={(p, d) => renderFeedRightActions(p, d, item)}>
                <ProductCard 
                    item={item} 
                    shouldShowWished={true} 
                />
            </Swipeable>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title="Friends" 
                rightAction={
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={onRefresh} style={styles.addButton}>
                            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                            <Ionicons name="person-add" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                }
            />
            
            <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity 
                    style={[styles.tabButton, viewMode === 'list' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
                    onPress={() => switchMode('list')}
                >
                    <Text style={[styles.tabText, { color: viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary }]}>My Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, viewMode === 'feed' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
                    onPress={() => switchMode('feed')}
                >
                    <Text style={[styles.tabText, { color: viewMode === 'feed' ? theme.colors.primary : theme.colors.textSecondary }]}>Feed</Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'list' ? (
                <FlatList
                    style={{ flex: 1 }}
                    data={friends}
                    renderItem={renderFriend}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No friends yet.</Text>
                            {user && <Text style={{color: theme.colors.textSecondary, fontSize: 12, marginTop: 4}}>Logged in as: {user.email}</Text>}
                            <TouchableOpacity onPress={onRefresh} style={{marginTop: 20, padding: 10, backgroundColor: theme.colors.surface, borderRadius: 8}}>
                                <Text style={{color: theme.colors.primary}}>Tap to Retry</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={feedItems}
                    renderItem={renderFeedItem}
                    keyExtractor={(item, index) => item.id + index} // Unique key
                    contentContainerStyle={styles.listContent}
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
                    ListHeaderComponent={
                        loadingFeed ? (
                             <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                        ) : null
                    }
                    ListEmptyComponent={
                        !loadingFeed && (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No items to show.</Text>
                            </View>
                        )
                    }
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Friend</Text>
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.background, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border 
                            }]}
                            placeholder="Friend's Email"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newFriendEmail}
                            onChangeText={setNewFriendEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.background }]}
                                onPress={() => setModalVisible(false)}
                                disabled={loading}
                            >
                                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                                onPress={handleAddFriend}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                                ) : (
                                    <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>Find & Add</Text>
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
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    addButton: {
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        paddingBottom: 120,
        flexGrow: 1,
    },
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    friendEmail: {
        fontSize: 14,
    },
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: '100%',
        borderRadius: 12,
        marginBottom: 12, // Match friendCard margin
    },
    actionText: {
        color: '#fff',
        fontWeight: '600',
        padding: 20,
    },
    feedItemContainer: {
        marginBottom: 24,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    avatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarTextSmall: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    feedFriendName: {
        fontSize: 14,
        fontWeight: '600',
    },
    feedTimestamp: {
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
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
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 24,
        fontSize: 16,
        borderWidth: 1,
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
    cancelButton: {
    },
    saveButton: {
    },
    cancelButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    saveButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
});

export default FriendsScreen;
