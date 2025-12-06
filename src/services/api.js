import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import axios from 'axios';

/**
 * Helper to get UUID from Email
 */
const getUserIdByEmail = async (email) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
    
    if (error) {
        console.warn('Could not find user ID for email:', email);
        return null;
    }
    return data.id;
};

/**
 * User Profile Services
 */
export const fetchUserInfo = async (email) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            username: data.username,
            avatar_url: data.avatar_url,
        };
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
};

export const updateUserProfile = async (user) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                first_name: user.firstName,
                last_name: user.lastName,
            })
            .eq('email', user.email)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

// Deprecated
export const createUser = async (user) => {
    console.warn('createUser is deprecated.');
    return true;
};

/**
 * Friends Services
 */
export const getUserFriends = async (userEmail) => {
    try {
        const userId = await getUserIdByEmail(userEmail);
        if (!userId) return [];

        const { data, error } = await supabase
            .from('friends')
            .select(`
                friend_id,
                profiles:friend_id (id, first_name, last_name, email)
            `)
            .eq('user_id', userId)
            .eq('status', 'accepted');

        if (error) throw error;

        const { data: reverseData, error: reverseError } = await supabase
            .from('friends')
            .select(`
                user_id,
                profiles:user_id (id, first_name, last_name, email)
            `)
            .eq('friend_id', userId)
            .eq('status', 'accepted');

        if (reverseError) throw reverseError;

        const friends = [
            ...(data || []).map(d => d.profiles),
            ...(reverseData || []).map(d => d.profiles)
        ];

        const enrichedFriends = await Promise.all(friends.map(async (friend) => {
            if (!friend) return null;
            const { count } = await supabase
                .from('wishlist_posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', friend.id);

            return {
                id: friend.email,
                uuid: friend.id,
                email: friend.email,
                name: `${friend.first_name} ${friend.last_name}`,
                itemCount: count || 0
            };
        }));

        return enrichedFriends.filter(f => f !== null);

    } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
    }
};

export const deleteFriend = async (userEmail, friendEmail) => {
    // Logic handled in FriendsScreen via specialized service call usually,
    // but for legacy compatibility:
    console.warn('deleteFriend stub called');
    return true;
};

/**
 * List Services
 */
export const getUserLists = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching lists:', error);
        return [];
    }
};

export const createList = async (userId, title, description = '') => {
    try {
        const { data, error } = await supabase
            .from('lists')
            .insert({ user_id: userId, title, description })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating list:', error);
        throw error;
    }
};

/**
 * Wishlist Services
 */
