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
                .from('items')
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

        // Fetch all items for the user, regardless of list
        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                claimer:claimed_by (first_name, last_name, email),
                list:list_id (title)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            link: item.link,
            isClaimed: item.is_claimed,
            claimedBy: item.claimer ? `${item.claimer.first_name} ${item.claimer.last_name}` : null,
            claimedByEmail: item.claimer ? item.claimer.email : null,
            listTitle: item.list?.title || 'Main',
            originalData: item 
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

        const payload = {
            url,
            user: userProfile,
            listId,
            message: message || null,
            source: Platform.OS === 'web' ? 'web' : 'native',
        };

        try {
            await axios.post('https://n8n.srv1023211.hstgr.cloud/webhook/Wish_Me_Not', payload);
        } catch (webhookError) {
            console.warn('Product webhook call failed:', webhookError?.message || webhookError);
        }

        // Return a minimal local item so the UI can show the text immediately
        const now = new Date().toISOString();
        return {
            id: Date.now(),
            user_id: userId,
            list_id: listId,
            name: message || 'New Item',
            price: 'Fetching details…',
            image: null,
            link: url,
            created_at: now,
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

        const { data, error } = await supabase
            .from('items')
            .insert({
                user_id: userId,
                list_id: listId,
                name: productData.name,
                price: productData.price,
                image: productData.image,
                link: productData.link || '',
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
            .from('items')
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
        const { data, error } = await supabase
            .rpc('claim_item', { item_id: gift.id });

        if (error) throw error;
        if (!data) throw new Error('Item already claimed or not found');
        
        return true;
    } catch (error) {
        console.error('Error claiming gift:', error);
        throw error;
    }
};

/**
 * Stash (Copy) Item
 */
export const stashItem = async (originalItem, user) => {
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

        // Copy the item
        const { data, error } = await supabase
            .from('items')
            .insert({
                user_id: userId,
                list_id: targetListId,
                name: originalItem.name,
                price: originalItem.price,
                image: originalItem.image,
                link: originalItem.link,
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
