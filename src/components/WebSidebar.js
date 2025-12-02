import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

const WebSidebar = () => {
    const { theme, isDark, toggleTheme } = useTheme();
    const navigation = useNavigation();
    const { user, signOut } = useAuth();
    const { setAddModalVisible } = useModal();

    // Safe access to user properties (handle both Supabase raw user and enriched profile)
    const firstName = user?.firstName || user?.user_metadata?.first_name || 'User';
    const lastName = user?.lastName || user?.user_metadata?.last_name || '';
    const username = user?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';

    // Helper to check active route - simplified
    const isFocused = (name) => {
        // This is a basic check, might need more robust state if available
        return false; 
    };

    const menuItems = [
        { icon: 'home', label: 'Home', screen: 'Home' },
        { icon: 'people', label: 'Friends', screen: 'FriendsStack' },
        { icon: 'mail', label: 'Messages', screen: 'DMs' },
        { icon: 'person', label: 'Profile', screen: 'ProfileStack' },
        { icon: 'list', label: 'Lists', screen: 'Lists' },
        { icon: 'people-circle', label: 'Communities', screen: 'Communities' },
        { icon: 'settings', label: 'Settings', screen: 'Settings' },
    ];

    const handleNavigation = (screen) => {
        navigation.navigate('Main', { screen: screen });
        // For RootTabs screens like Settings/Lists/Communities, we navigate to Root directly if needed
        // But our App.js structure puts Settings/Lists in RootTabs, not MainTabs.
        // So we need to handle that.
        if (['Settings', 'Lists', 'Communities'].includes(screen)) {
            navigation.navigate(screen);
        } else {
            navigation.navigate('Main', { screen: screen });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border }]}>
            <View style={styles.header}>
                <Image 
                    source={require('../../assets/splash-icon.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={[styles.appName, { color: theme.colors.primary }]}>Wish Me Not</Text>
            </View>

            <ScrollView style={styles.content}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.menuItem}
                        onPress={() => handleNavigation(item.screen)}
                    >
                        <Ionicons name={item.icon} size={28} color={theme.colors.text} />
                        <Text style={[styles.menuText, { color: theme.colors.text }]}>{item.label}</Text>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setAddModalVisible(true)}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                    <Text style={styles.addButtonText}>Post Wish</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                 <TouchableOpacity style={styles.profileSection} onPress={() => navigation.navigate('Main', { screen: 'ProfileStack' })}>
                    <View style={[styles.profilePlaceholder, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.profileInitials}>
                            {firstName?.[0]}{lastName?.[0]}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: theme.colors.text }]}>{firstName} {lastName}</Text>
                        <Text style={[styles.profileHandle, { color: theme.colors.textSecondary }]}>@{username}</Text>
                    </View>
                 </TouchableOpacity>
                 
                 <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={24} color={theme.colors.textSecondary} />
                 </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 280,
        height: '100%',
        borderRightWidth: 1,
        padding: 20,
        display: Platform.OS === 'web' ? 'flex' : 'none',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 12,
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 30,
        marginBottom: 8,
    },
    menuText: {
        fontSize: 20,
        marginLeft: 20,
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    footer: {
        paddingTop: 20,
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profilePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitials: {
        color: '#fff',
        fontWeight: 'bold',
    },
    profileInfo: {
        marginLeft: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    profileHandle: {
        fontSize: 14,
    },
    logoutButton: {
        padding: 8,
    }
});

export default WebSidebar;
