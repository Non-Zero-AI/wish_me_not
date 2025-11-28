import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const ProductCard = ({ item, shouldShowWished = false }) => {
    const { theme } = useTheme();

    const handlePress = () => {
        if (item.link) {
            Linking.openURL(item.link);
        }
    };

    if (item.loading) {
        return (
            <View style={[styles.card, styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Fetching product details...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            ) : (
                <View style={[styles.image, styles.placeholder, { backgroundColor: theme.colors.background }]} />
            )}
            {shouldShowWished && item.wishedBy && (
                <View style={[styles.wishedBadge, { backgroundColor: theme.colors.success }]}>
                    <Ionicons name="gift" size={16} color={theme.colors.textInverse} />
                    <Text style={[styles.wishedText, { color: theme.colors.textInverse }]}>Wished by {item.wishedBy}</Text>
                </View>
            )}
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{item.name || 'Unknown Product'}</Text>
                <Text style={[styles.price, { color: theme.colors.secondary }]}>{item.price || 'Price not available'}</Text>
                <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handlePress}>
                    <Text style={[styles.buttonText, { color: theme.colors.textInverse }]}>View Product</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 200,
    },
    placeholder: {
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    price: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
    },
    button: {
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    loadingCard: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    wishedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        zIndex: 1,
    },
    wishedText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default ProductCard;