export const getUserWishlist = async (userEmail) => {
    try {
        const userId = await getUserIdByEmail(userEmail);
        if (!userId) return [];

        // Fetch all posts for the user, regardless of list.
        // NOTE: We avoid relationship shorthand (claimer:claimed_by, list:list_id)
        // because the required foreign keys are not yet present in the schema.
        const { data, error } = await supabase
            .from('wishlist_posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('getUserWishlist count', data?.length || 0);
        if (data && data.length > 0) {
            console.log('getUserWishlist sample post', {
                id: data[0].id,
                name: data[0].name,
                image: data[0].image,
                created_at: data[0].created_at,
            });
        }

        return data.map(post => ({
            id: post.id,
            name: post.name,
            price: post.price,
            image: post.image,
            link: post.link,
            content: post.message || post.content || null,
            isPublic: post.is_public,
            isClaimed: post.is_claimed,
            created_at: post.created_at,
            // Claimer and list information can be reintroduced later once
            // proper foreign keys exist in Supabase.
            claimedBy: null,
            claimedByEmail: null,
            listTitle: 'Main',
            originalData: post 
        }));
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return [];
    }
};

export const addProduct = async (url, user, message) => {
    try {
        console.log('addProduct (webhook) called with URL:', url);

        const userId = user.id || (await getUserIdByEmail(user.email));

        // Get default list so the webhook can attach the item correctly in Supabase
        const { data: lists } = await supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .limit(1);
        const listId = lists && lists.length > 0 ? lists[0].id : null;

        const userProfile = {
            id: userId,
            email: user.email,
            firstName: user.firstName || user.first_name || user.user_metadata?.first_name || null,
            lastName: user.lastName || user.last_name || user.user_metadata?.last_name || null,
            username:
                user.username ||
                user.user_metadata?.username ||
                (user.email ? user.email.split('@')[0] : null),
        };

        const now = new Date().toISOString();

        // Look up user's default privacy (falls back to private)
        let defaultPublic = false;
        try {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('default_posts_public')
                .eq('user_id', userId)
                .maybeSingle();
            if (settings && typeof settings.default_posts_public === 'boolean') {
                defaultPublic = settings.default_posts_public;
            }
        } catch (e) {
            console.warn('Could not load user default privacy setting, using private by default');
        }

        // Shape post payload to match Supabase public.wishlist_posts schema so n8n can insert directly
        const post = {
            user_id: userId,
            list_id: listId,
            name: message || 'New Item',
            price: 'Fetching details…',
            image: null,
            link: url,
            content: message || null,
            is_public: defaultPublic,
            is_claimed: false,
            claimed_by: null,
            circle_id: null,
            created_at: now,
        };

        const payload = {
            url,
            userId,
            listId,
            message: message || null,
            isPublic: post.is_public,
        };

        try {
            // Call Supabase Edge Function which fetches HTML, uses Gemini to
            // shorten the name, inserts into wishlist_posts, and returns the row.
            const { data: created, error: fnError } = await supabase
                .functions
                .invoke('fetch-product', {
                    body: payload,
                });

            if (fnError) {
                console.warn('fetch-product function error:', fnError);
            }

            if (created) {
                // Be defensive about field names coming back from the Edge Function
                const createdImage =
                    created.image ??
                    created.image_url ??
                    created.product_image ??
                    created.product_image_url ??
                    null;

                return {
                    id: created.id ?? Date.now(),
                    user_id: created.user_id ?? userId,
                    list_id: created.list_id ?? listId,
                    name: created.name ?? post.name,
                    price: created.price ?? post.price,
                    image: createdImage ?? post.image,
                    link: created.link ?? post.link,
                    content: created.message ?? created.content ?? post.content,
                    isPublic: created.is_public ?? post.is_public,
                    isClaimed: created.is_claimed ?? post.is_claimed,
                    created_at: created.created_at ?? post.created_at,
                };
            }
        } catch (fnError) {
            console.warn('fetch-product invocation failed, using local placeholder:', fnError?.message || fnError);
        }

        // Fallback: if function fails, keep previous behavior so the UI still
        // shows a local placeholder card while backend work continues.
        return {
            id: Date.now(),
            user_id: userId,
            list_id: listId,
            name: post.name,
            price: post.price,
            image: post.image,
            link: post.link,
            content: post.content,
            isPublic: post.is_public,
            isClaimed: post.is_claimed,
            created_at: post.created_at,
        };
    } catch (error) {
        console.error('Error queuing product for webhook:', error);
        throw error;
    }
};

export const addManualProduct = async (productData, user) => {
    try {
        const userId = user.id || (await getUserIdByEmail(user.email));
        
        // Get default list
        const { data: lists } = await supabase.from('lists').select('id').eq('user_id', userId).limit(1);
        const listId = lists && lists.length > 0 ? lists[0].id : null;

        // Determine privacy: explicit override from productData or user's default setting
        let defaultPublic = false;
        try {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('default_posts_public')
                .eq('user_id', userId)
                .maybeSingle();
            if (settings && typeof settings.default_posts_public === 'boolean') {
                defaultPublic = settings.default_posts_public;
            }
        } catch (e) {
            console.warn('Could not load user default privacy setting for manual post, using private by default');
        }

        const isPublic = typeof productData.isPublic === 'boolean'
            ? productData.isPublic
            : defaultPublic;

        const { data, error } = await supabase
            .from('wishlist_posts')
            .insert({
                user_id: userId,
                list_id: listId,
                name: productData.name,
                price: productData.price,
                image: productData.image,
                link: productData.link || '',
                message: productData.content || null,
                is_public: isPublic,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding manual product:', error);
        throw error;
    }
};

export const deleteProduct = async (productUrl, userEmail, productId) => {
    try {
        const { error } = await supabase
            .from('wishlist_posts')
            .delete()
            .eq('id', productId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
};

export const claimGift = async (gift, claimer, recipient) => {
    try {
        // Directly update wishlist_posts; RPC for items is deprecated
        const { error } = await supabase
            .from('wishlist_posts')
            .update({
                is_claimed: true,
                claimed_by: claimer.id,
            })
            .eq('id', gift.id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error claiming gift:', error);
        throw error;
    }
};

/**
 * Stash (Copy) Post
 */
export const stashItem = async (originalPost, user) => {
    try {
        const userId = user.id || (await getUserIdByEmail(user.email));

        // Get user's default list
        const { data: lists } = await supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1);
            
        if (!lists || lists.length === 0) {
            throw new Error('No wishlist found to stash item into.');
        }
        const targetListId = lists[0].id;

        // Copy the post
        const { data, error } = await supabase
            .from('wishlist_posts')
            .insert({
                user_id: userId,
                list_id: targetListId,
                name: originalPost.name,
                price: originalPost.price,
                image: originalPost.image,
                link: originalPost.link,
                message: originalPost.content,
                is_public: originalPost.is_public || false,
                is_claimed: false, // Reset claim status
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error stashing item:', error);
        throw error;
    }
};

/**
 * Settings Services
 */
export const updateUserSettings = async (userId, settings) => {
    try {
        const { error } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, ...settings });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating settings:', error);
        return false;
    }
};

export const getUserSettings = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
            
        if (error) return null;
        return data;
    } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
    }
};

/**
 * Username helpers
 */
export const isUsernameAvailable = async (username, currentUserId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .neq('id', currentUserId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found for maybeSingle
            throw error;
        }

        // Available if no other row found
        return !data;
    } catch (error) {
        console.error('Error checking username availability:', error);
        return false;
    }
};

export const updateUsername = async (userId, username) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ username })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating username:', error);
        throw error;
    }
};

/**
 * Lightweight user search helpers for Add Friend / Messages flows
 */
export const searchUsersByUsernamePrefix = async (prefix, limit = 10) => {
    if (!prefix) return [];

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, username')
            .ilike('username', `${prefix}%`)
            .limit(limit);

        if (error) throw error;

        return (data || []).map(user => ({
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            displayName: user.first_name || user.last_name
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : user.username || (user.email ? user.email.split('@')[0] : ''),
        }));
    } catch (error) {
        console.error('Error searching users by username prefix:', error);
        return [];
    }
};

export const findUserByEmail = async (email) => {
    if (!email) return null;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, username')
            .eq('email', email)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            email: data.email,
            username: data.username,
            firstName: data.first_name,
            lastName: data.last_name,
        };
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
};
