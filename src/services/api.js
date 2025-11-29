import axios from 'axios';
import { Platform } from 'react-native';

// Production webhooks
const WEBHOOK_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Wish_Me_Not';
const GET_WISHLIST_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Get_Product_Info';
const DELETE_ITEM_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Delete-Item';
const CREATE_USER_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/create_user';
const CLAIM_GIFT_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/claim_gift';
const GET_FRIENDS_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Get_Friends';
const DELETE_FRIEND_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Delete-Item'; 
const UPLOAD_IMAGE_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/set_profile_image';

export const uploadProfileImage = async (userEmail, imageUri) => {
    try {
        const formData = new FormData();
        formData.append('email', userEmail);

        if (Platform.OS === 'web') {
            // For web, we need to fetch the blob and append it
            const res = await fetch(imageUri);
            const blob = await res.blob();
            formData.append('Image', blob, 'profile.jpg');
        } else {
            // For native
            const filename = imageUri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            
            formData.append('Image', {
                uri: imageUri,
                name: filename,
                type,
            });
        }

        const response = await axios.post(UPLOAD_IMAGE_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading profile image:', error);
        throw error;
    }
};

export const createUser = async (user) => {
    try {
        await axios.post(CREATE_USER_URL, {
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
        });
        return true;
    } catch (error) {
        console.error('Error creating user:', error);
        // Non-blocking error
        return false;
    }
};

export const getUserFriends = async (userEmail) => {
    try {
        console.log('Fetching friends for:', userEmail);
        const response = await axios.post(GET_FRIENDS_URL, {
            user_email: userEmail
        });

        console.log('Get Friends Raw Response:', JSON.stringify(response.data, null, 2));

        // Expecting response to contain a list of emails or a comma separated string
        // Handle potential n8n output wrapper
        const data = response.data.output || response.data; 
        let friendEmails = [];
        let rawValues = [];

        // Step 1: Extract potential values regardless of structure
        if (Array.isArray(data)) {
             // If array of rows, extract relevant columns (Case insensitive check)
             rawValues = data.map(row => row.friends || row.Friends || row.friend_email || row.email).filter(v => v);
        } else if (typeof data === 'object' && data !== null) {
             // If single object
             if (data.friends) rawValues.push(data.friends);
             if (data.Friends) rawValues.push(data.Friends);
        } else if (typeof data === 'string') {
             rawValues.push(data);
        }

        // Step 2: Normalize and Split (handle comma-separated strings mixed with arrays, and newlines)
        rawValues.forEach(val => {
            if (typeof val === 'string') {
                // Split by comma OR newline
                const parts = val.split(/[,\n]+/).map(e => e.trim());
                friendEmails.push(...parts);
            } else if (Array.isArray(val)) {
                // Nested array
                friendEmails.push(...val);
            }
        });

        // Step 3: Clean and Deduplicate
        friendEmails = [...new Set(friendEmails)]; // Remove duplicates
        friendEmails = friendEmails.filter(e => e && typeof e === 'string' && e.includes('@'));
        
        console.log('Parsed Friend Emails:', friendEmails);

        if (friendEmails.length === 0) {
             console.warn('No friends found in response data');
             return [];
        }

        // Enrich with details from wishlist (parallel)
        const friendsWithDetails = await Promise.all(friendEmails.map(async (email) => {
            try {
                // We reuse the existing getUserWishlist function
                const wishlist = await getUserWishlist(email);
                
                // Try to find a name from the items
                // getUserWishlist returns items with 'userName' property
                const friendName = wishlist.length > 0 ? wishlist[0].userName : null;
                
                return {
                    id: email,
                    name: friendName || email.split('@')[0], // Fallback to email prefix
                    email: email,
                    itemCount: wishlist.length
                };
            } catch (e) {
                console.warn(`Failed to fetch details for ${email}`, e);
                return {
                    id: email,
                    name: email.split('@')[0],
                    email: email
                };
            }
        }));

        return friendsWithDetails;

    } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
    }
};

export const claimGift = async (gift, claimer, recipient) => {
    try {
        await axios.post(CLAIM_GIFT_URL, {
            gift_name: gift.name,
            gift_url: gift.link,
            gift_id: gift.id,
            claimer_email: claimer.email,
            claimer_name: `${claimer.firstName} ${claimer.lastName}`,
            recipient_email: recipient.email,
            recipient_name: recipient.name || recipient.email // Fallback
        });
        return true;
    } catch (error) {
        console.error('Error claiming gift:', error);
        throw error;
    }
};

export const deleteFriend = async (userEmail, friendEmail) => {
    try {
        // TODO: Update with actual Delete Friend webhook URL if different
        await axios.post(DELETE_FRIEND_URL, {
            user_email: userEmail,
            friend_email: friendEmail
        });
        return true;
    } catch (error) {
        console.error('Error deleting friend:', error);
        throw error;
    }
};

export const addProduct = async (url, user) => {
    try {
        const response = await axios.post(WEBHOOK_URL, {
            url: url,
            user_name: `${user.firstName} ${user.lastName}`,
            user_email: user.email,
        });
        const data = response.data.output;
        return {
            name: data.product_name,
            price: data.product_price,
            image: data.product_image,
            link: data.product_url,
        };
    } catch (error) {
        console.error('Error adding product:', error);
        throw error;
    }
};

export const deleteProduct = async (productUrl, userEmail, productId) => {
    try {
        await axios.post(DELETE_ITEM_URL, {
            product_url: productUrl,
            user_email: userEmail,
            product_id: productId
        });
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        // We might want to throw, or just log, depending on if we want to block UI removal
        throw error;
    }
};

export const getUserWishlist = async (userEmail) => {
    try {
        const response = await axios.post(GET_WISHLIST_URL, {
            user_email: userEmail,
        });

        // The webhook returns an array of products directly
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(item => ({
                id: item.id || item.ID?.toString() || Date.now().toString(),
                name: item['Product Name'] || item.product_name || 'Unknown Product',
                price: item['Product Price'] ? `$${item['Product Price']}` : (item.product_price || 'Price not available'),
                image: item['Product Image'] || item.product_image,
                link: item['Product URL'] || item.product_url,
                wishedBy: item.wished_by || item.wishedBy || null,
                userName: item.user_name || item['User Name'] || null,
                isClaimed: item['Is Claimed'] === true || item['Is Claimed'] === 'true' || item.is_claimed === true || item.is_claimed === 'true',
                claimedBy: item['Claimed By'] || item.claimed_by || null,
            }));
        }

        return [];
    } catch (error) {
        console.error('Error fetching user wishlist:', error);
        throw error;
    }
};
