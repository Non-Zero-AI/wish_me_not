import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

const CommunitiesScreen = ({ navigation }) => {
    const { theme } = useTheme();
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Communities" showBack={true} />
            <View style={styles.content}>
                <Text style={[styles.text, { color: theme.colors.text }]}>Communities coming soon...</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 16 },
});

export default CommunitiesScreen;
