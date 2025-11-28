import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import ProductCard from '../components/ProductCard';
import { getUser } from '../services/storage';
import { getUserWishlist } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

const FriendWishlistScreen = ({ route, navigation }) => {
    const { friend } = route.params;
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadCurrentUser();
        loadFriendWishlist();
    }, []);

    const loadCurrentUser = async () => {
        const user = await getUser();
        setCurrentUser(user);
    };

    const loadFriendWishlist = async () => {
        try {
            // Only show full loading screen if not refreshing (pull-to-refresh has its own spinner)
            if (!refreshing) setLoading(true);
            
            // Fetch the friend's wishlist using their email
            const wishlist = await getUserWishlist(friend.email);
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

    const handleWishItem = (item) => {
        if (!currentUser) return;

        if (item.wishedBy) {
            Alert.alert("Already Wished", `This item has already been claimed by ${item.wishedBy}.`);
            return;
        }

        Alert.alert(
            "Wish Item",
            `You have marked ${item.name} as wished for ${friend.name}. This claims the gift!`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => {
                        // Update the item with the current user's name
                        setItems(prevItems =>
                            prevItems.map(i =>
                                i.id === item.id
                                    ? { ...i, wishedBy: currentUser.firstName }
                                    : i
                            )
                        );
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title={`${friend.name}'s Wish List`}
                subTitle="Swipe right to claim a gift"
                showBack
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading wishlist...</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={({ item }) => (
                        <View style={{ marginBottom: 16 }}>
                            <Swipeable
                                enabled={!item.wishedBy}
                                renderRightActions={() => (
                                    !item.wishedBy ? (
                                        <TouchableOpacity
                                            style={[styles.wishAction, { backgroundColor: theme.colors.success, margin: 0 }]}
                                            onPress={() => handleWishItem(item)}
                                        >
                                            <Text style={styles.actionText}>Wish</Text>
                                        </TouchableOpacity>
                                    ) : null
                                )}
                            >
                                <ProductCard item={item} shouldShowWished={true} />
                            </Swipeable>
                        </View>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
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
        </SafeAreaView>
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
