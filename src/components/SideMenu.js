import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

const SideMenu = () => {
    const { theme, toggleTheme, isDark } = useTheme();
    const { isSideMenuVisible, setSideMenuVisible } = useModal();
    const navigation = useNavigation();
    const { user } = useAuth();

    if (!isSideMenuVisible) return null;

    const handleNavigation = (screen) => {
        setSideMenuVisible(false);
        navigation.navigate(screen);
    };

    const menuItems = [
        { icon: 'settings-outline', label: 'Settings', screen: 'Settings' },
        { icon: 'list-outline', label: 'Lists', screen: 'Lists' },
        { icon: 'people-outline', label: 'Communities', screen: 'Communities' },
    ];

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isSideMenuVisible}
            onRequestClose={() => setSideMenuVisible(false)}
        >
            <View style={styles.overlay}>
                <TouchableOpacity 
                    style={styles.backdrop} 
                    activeOpacity={1} 
                    onPress={() => setSideMenuVisible(false)}
                />
                
                <SafeAreaView style={[styles.menuContainer, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.header}>
                        <Image 
                            source={require('../../assets/splash-icon.png')} 
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.appName, { color: theme.colors.primary }]}>Wish Me Not</Text>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Menu</Text>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={styles.menuItem}
                                    onPress={() => handleNavigation(item.screen)}
                                >
                                    <Ionicons name={item.icon} size={24} color={theme.colors.text} />
                                    <Text style={[styles.menuText, { color: theme.colors.text }]}>{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Preferences</Text>
                            <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                                <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
                                <Ionicons name={isDark ? "toggle" : "toggle-outline"} size={24} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                             <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContainer: {
        width: '80%',
        maxWidth: 300,
        height: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    logo: {
        width: 60,
        height: 60,
        marginBottom: 10,
    },
    appName: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginLeft: 20,
        marginBottom: 10,
        marginTop: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        marginLeft: 16,
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
    }
});

export default SideMenu;
