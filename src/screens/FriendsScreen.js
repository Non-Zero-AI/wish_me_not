import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// Mock storage for friends (in a real app, this would be in storage.js)
const MOCK_FRIENDS = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com' },
    { id: '2', name: 'Bob Jones', email: 'bob@example.com' },
];
import AppHeader from '../components/AppHeader';

const FriendsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [friends, setFriends] = useState(MOCK_FRIENDS);
    const [modalVisible, setModalVisible] = useState(false);
    const [newFriendName, setNewFriendName] = useState('');

    const handleAddFriend = () => {
        if (!newFriendName.trim()) return;

        const newFriend = {
            id: Date.now().toString(),
            name: newFriendName,
            email: 'pending@example.com' // Placeholder
        };

        setFriends([...friends, newFriend]);
        setNewFriendName('');
        setModalVisible(false);
    };

    const renderFriend = ({ item }) => (
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
                            placeholder="Friend's Name"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newFriendName}
                            onChangeText={setNewFriendName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.background }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                                onPress={handleAddFriend}
                            >
                                <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>Add</Text>
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
