import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CustomDrawerContent = (props) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const handleComingSoon = (feature) => {
        Alert.alert('Coming Soon', `${feature} will be available in a future update.`);
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: insets.top }}>
                {/* Drawer Header */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => props.navigation.navigate('ProfileStack')}>
                        {user?.image ? (
                            <Image source={{ uri: user.image }} style={[styles.avatar, { borderColor: theme.colors.text }]} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={[styles.avatarText, { color: theme.colors.textInverse }]}>
                                    {user?.firstName?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={[styles.name, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>
                        {user ? `${user.firstName} ${user.lastName || ''}` : 'Guest'}
                    </Text>
                    <Text style={[styles.handle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>
                        @{user?.username || user?.firstName?.toLowerCase() || 'guest'}
                    </Text>

                    <View style={styles.statsRow}>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>
                            <Text style={[styles.statCount, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>0</Text> Following
                        </Text>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary, marginLeft: 16, fontFamily: theme.fonts.regular }]}>
                            <Text style={[styles.statCount, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>0</Text> Followers
                        </Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuItems}>
                    <DrawerItem
                        label="Profile"
                        labelStyle={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: theme.fonts.medium }}
                        icon={({ color, size }) => <Ionicons name="person-outline" size={24} color={theme.colors.text} />}
                        onPress={() => props.navigation.navigate('ProfileStack')}
                    />
                    <DrawerItem
                        label="Communities"
                        labelStyle={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: theme.fonts.medium }}
                        icon={({ color, size }) => <Ionicons name="people-outline" size={24} color={theme.colors.text} />}
                        onPress={() => handleComingSoon('Communities')}
                    />
                    <DrawerItem
                        label="Bookmarks"
                        labelStyle={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: theme.fonts.medium }}
                        icon={({ color, size }) => <Ionicons name="bookmark-outline" size={24} color={theme.colors.text} />}
                        onPress={() => handleComingSoon('Bookmarks')}
                    />
                    <DrawerItem
                        label="Lists"
                        labelStyle={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: theme.fonts.medium }}
                        icon={({ color, size }) => <Ionicons name="list-outline" size={24} color={theme.colors.text} />}
                        onPress={() => handleComingSoon('Lists')}
                    />
                </View>

                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

                <View style={styles.bottomItems}>
                    <DrawerItem
                        label="Settings and privacy"
                        labelStyle={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: theme.fonts.medium }}
                        icon={({ color, size }) => <Ionicons name="settings-outline" size={24} color={theme.colors.text} />}
                        onPress={() => props.navigation.navigate('ProfileStack', { screen: 'Themes' })} 
                    />
                    {/* Help Center etc could go here */}
                </View>
            </DrawerContentScrollView>
            
            {/* Bottom Footer */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 20 }]}>
                 <TouchableOpacity onPress={() => props.navigation.navigate('ProfileStack', { screen: 'Themes' })}>
                    <Ionicons name="moon-outline" size={24} color={theme.colors.text} />
                 </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        padding: 16,
        paddingTop: 0,
        marginBottom: 8,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 12,
        borderWidth: 1,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: { fontSize: 20, fontWeight: 'bold' },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    handle: {
        fontSize: 14,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
    },
    statText: {
        fontSize: 14,
    },
    statCount: {
        fontWeight: 'bold',
    },
    menuItems: {
        marginTop: 8,
    },
    separator: {
        height: 1,
        marginVertical: 8,
        marginHorizontal: 16,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    }
});

export default CustomDrawerContent;
