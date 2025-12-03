import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Platform, Share, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const ProductCard = ({ item, user, shouldShowWished = false, onDelete, onWish, onStash }) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    
    const [likes, setLikes] = useState(Math.floor(Math.random() * 10)); 
    const [isLiked, setIsLiked] = useState(false);
    
    // Card Theme Colors
    const cardThemes = [
        { name: 'green', primary: '#01c3a8', gradient: ['#107667ed', '#151419'] },
        { name: 'blue', primary: '#1890ff', gradient: ['#00458f8f', '#151419'] },
        { name: 'orange', primary: '#ffb741', gradient: ['#ffb74194', '#151419'] },
        { name: 'red', primary: '#a63d2a', gradient: ['#a63d2a82', '#151419'] }
    ];

    const themeIndex = (item.id ? item.id.toString().charCodeAt(0) : 0) % cardThemes.length;
    const currentTheme = cardThemes[themeIndex];
    const isPopular = likes >= 5;
    
    const handleLike = () => {
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikes(prev => newLiked ? prev + 1 : prev - 1);
    };

    const handlePress = () => {
        if (item.link) Linking.openURL(item.link);
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

    const avatarUri = user?.image || item.friendImage;
    const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (item.friendName || 'Friend');
    const dateObj = item.created_at ? new Date(item.created_at) : new Date();
    const dateString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (item.loading) {
        return (
            <View style={[styles.cardContainer, styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[
            styles.cardContainer,
            isDesktop && { maxWidth: 400, alignSelf: 'center' }
        ]}>
            {isPopular && (
                <View style={[
                    styles.electricGlow, 
                    { borderColor: currentTheme.primary, shadowColor: currentTheme.primary }
                ]} />
            )}

            <LinearGradient
                colors={currentTheme.gradient}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.card}
            >
                {/* 1. Big Product Image Area (Top 55%) */}
                <View style={styles.imageArea}>
                    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={{flex:1}}>
                        {item.image ? (
                            <Image 
                                source={{ uri: item.image }} 
                                style={styles.mainImage} 
                                resizeMode="cover" 
                            />
                        ) : (
                            <View style={[styles.mainImage, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.2)" />
                            </View>
                        )}
                        
                        {/* Header Overlay (Date & Share) */}
                        <View style={styles.headerOverlay}>
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateText}>{dateString}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {onDelete && (
                                    <TouchableOpacity onPress={onDelete} style={styles.iconBadge}>
                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={handleShare} style={styles.iconBadge}>
                                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 2. Content Area (Bottom 45%) */}
                <View style={styles.contentArea}>
                    <View style={styles.titleRow}>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.name || 'Unknown Item'}</Text>
                        <Text style={[styles.itemPrice, { color: currentTheme.primary }]}>{item.price || ''}</Text>
                    </View>

                    {item.price === 'Fetching details…' && (
                        <View style={styles.fetchingBadge}>
                            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.fetchingText}>Fetching product details…</Text>
                        </View>
                    )}

                    {/* Footer: Avatars & Actions */}
                    <View style={styles.footer}>
                        <View style={styles.userSection}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.userAvatar} />
                            ) : (
                                <View style={[styles.userAvatar, { backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{color:'#fff', fontSize:12, fontWeight:'bold'}}>{displayName.charAt(0)}</Text>
                                </View>
                            )}
                            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                        </View>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isLiked ? '#ff4757' : 'rgba(255,255,255,0.1)' }]} onPress={handleLike}>
                                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color="#fff" />
                            </TouchableOpacity>
                            
                            {onStash && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={onStash}>
                                    <Ionicons name="copy-outline" size={20} color="#fff" />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={[styles.mainActionBtn, { backgroundColor: currentTheme.primary }]}
                                onPress={onWish || handlePress}
                            >
                                <Text style={styles.mainActionText}>{item.isClaimed ? 'Claimed' : (onWish ? 'Claim' : 'View')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '90%',
        maxWidth: 380,
        height: 420, // Fixed height for consistency
        alignSelf: 'center',
        marginVertical: 16,
        position: 'relative',
    },
    loadingCard: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
        height: 200
    },
    card: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    electricGlow: {
        position: 'absolute',
        top: -2, left: -2, right: -2, bottom: -2,
        borderRadius: 26,
        borderWidth: 2,
        opacity: 0.8,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
    },
    
    // Image Area
    imageArea: {
        height: '55%',
        width: '100%',
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dateText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Content Area
    contentArea: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    titleRow: {
        marginBottom: 8,
    },
    itemTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'capitalize',
    },
    itemPrice: {
        fontSize: 18,
        fontWeight: '600',
    },
    
    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    fetchingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 4,
    },
    fetchingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    userName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        maxWidth: 80,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainActionBtn: {
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainActionText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
});

export default ProductCard;
