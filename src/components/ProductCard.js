import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Platform, Share, useWindowDimensions, Alert, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const ProductCard = ({ item, user, shouldShowWished = false, onDelete, onWish, onStash }) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width > 768;
    
    const [likes, setLikes] = useState(Math.floor(Math.random() * 10)); 
    const [isLiked, setIsLiked] = useState(false);
    const [bookmarks, setBookmarks] = useState(0);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
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
        setLikes(prev => {
            const next = newLiked ? prev + 1 : prev - 1;
            return next < 0 ? 0 : next;
        });
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

    const handleBookmark = () => {
        const next = !isBookmarked;
        setIsBookmarked(next);
        setBookmarks(prev => {
            const value = next ? prev + 1 : prev - 1;
            return value < 0 ? 0 : value;
        });
    };

    const handleOverflow = () => {
        const hasDelete = typeof onDelete === 'function';
        const isOwnPost = item.user_id && user?.id ? item.user_id === user.id : true;
        const canInviteToCircle = !isOwnPost;

        // Web: show a simple in-card menu instead of immediate confirmation
        if (Platform.OS === 'web') {
            setIsMenuOpen(prev => !prev);
            return;
        }

        if (Platform.OS === 'ios') {
            const baseOptions = canInviteToCircle
                ? ['Report Post', 'Unfollow user', 'Invite to Circle', 'Cancel']
                : ['Report Post', 'Unfollow user', 'Cancel'];
            const options = hasDelete ? ['Delete Post', ...baseOptions] : baseOptions;
            const cancelButtonIndex = options.length - 1;

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    destructiveButtonIndex: hasDelete ? 0 : undefined,
                },
                (buttonIndex) => {
                    if (hasDelete && buttonIndex === 0) {
                        Alert.alert(
                            'Delete Post',
                            'Are you sure you want to delete this wish?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => onDelete && onDelete() },
                            ],
                        );
                        return;
                    }

                    const offset = hasDelete ? 1 : 0;
                    if (buttonIndex === offset) {
                        Alert.alert('Report', 'Thanks for your feedback.');
                    }
                    // Other options (Unfollow, Invite to Circle) are placeholders for now
                }
            );
        } else {
            const actions = [
                { text: 'Report Post', onPress: () => Alert.alert('Report', 'Thanks for your feedback.') },
                ...(canInviteToCircle ? [{ text: 'Invite to Circle', onPress: () => {} }] : []),
                { text: 'Cancel', style: 'cancel' },
            ];

            if (hasDelete) {
                actions.unshift({
                    text: 'Delete Post',
                    style: 'destructive',
                    onPress: () => onDelete && onDelete(),
                });
            }

            Alert.alert('Post options', undefined, actions);
        }
    };

    const avatarUri = user?.image || item.friendImage;
    const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (item.friendName || 'Friend');
    const dateObj = item.created_at ? new Date(item.created_at) : new Date();
    const dateString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // If the product name and the user message are identical, avoid showing duplicate text.
    const showTitle = !!item.name && item.name !== item.content;

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
            isDesktop && { maxWidth: 520, alignSelf: 'center' }
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
                <View style={styles.cardHeaderRow}>
                    <View style={styles.userSectionHeader}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.userAvatarHeader} />
                        ) : (
                            <View style={[styles.userAvatarHeader, { backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{color:'#fff', fontSize:14, fontWeight:'bold'}}>{displayName.charAt(0)}</Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.userNameHeader} numberOfLines={1}>{displayName}</Text>
                            <Text style={styles.metaText}>{dateString}</Text>
                        </View>
                    </View>
                    <View style={{ position: 'relative' }}>
                        <TouchableOpacity style={styles.overflowBtn} onPress={handleOverflow}>
                            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
                        </TouchableOpacity>
                        {Platform.OS === 'web' && isMenuOpen && (
                            <View style={styles.webMenuContainer}>
                                {typeof onDelete === 'function' && (
                                    <TouchableOpacity
                                        style={styles.webMenuItemDanger}
                                        onPress={() => {
                                            setIsMenuOpen(false);
                                            if (onDelete) onDelete();
                                        }}
                                    >
                                        <Text style={styles.webMenuItemDangerText}>Delete Post</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.webMenuItem}
                                    onPress={() => {
                                        setIsMenuOpen(false);
                                        window.alert('Thanks for your feedback. Reporting is coming soon.');
                                    }}
                                >
                                    <Text style={styles.webMenuItemText}>Report Post</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.webMenuItem}
                                    onPress={() => {
                                        setIsMenuOpen(false);
                                        window.alert('Circle invites are coming soon.');
                                    }}
                                >
                                    <Text style={styles.webMenuItemText}>Invite to Circle</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.contentArea}>
                    {item.content ? (
                        <Text style={styles.postText}>{item.content}</Text>
                    ) : null}

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
                        </TouchableOpacity>
                    </View>

                    <View style={styles.titleRow}>
                        {showTitle && (
                            <Text style={styles.itemTitle} numberOfLines={2}>{item.name}</Text>
                        )}
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
                        <View style={styles.actionsRowFull}>
                            <TouchableOpacity style={styles.actionIconWrapper}>
                                <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.actionCountText}>0</Text>
                            </TouchableOpacity>

                            {onStash && (
                                <TouchableOpacity style={styles.actionIconWrapper} onPress={onStash}>
                                    <Ionicons name="copy-outline" size={18} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.actionCountText}>Stash</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.actionIconWrapper} onPress={handleLike}>
                                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#ff4757' : 'rgba(255,255,255,0.9)'} />
                                <Text style={styles.actionCountText}>{likes}</Text>
                            </TouchableOpacity>

                            <View style={styles.actionIconWrapper}>
                                <Ionicons name="stats-chart" size={18} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.actionCountText}>--</Text>
                            </View>

                            <TouchableOpacity style={styles.actionIconWrapper} onPress={handleBookmark}>
                                <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={isBookmarked ? currentTheme.primary : 'rgba(255,255,255,0.9)'} />
                                <Text style={styles.actionCountText}>{bookmarks}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionIconWrapper} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={18} color="rgba(255,255,255,0.9)" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={[styles.mainActionBtn, { backgroundColor: currentTheme.primary }]}
                            onPress={onWish || handlePress}
                        >
                            <Text style={styles.mainActionText}>{item.isClaimed ? 'Claimed' : (onWish ? 'Claim' : 'View')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '100%',
        maxWidth: 520,
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
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 8,
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
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
        marginTop: 12,
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
    userSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatarHeader: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    userNameHeader: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    metaText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    overflowBtn: {
        padding: 4,
    },
    postText: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 4,
    },
    actionsRowFull: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'space-between',
        marginRight: 8,
    },
    actionIconWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionCountText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
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
    webMenuContainer: {
        position: 'absolute',
        top: 28,
        right: 0,
        backgroundColor: 'rgba(15,15,20,0.98)',
        paddingVertical: 6,
        minWidth: 160,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        zIndex: 20,
    },
    webMenuItem: {
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    webMenuItemText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
    },
    webMenuItemDanger: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    webMenuItemDangerText: {
        color: '#ff4d4f',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default ProductCard;
