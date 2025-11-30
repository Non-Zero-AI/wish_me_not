import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const DMScreen = () => {
    const { theme } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.colors.primary }]}>Messages</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Direct messages are coming soon!
                </Text>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                    Stay tuned for updates.
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        textAlign: 'center',
    }
});

export default DMScreen;
