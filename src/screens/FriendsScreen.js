import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { getUserWishlist, getUserFriends, deleteFriend } from '../services/api';
import { getFriends, saveFriends, getUser } from '../services/storage';
import SwipeableRow from '../components/SwipeableRow';
import { useModal } from '../context/ModalContext';

const FriendsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { setAddModalVisible } = useModal();
    const [friends, setFriends] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                const userData = await getUser();
                setUser(userData);
                if (userData) {
                    await loadFriends(userData.email);
                }
            };
            init();
        }, [])
    );

    const loadFriends = async (email) => {
        const storedFriends = await getFriends();
        if (storedFriends.length > 0) {
            setFriends(storedFriends);
        }

        try {
            const serverFriends = await getUserFriends(email);
            if (serverFriends && serverFriends.length > 0) {
                const hasChanged = JSON.stringify(serverFriends) !== JSON.stringify(friends);
                if (hasChanged || friends.length === 0) {
                    setFriends(serverFriends);
                    await saveFriends(serverFriends);
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
                const friendName = wishlist[0].userName || 'Unknown Friend';
                
                const newFriend = {
                    id: Date.now().toString(),
                    name: friendName,
                    email: newFriendEmail.trim()
                };

                if (friends.some(f => f.email.toLowerCase() === newFriend.email.toLowerCase())) {
                    Alert.alert('Info', 'Friend already in your list');
                } else {
                    const updatedFriends = [...friends, newFriend];
                    setFriends(updatedFriends);
                    await saveFriends(updatedFriends);
                    setNewFriendEmail('');
                    setModalVisible(false);
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
                        const updatedFriends = friends.filter(f => f.id !== friendId);
                        setFriends(updatedFriends);
                        
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
        if (user) {
            await loadFriends(user.email);
        }
        setRefreshing(false);
    };

    const renderFriend = ({ item }) => (
        <SwipeableRow
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
                style={styles.friendCard}
                onPress={() => navigation.navigate('FriendWishlist', { friend: item })}
            >
                <View style={styles.avatar}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                    )}
                </View>
                <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>
                        @{item.name || item.email?.split('@')[0]}
                    </Text>
                    <Text style={styles.friendEmail}>
                        {item.itemCount !== undefined ? `${item.itemCount} wishlists` : item.email}
                    </Text>
                </View>
                <View style={styles.friendMoreButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#AAB2C0" />
                </View>
            </TouchableOpacity>
        </SwipeableRow>
    );

    const filteredFriends = friends.filter((friend) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
            friend.name?.toLowerCase().includes(q) ||
            friend.email?.toLowerCase().includes(q)
        );
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#1C1E22' }]}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>Friends</Text>
                    <TouchableOpacity
                        style={styles.headerAddFriendButton}
                        onPress={() => navigation.navigate('FriendRequests')}
                    >
                        <Ionicons name="person-add" size={20} color="#60A5FA" />
                    </TouchableOpacity>
                </View>

                {/* Search bar */}
                <View style={styles.searchBarWrapper}>
                    <View style={styles.searchBarInner}>
                        <Ionicons
                            name="search"
                            size={18}
                            color="#AAB2C0"
                            style={{ marginRight: 8 }}
                        />
                        <TextInput
                            placeholder="Search friends..."
                            placeholderTextColor="#6B7280"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
            </View>

            {/* Friends list */}
            <FlatList
                style={{ flex: 1 }}
                data={filteredFriends}
                renderItem={renderFriend}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366F1"
                        colors={["#6366F1"]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            Gifting is better with friends. Add friends to see what they are wishing for.
                        </Text>
                    </View>
                }
            />

            {/* Bottom navigation with floating + button */}
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
                        <View style={[styles.bottomNavIconWrapper, styles.bottomNavIconActive]}>
                            <Ionicons name="people" size={20} color="#ffffff" />
                        </View>
                        <Text style={styles.bottomNavLabelActive}>Friends</Text>
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
                        <View style={styles.bottomNavIconWrapper}>
                            <Ionicons name="person" size={20} color="#A8AAB5" />
                        </View>
                        <Text style={styles.bottomNavLabel}>Profile</Text>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 120 },

    headerContainer: {
        paddingTop: 24,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerAddFriendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#24272C',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#15171a',
        shadowOpacity: 0.7,
        shadowRadius: 6,
        shadowOffset: { width: 3, height: 3 },
    },
    searchBarWrapper: {
        marginBottom: 4,
    },
    searchBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#24272C',
        borderWidth: 1,
        borderColor: '#2E3238',
        shadowColor: '#15171a',
        shadowOpacity: 0.7,
        shadowRadius: 8,
        shadowOffset: { width: 4, height: 4 },
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },

    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 18,
        marginBottom: 12,
        backgroundColor: '#24272C',
        borderWidth: 1,
        borderColor: '#2E3238',
        shadowColor: '#15171a',
        shadowOpacity: 0.7,
        shadowRadius: 10,
        shadowOffset: { width: 4, height: 4 },
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1F2126',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 6,
        shadowOffset: { width: 2, height: 2 },
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#E5E7EB',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    friendEmail: {
        fontSize: 13,
        color: '#AAB2C0',
    },
    friendMoreButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#24272C',
    },
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: '100%',
        borderRadius: 18,
        marginBottom: 12,
    },
    actionText: { color: '#fff', fontWeight: '600', padding: 20 },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#AAB2C0',
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
        backgroundColor: 'rgba(28,30,34,0.98)',
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
        backgroundColor: '#24272C',
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
});

export default FriendsScreen;
