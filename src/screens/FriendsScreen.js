import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme } from '../theme/ThemeContext';
import { getUserWishlist, getUserFriends, deleteFriend } from '../services/api';
import { getFriends, saveFriends, getUser } from '../services/storage';
import AppHeader from '../components/AppHeader';

const FriendsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [friends, setFriends] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newFriendEmail, setNewFriendEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const userData = await getUser();
            setUser(userData);
            if (userData) {
                await loadFriends(userData.email);
            }
            setLoading(false);
        };
        init();
    }, []);

    const loadFriends = async (email) => {
        // 1. Try Server
        try {
            const serverFriends = await getUserFriends(email);
            if (serverFriends && serverFriends.length > 0) {
                setFriends(serverFriends);
                await saveFriends(serverFriends); // Cache
                return;
            }
        } catch (e) {
            console.error('Server fetch failed, falling back to local', e);
        }

        // 2. Fallback to Local
        const storedFriends = await getFriends();
        setFriends(storedFriends);
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
        if (user) {
            await loadFriends(user.email);
        }
        setRefreshing(false);
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
                <View style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.textInverse }]}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.friendEmail, { color: theme.colors.textSecondary }]}>{item.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </Swipeable>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title="Friends" 
                rightAction={
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                        <Ionicons name="person-add" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={friends}
                renderItem={renderFriend}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No friends yet.</Text>
                    </View>
                }
            />

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
    listContent: {
        padding: 16,
        paddingBottom: 80,
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
