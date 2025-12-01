import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Platform, Share, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const ProductCard = ({ item, user, shouldShowWished = false, onDelete, onWish }) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    
    // Mock Social Stats
    const [likes, setLikes] = useState(Math.floor(Math.random() * 50) + 5);
    const [isLiked, setIsLiked] = useState(false);
    const [comments] = useState(Math.floor(Math.random() * 10));
    
    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
    };

    const handlePress = () => {
        if (item.link) {
            Linking.openURL(item.link);
        }
    };
    
    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this wish: ${item.name} - ${item.price || ''}\n${item.link || ''}`,
                title: 'Wish Me Not Gift Share'
            });
        } catch (error) {
            console.log(error);
        }
    };

    // Determine User Info (Feed vs Profile)
    // Profile passes 'user' prop. Feed items have friendName/friendImage in 'item'.
    const avatarUri = user?.image || item.friendImage;
    const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (item.friendName || 'Friend');
    const timestamp = "2h"; // Mock time

    if (item.loading) {
        return (
            <View style={[styles.card, styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Fetching product details...</Text>
            </View>
        );
    }

    return (
        <View style={[
            styles.card, 
            { backgroundColor: theme.colors.surface },
            isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.avatarContainer, { backgroundColor: theme.colors.secondary }]}>
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                        <Text style={[styles.avatarText, { color: theme.colors.textInverse }]}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.headerText}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Text style={[styles.userName, { color: theme.colors.text }]}>{displayName}</Text>
                        {/* Verified Badge Mock */}
                        {/* <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} /> */}
                    </View>
                    <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>@{displayName.replace(/\s+/g, '').toLowerCase()} • {timestamp}</Text>
                </View>
                
                {onDelete && (
                    <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
                        {Platform.OS === 'web' ? <Text>🗑️</Text> : <Ionicons name="trash-outline" size={20} color={theme.colors.error} />}
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{item.name || 'Unknown Product'}</Text>
                <Text style={[styles.price, { color: theme.colors.primary }]}>{item.price || 'Price not available'}</Text>
            </View>

            {/* Image Area */}
            <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.postImage, styles.placeholder, { backgroundColor: theme.colors.background }]} />
                )}
                
                {/* Claimed Overlay */}
                {shouldShowWished && (item.isClaimed || item.wishedBy) && (
                    <View style={styles.claimedOverlay}>
                        <View style={[styles.claimedBadge, { backgroundColor: theme.colors.success }]}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.claimedText}>Claimed by {item.claimedBy || item.wishedBy || 'Someone'}</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            {/* Action Footer */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? theme.colors.error : theme.colors.textSecondary} />
                    <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>{likes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={22} color={theme.colors.textSecondary} />
                    <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>{comments}</Text>
                </TouchableOpacity>

                {/* Gift/Claim Action */}
                <TouchableOpacity style={styles.actionButton} onPress={onWish || handlePress}>
                    <Ionicons 
                        name={item.isClaimed ? "gift" : "gift-outline"} 
                        size={24} 
                        color={item.isClaimed ? theme.colors.success : theme.colors.textSecondary} 
                    />
                    <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
                        {item.isClaimed ? 'Claimed' : 'Gift'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 0, // More like a feed
        marginBottom: 12,
        // Shadow is less prominent in modern feeds, but we can keep a subtle one or remove for flat look
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    loadingCard: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 16,
        borderRadius: 12
    },
    loadingText: { marginTop: 12 },
    
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    avatar: { width: '100%', height: '100%' },
    avatarText: { fontSize: 18, fontWeight: 'bold' },
    headerText: { flex: 1 },
    userName: { fontWeight: 'bold', fontSize: 15 },
    handle: { fontSize: 12 },
    
    content: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    title: { fontSize: 16, lineHeight: 22 },
    price: { fontSize: 15, fontWeight: '600', marginTop: 4 },
    
    postImage: {
        width: '100%',
        height: 300, // Taller social style image
        backgroundColor: '#f0f0f0'
    },
    placeholder: { height: 200 },
    
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        paddingHorizontal: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    actionText: { fontSize: 13, fontWeight: '500' },
    
    claimedOverlay: {
        position: 'absolute',
        bottom: 16,
        left: 16,
    },
    claimedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: {width:0, height:2},
        shadowRadius: 4,
        elevation: 4
    },
    claimedText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});

export default ProductCard;
