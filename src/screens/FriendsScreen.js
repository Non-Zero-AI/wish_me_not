import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { getUserWishlist, getUserFriends, deleteFriend } from '../services/api';
import { getFriends, saveFriends, getUser } from '../services/storage';
import SwipeableRow from '../components/SwipeableRow';
import AppHeader from '../components/AppHeader';

const FriendsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [friends, setFriends] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newFriendEmail, setNewFriendEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

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
        </SwipeableRow>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader 
                title="Friends" 
                leftAction={
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.addButton}>
                         {user?.image ? (
                            <Image source={{ uri: user.image }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                         ) : (
                            <Ionicons name="menu" size={28} color={theme.colors.primary} />
                         )}
                    </TouchableOpacity>
                }
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
            
            <FlatList
                style={{ flex: 1 }}
                data={friends}
                renderItem={renderFriend}
                keyExtractor={item => item.id}
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
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 }]}>
                            Gifting is better with Friends; add Friends to start seeing what they have on their Wishlists
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={{marginTop: 20, padding: 10, backgroundColor: theme.colors.surface, borderRadius: 8}}>
                            <Text style={{color: theme.colors.primary}}>Add Your First Friend</Text>
                        </TouchableOpacity>
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
    container: { flex: 1 },
    addButton: { padding: 8 },
    listContent: { padding: 16, paddingBottom: 120 },
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
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarText: { fontSize: 20, fontWeight: 'bold' },
    friendInfo: { flex: 1 },
    friendName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    friendEmail: { fontSize: 14 },
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: '100%',
        borderRadius: 12,
        marginBottom: 12,
    },
    actionText: { color: '#fff', fontWeight: '600', padding: 20 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16 },
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
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 24,
        fontSize: 16,
        borderWidth: 1,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    cancelButton: {},
    saveButton: {},
    cancelButtonText: { fontWeight: '600', fontSize: 16 },
    saveButtonText: { fontWeight: '600', fontSize: 16 },
});

export default FriendsScreen;
