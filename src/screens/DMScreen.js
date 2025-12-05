import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getUser, getFriends, addLocalFriend } from '../services/storage';
import { searchUsersByUsernamePrefix, findUserByEmail } from '../services/api';

const DMScreen = () => {
    const { theme } = useTheme();
    const [user, setUser] = useState(null);
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [threadSearch, setThreadSearch] = useState('');
    const [mode, setMode] = useState('threads'); // 'threads' | 'add'
    const [addMode, setAddMode] = useState('email'); // 'email' | 'username'
    const [usernameResults, setUsernameResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                const currentUser = await getUser();
                setUser(currentUser);
                const storedFriends = await getFriends();
                setFriends(storedFriends || []);
            };
            load();
        }, [])
    );

    useEffect(() => {
        const runSearch = async () => {
            if (addMode !== 'username') return;
            const trimmed = searchQuery.trim().replace(/^@/, '');
            if (!trimmed) {
                setUsernameResults([]);
                return;
            }

            setLoadingResults(true);
            try {
                const results = await searchUsersByUsernamePrefix(trimmed, 10);
                setUsernameResults(results);
            } finally {
                setLoadingResults(false);
            }
        };

        const timeout = setTimeout(runSearch, 200);
        return () => clearTimeout(timeout);
    }, [searchQuery, addMode]);

    const handleAddFriendByEmail = async () => {
        const value = searchQuery.trim();
        if (!value) return;

        setSubmitting(true);
        try {
            const email = value.toLowerCase();
            const profile = await findUserByEmail(email);
            const displayName = profile?.firstName || profile?.lastName
                ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                : email.split('@')[0];

            const added = await addLocalFriend(email, displayName);
            if (!added) {
                Alert.alert('Info', 'This friend is already in your list.');
            } else {
                const updated = await getFriends();
                setFriends(updated || []);
                Alert.alert('Success', 'Friend added locally.');
            }
        } catch (e) {
            console.error('Add friend by email failed', e);
            Alert.alert('Error', 'Could not add friend by email.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddFriendFromResult = async (result) => {
        setSubmitting(true);
        try {
            const email = result.email;
            const displayName = result.displayName || result.username || email.split('@')[0];
            const added = await addLocalFriend(email, displayName);
            if (!added) {
                Alert.alert('Info', 'This friend is already in your list.');
            } else {
                const updated = await getFriends();
                setFriends(updated || []);
                Alert.alert('Success', 'Friend added locally.');
            }
        } catch (e) {
            console.error('Add friend from username result failed', e);
            Alert.alert('Error', 'Could not add friend.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredThreads = friends.filter(friend => {
        if (!threadSearch.trim()) return true;
        const q = threadSearch.trim().toLowerCase();
        return (
            friend.name?.toLowerCase().includes(q) ||
            friend.email?.toLowerCase().includes(q)
        );
    });

    const renderThread = ({ item }) => {
        const displayName = item.name || item.email?.split('@')[0] || 'Friend';
        const username = `@${(item.email || '').split('@')[0]}`;

        return (
            <TouchableOpacity
                style={styles.threadCard}
                activeOpacity={0.8}
                onPress={() => {
                    Alert.alert('Messages', `Open conversation with ${displayName} (DM backend coming soon).`);
                }}
            >
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.onlineDot} />
                </View>
                <View style={styles.threadMain}>
                    <View style={styles.threadHeaderRow}>
                        <Text style={styles.threadName} numberOfLines={1}>{displayName}</Text>
                        <Text style={styles.threadTime}>Just now</Text>
                    </View>
                    <Text style={styles.threadUsername} numberOfLines={1}>{username}</Text>
                    <Text style={styles.threadPreview} numberOfLines={1}>
                        Start a conversation about their wishlist.
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderUsernameResult = ({ item }) => {
        const label = item.displayName || item.username || item.email;
        return (
            <TouchableOpacity
                style={styles.resultRow}
                onPress={() => handleAddFriendFromResult(item)}
            >
                <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>
                        {(label || '?').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{label}</Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                        @{item.username || (item.email ? item.email.split('@')[0] : 'user')}
                    </Text>
                </View>
                <Ionicons name="person-add" size={20} color="#60A5FA" />
            </TouchableOpacity>
        );
    };

    const renderAddFriendSection = () => {
        return (
            <View style={styles.addContainer}>
                <View style={styles.addModeToggleWrapper}>
                    <View style={styles.addModeToggleBackground}>
                        <TouchableOpacity
                            style={[
                                styles.addModeButton,
                                addMode === 'email' && styles.addModeButtonActive,
                            ]}
                            onPress={() => setAddMode('email')}
                        >
                            <Text
                                style={[
                                    styles.addModeText,
                                    addMode === 'email' && styles.addModeTextActive,
                                ]}
                            >
                                Email
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.addModeButton,
                                addMode === 'username' && styles.addModeButtonActive,
                            ]}
                            onPress={() => setAddMode('username')}
                        >
                            <Text
                                style={[
                                    styles.addModeText,
                                    addMode === 'username' && styles.addModeTextActive,
                                ]}
                            >
                                Username
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.addInputWrapper}>
                    <Ionicons
                        name={addMode === 'email' ? 'mail' : 'at'}
                        size={18}
                        color="#AAB2C0"
                        style={{ marginRight: 8 }}
                    />
                    <TextInput
                        style={styles.addInput}
                        placeholder={addMode === 'email' ? 'Enter friend email...' : 'Search by @username...'}
                        placeholderTextColor="#6B7280"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {addMode === 'email' && (
                        <TouchableOpacity
                            style={styles.addSubmitButton}
                            onPress={handleAddFriendByEmail}
                            disabled={submitting || !searchQuery.trim()}
                        >
                            <Text style={styles.addSubmitText}>
                                {submitting ? 'Adding...' : 'Add'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {addMode === 'username' && (
                    <View style={styles.resultsContainer}>
                        {loadingResults ? (
                            <Text style={styles.resultsStatus}>Searching...</Text>
                        ) : usernameResults.length === 0 && searchQuery.trim() ? (
                            <Text style={styles.resultsStatus}>No users found.</Text>
                        ) : (
                            <FlatList
                                data={usernameResults}
                                keyExtractor={(item) => item.id}
                                renderItem={renderUsernameResult}
                            />
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#1C1E22' }]}>
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => setMode(mode === 'threads' ? 'add' : 'threads')}
                    >
                        <Ionicons
                            name={mode === 'threads' ? 'person-add' : 'chatbubbles'}
                            size={20}
                            color="#60A5FA"
                        />
                    </TouchableOpacity>
                </View>

                {mode === 'threads' && (
                    <View style={styles.searchBarWrapper}>
                        <View style={styles.searchBarInner}>
                            <Ionicons
                                name="search"
                                size={18}
                                color="#AAB2C0"
                                style={{ marginRight: 8 }}
                            />
                            <TextInput
                                placeholder="Search messages..."
                                placeholderTextColor="#6B7280"
                                style={styles.searchInput}
                                value={threadSearch}
                                onChangeText={setThreadSearch}
                            />
                        </View>
                    </View>
                )}
            </View>

            {mode === 'threads' ? (
                <FlatList
                    style={{ flex: 1 }}
                    data={filteredThreads}
                    keyExtractor={(item) => item.id}
                    renderItem={renderThread}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                Start adding friends to see conversations here.
                            </Text>
                        </View>
                    }
                />
            ) : (
                renderAddFriendSection()
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingTop: 24,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerRow: {
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
    headerIconButton: {
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
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 24,
    },
    threadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: '#24272C',
        borderWidth: 1,
        borderColor: '#2E3238',
        shadowColor: '#15171a',
        shadowOpacity: 0.7,
        shadowRadius: 10,
        shadowOffset: { width: 4, height: 4 },
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1F2126',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 20,
        fontWeight: '600',
        color: '#E5E7EB',
    },
    onlineDot: {
        position: 'absolute',
        right: 2,
        bottom: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: '#24272C',
    },
    threadMain: {
        flex: 1,
        minWidth: 0,
    },
    threadHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    threadName: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    threadTime: {
        color: '#AAB2C0',
        fontSize: 11,
    },
    threadUsername: {
        color: '#AAB2C0',
        fontSize: 12,
        marginBottom: 2,
    },
    threadPreview: {
        color: '#FFFFFF',
        fontSize: 13,
    },
    emptyContainer: {
        paddingTop: 100,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#AAB2C0',
        fontSize: 14,
        textAlign: 'center',
    },
    addContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    addModeToggleWrapper: {
        marginBottom: 12,
        alignItems: 'center',
    },
    addModeToggleBackground: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderRadius: 999,
        padding: 4,
    },
    addModeButton: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addModeButtonActive: {
        backgroundColor: '#4F46E5',
    },
    addModeText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    addModeTextActive: {
        color: '#FFFFFF',
    },
    addInputWrapper: {
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
        marginBottom: 12,
    },
    addInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    addSubmitButton: {
        marginLeft: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#4F46E5',
    },
    addSubmitText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    resultsContainer: {
        flex: 1,
        marginTop: 4,
    },
    resultsStatus: {
        color: '#9CA3AF',
        fontSize: 13,
        paddingVertical: 8,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#111827',
    },
    resultAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    resultAvatarText: {
        color: '#E5E7EB',
        fontWeight: '600',
    },
    resultInfo: {
        flex: 1,
        minWidth: 0,
    },
    resultName: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 2,
    },
    resultMeta: {
        color: '#9CA3AF',
        fontSize: 12,
    },
});

export default DMScreen;
