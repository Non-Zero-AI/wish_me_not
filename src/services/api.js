import axios from 'axios';

// Production webhooks
const WEBHOOK_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Wish_Me_Not';
const GET_WISHLIST_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Get_Product_Info';
const DELETE_ITEM_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Delete-Item';
const CREATE_USER_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/create_user';
const CLAIM_GIFT_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/claim_gift';
const GET_FRIENDS_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Get_Friends';
// Using the same endpoint as Delete-Item as per user request, assuming backend handles polymorphism
const DELETE_FRIEND_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Delete-Item'; 

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
        const response = await axios.post(GET_FRIENDS_URL, {
            user_email: userEmail
        });

        // Expecting response to contain a list of emails or a comma separated string
        // Adjust parsing based on actual webhook response structure
        const data = response.data;
        let friendEmails = [];

        if (data.friends) {
             if (typeof data.friends === 'string') {
                 friendEmails = data.friends.split(',').map(e => e.trim()).filter(e => e);
             } else if (Array.isArray(data.friends)) {
                 friendEmails = data.friends;
             }
        } else if (Array.isArray(data)) {
            // If it returns rows of friends
             friendEmails = data.map(f => f.friend_email || f.email).filter(e => e);
        }

        // Now fetch details for these emails? 
        // The prompt implies we just get the list.
        // But the UI needs names. 
        // We might need to iterate and fetch names or assume the Get_Friends returns names too.
        // For now, map to objects with email as name fallback
        return friendEmails.map(email => ({
            id: email,
            name: email.split('@')[0], // Placeholder name
            email: email
        }));

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
