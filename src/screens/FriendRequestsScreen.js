import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { sendFriendRequest, getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../services/friends';
import { supabase } from '../lib/supabase';

const FriendRequestsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await getFriendRequests(user.id);
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async () => {
        if (!searchEmail.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setIsSearching(true);
        try {
            // Check if user exists first
            const { data: targetUser } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', searchEmail)
                .single();

            if (!targetUser) {
                Alert.alert('User Not Found', 'No user found with that email address.');
                return;
            }

            await sendFriendRequest(user, searchEmail);
            Alert.alert('Success', `Friend request sent to ${searchEmail}`);
            setSearchEmail('');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAccept = async (requesterId) => {
        try {
            await acceptFriendRequest(user, requesterId);
            loadRequests(); // Refresh list
        } catch (error) {
            Alert.alert('Error', 'Could not accept request.');
        }
    };

    const handleDecline = async (requesterId) => {
        try {
            await declineFriendRequest(user, requesterId);
            loadRequests(); // Refresh list
        } catch (error) {
            Alert.alert('Error', 'Could not decline request.');
        }
    };

    const renderRequestItem = ({ item }) => (
        <View style={[styles.requestItem, { backgroundColor: theme.colors.surface }]}>
            <Image 
                source={item.avatar_url ? { uri: item.avatar_url } : require('../../assets/splash-icon.png')} 
                style={styles.avatar} 
            />
            <View style={styles.requestInfo}>
                <Text style={[styles.name, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>
                    {item.first_name} {item.last_name}
                </Text>
                <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
                    {item.email}
                </Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleAccept(item.id)}
                >
                    <Ionicons name="checkmark" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.error, marginLeft: 8 }]}
                    onPress={() => handleDecline(item.id)}
                >
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>Friend Requests</Text>
            </View>

            <View style={styles.searchSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add Friend</Text>
                <View style={styles.searchBar}>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text, 
                            borderColor: theme.colors.border,
                            fontFamily: theme.fonts.regular
                        }]}
                        placeholder="Enter email address..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchEmail}
                        onChangeText={setSearchEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSendRequest}
                        disabled={isSearching}
                    >
                        {isSearching ? (
                            <ActivityIndicator color={theme.colors.textInverse} size="small" />
                        ) : (
                            <Text style={[styles.sendButtonText, { color: theme.colors.textInverse, fontFamily: theme.fonts.bold }]}>Send</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>Pending Requests</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : requests.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No pending requests.</Text>
                ) : (
                    <FlatList
                        data={requests}
                        keyExtractor={item => item.id}
                        renderItem={renderRequestItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
    },
    searchSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    sendButton: {
        width: 80,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        fontSize: 16,
    },
    listSection: {
        flex: 1,
        padding: 16,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    requestInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        marginBottom: 4,
    },
    email: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 16,
    }
});

export default FriendRequestsScreen;
