import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Share, SafeAreaView, RefreshControl } from 'react-native';
import ProductCard from '../components/ProductCard';
import { getItems, addItem, getUser, deleteItem } from '../services/storage';
import { addProduct } from '../services/api';
import * as Linking from 'expo-linking';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';

const HomeScreen = () => {
    const { theme, isDark } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [url, setUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
        loadItems();
    }, []);

    const loadUser = async () => {
        const userData = await getUser();
        setUser(userData);
    };

    const loadItems = async () => {
        const storedItems = await getItems();
        setItems(storedItems);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadItems();
        setRefreshing(false);
    }, []);

    const handleAddItem = async () => {
        if (!url) return;

        const tempId = Date.now().toString();
        const tempItem = { id: tempId, url, loading: true };

        setItems(prevItems => [tempItem, ...prevItems]);

        setUrl('');
        setModalVisible(false);

        try {
            if (!user) {
                Alert.alert('Error', 'User not found. Please restart the app.');
                setItems(prevItems => prevItems.filter(i => i.id !== tempId));
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

    const handleDeleteItem = async (itemId) => {
        Alert.alert(
            "Delete Item",
            "Are you sure you want to delete this item?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const newItems = await deleteItem(itemId);
                        setItems(newItems);
                    }
                }
            ]
        );
    };

    const handleWishItem = (item) => {
        Alert.alert("Wish Item", "You cannot mark your own items as 'wished'. Share your list with a friend so they can wish for it!");
    };

    const handleShare = async () => {
        try {
            if (!user) return;
            const deepLink = Linking.createURL(`wishlist/${encodeURIComponent(user.email)}`);
            const shareMessage = `Check out ${user.firstName}'s Wish List on Wish Me Not!\n\nOnce the app is available, you can view it here:\n${deepLink}\n\nFor now, download the app to see the list!`;

            await Share.share({
                message: shareMessage,
            });
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title="My Wish List" 
                rightAction={
                    <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                        <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={items}
                renderItem={({ item }) => (
                    <View style={{ marginBottom: 16 }}>
                        <Swipeable
                            renderLeftActions={() => (
                                <TouchableOpacity
                                    style={[styles.deleteAction, { backgroundColor: theme.colors.error }]}
                                    onPress={() => handleDeleteItem(item.id)}
                                >
                                    <Text style={styles.actionText}>Delete</Text>
                                </TouchableOpacity>
                            )}
                            renderRightActions={() => (
                                <TouchableOpacity
                                    style={[styles.wishAction, { backgroundColor: theme.colors.success }]}
                                    onPress={() => handleWishItem(item)}
                                >
                                    <Text style={styles.actionText}>Wish</Text>
                                </TouchableOpacity>
                            )}
                        >
                            <ProductCard item={item} shouldShowWished={false} />
                        </Swipeable>
                    </View>
                )}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.text }]}>Your wish list is empty.</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Tap the + button to add items.</Text>
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
                        <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>Paste a product URL below</Text>

                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.background, 
                                color: theme.colors.text, 
                                borderColor: theme.colors.border 
                            }]}
                            placeholder="https://example.com/product"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

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
    shareButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
    },
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
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
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
        // background handled dynamically
    },
    addButton: {
        // background handled dynamically
    },
    cancelButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    addButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: '100%',
        borderRadius: 12,
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
});

export default HomeScreen;
