import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { getUserWishlist, claimGift } from '../services/api';
import { getFriends, getUser } from '../services/storage';
import SwipeableRow from '../components/SwipeableRow';
import AppHeader from '../components/AppHeader';
import ProductCard from '../components/ProductCard';

const HomeScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const userData = await getUser();
            setUser(userData);
            if (userData) {
                loadFeed(userData);
            }
        } catch (e) {
            console.error("Error loading home data", e);
        }
    };

    const loadFeed = async (currentUser) => {
        if (loading) return;
        setLoading(true);
        try {
            const friends = await getFriends();
            if (!friends || friends.length === 0) {
                setFeedItems([]);
                setLoading(false);
                return;
            }

            let allItems = [];
            const promises = friends.map(async (friend) => {
                try {
                    const items = await getUserWishlist(friend.email);
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
            
            // Sort by newest (assuming higher ID is newer or just random/shuffled for feed)
            // Let's sort by reverse order of addition if possible, but IDs might not be time-based.
            allItems.sort((a, b) => b.id - a.id);

            setFeedItems(allItems);
        } catch (e) {
            console.error("Error loading feed", e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadData();
        setRefreshing(false);
    };

    const executeClaim = async (item) => {
        try {
            const recipient = {
                name: item.friendName,
                email: item.friendEmail,
                id: item.friendId
            };
            
            await claimGift(item, user, recipient);
            
            setFeedItems(prevItems => 
                prevItems.map(i => 
                    i.id === item.id && i.friendEmail === item.friendEmail 
                        ? { ...i, wishedBy: user.firstName || 'You', isClaimed: true } 
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

        if (item.wishedBy || item.isClaimed) {
            Alert.alert("Already Wished", `This item has already been claimed by ${item.wishedBy || item.claimedBy || 'someone'}.`);
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

    const renderRightActions = (progress, dragX, item) => {
        if (item.wishedBy || item.isClaimed) return null;
        
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
            <SwipeableRow renderRightActions={(p, d) => renderRightActions(p, d, item)}>
                <ProductCard 
                    item={item} 
                    shouldShowWished={true} 
                    onWish={Platform.OS === 'web' ? () => handleWishItem(item) : undefined}
                />
            </SwipeableRow>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title="Home" 
                leftAction={null}
                rightAction={
                     <TouchableOpacity onPress={onRefresh} style={styles.menuButton}>
                         <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />
            
            <FlatList
                style={{ flex: 1 }}
                data={feedItems}
                renderItem={renderFeedItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No recent activity.</Text>
                            <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
                                Add friends to see their wishes here!
                            </Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    menuButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarTextSmall: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    feedFriendName: {
        fontSize: 16,
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
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
    },
});

export default HomeScreen;
