import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import { getUser, addLocalFriend } from '../services/storage';
import { getUserWishlist, claimGift } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

const FriendWishlistScreen = ({ route, navigation }) => {
    const { friend, userId } = route.params || {};
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Construct a friend object if we only have userId (from deep link)
    const friendData = friend || { 
        email: userId, 
        name: userId ? userId.split('@')[0] : 'Friend', // Fallback name
        id: userId 
    };

    const [items, setItems] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!friendData.email) {
            Alert.alert("Error", "Invalid link. No user email found.");
            navigation.goBack();
            return;
        }
        loadCurrentUser();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (friendData.email) {
                loadFriendWishlist();
            }
        }, [friendData.email])
    );

    const loadCurrentUser = async () => {
        const user = await getUser();
        setCurrentUser(user);

        // Auto-add friend if logged in
        if (user && friendData.email) {
             addLocalFriend(friendData.email, friendData.name).then(added => {
                 if (added) {
                     console.log('Auto-added friend via link');
                 }
             });
        }
    };

    const loadFriendWishlist = async () => {
        try {
            if (!refreshing) setLoading(true);
            
            const wishlist = await getUserWishlist(friendData.email);
            setItems(wishlist);
        } catch (error) {
            Alert.alert('Error', 'Failed to load wishlist. Please try again.');
            console.error('Error loading friend wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadFriendWishlist();
        setRefreshing(false);
    };

    const executeClaim = async (item) => {
        try {
            // Call API to claim gift
            await claimGift(item, currentUser, friendData);
            
            // Update UI on success
            setItems(prevItems =>
                prevItems.map(i =>
                    i.id === item.id
                        ? { ...i, wishedBy: currentUser.firstName }
                        : i
                )
            );
        } catch (error) {
            console.error("Claim error:", error);
            Alert.alert('Error', 'Failed to claim gift. Please try again.');
        }
    };

    const handleWishItem = (item) => {
        if (!currentUser) return;

        if (item.wishedBy) {
            Alert.alert("Already Wished", `This item has already been claimed by ${item.wishedBy}.`);
            return;
        }

        const message = `You have marked ${item.name} as wished for ${friendData.name}. This claims the gift!`;

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
                    {Platform.OS === 'web' ? (
                         <Text style={{fontSize: 24}}>🎁</Text>
                     ) : (
                         <Ionicons name="gift" size={24} color="#fff" />
                     )}
                </View>
            </TouchableOpacity>
        );
    };

    const SwipeableWrapper = ({ children, renderRightActions }) => {
        if (Platform.OS === 'web') return children;
        return (
            <Swipeable renderRightActions={renderRightActions}>
                {children}
            </Swipeable>
        );
    };

    return (
        <View style={[
            styles.container, 
            { 
                backgroundColor: theme.colors.background,
                paddingTop: insets.top,
                paddingBottom: 0,
            }
        ]}>
            <AppHeader 
                title={`${friendData.name}'s Wish List`}
                subTitle={Platform.OS === 'web' ? "Tap gift to claim" : "Swipe right to claim a gift"}
                showBack
                rightAction={
                    <TouchableOpacity onPress={onRefresh} style={{ padding: 8 }}>
                        <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading wishlist...</Text>
                </View>
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={items}
                    renderItem={({ item }) => (
                        <View style={{ marginBottom: 16 }}>
                            <SwipeableWrapper renderRightActions={(p, d) => renderRightActions(p, d, item)}>
                                <ProductCard 
                                    item={item} 
                                    shouldShowWished={true}
                                    onWish={Platform.OS === 'web' ? () => handleWishItem(item) : undefined}
                                />
                            </SwipeableWrapper>
                        </View>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: (Platform.OS === 'web' ? 200 : 150) + insets.bottom }]}
                    alwaysBounceVertical={true}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>This list is empty.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        // Adjusted to just be a container for subheader since native header handles nav
        backgroundColor: 'transparent', 
    },
    subHeader: {
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee', // This needs to be dynamic but StyleSheet is static. 
        // Ideally I'd pass style prop or use a hook for styles.
        // For now I'll rely on inline styles for colors.
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 150,
    },
    wishAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: '100%',
        borderRadius: 12,
    },
    actionText: {
        color: '#fff',
        fontWeight: '600',
        padding: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
});

export default FriendWishlistScreen;
