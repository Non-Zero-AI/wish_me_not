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
const GET_USER_INFO_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/get-user-data';

export const fetchUserInfo = async (email) => {
    try {
        console.log('Fetching user info for:', email);
        const response = await axios.post(GET_USER_INFO_URL, { email });
        // Expecting response.data or response.data.output
        const data = response.data.output || response.data;
        console.log('Fetch User Info Response:', JSON.stringify(data, null, 2));
        
        // Handle array or single object
        const userData = Array.isArray(data) ? data[0] : data;
        
        if (!userData) return null;

        console.log('User Data Keys:', Object.keys(userData));

        const image = userData['User Avatar'] || userData.user_avatar || userData.profile_image || userData.image || userData.profile_image_url;
        console.log('Parsed User Image:', image);

        const firstName = userData['First Name'] || userData['first name'] || userData.first_name || userData.firstName || userData.name?.split(' ')[0];
        const lastName = userData['Last Name'] || userData['last name'] || userData.last_name || userData.lastName || userData.name?.split(' ')[1];

        return {
            firstName: firstName,
            lastName: lastName,
            email: userData['User Email'] || userData.email || email,
            image: image,
        };
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw error;
    }
};

export const updateUserProfile = async (user, imageUri) => {
    try {
        const formData = new FormData();
        formData.append('email', user.email);
        formData.append('first_name', user.firstName);
        formData.append('last_name', user.lastName);

        if (imageUri) {
            const isLocal = imageUri.startsWith('file://') || imageUri.startsWith('blob:') || imageUri.startsWith('data:');
            
            if (isLocal) {
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
            } else {
                 // It's a remote URL, pass it as string if backend supports it
                 formData.append('profile_image_url', imageUri);
            }
        }

        const response = await axios.post(UPLOAD_IMAGE_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

export const createUser = async (user) => {
    try {
        console.log('Creating user:', user);
        await axios.post(CREATE_USER_URL, user);
        return true;
    } catch (error) {
        console.error('Error creating user:', error);
        // Non-blocking error
        return false;
    }
};

export const sendFeedback = async (email, message) => {
    try {
        console.log('Sending feedback:', { email, message });
        await axios.post(SEND_FEEDBACK_URL, { 
            email, 
            feedback: message,
            timestamp: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error sending feedback:', error);
        throw error;
    }
};

export const getUserFriends = async (userEmail) => {
    try {
        console.log('Fetching friends list for:', userEmail);
        const response = await axios.post(GET_FRIENDS_URL, {
            user_email: userEmail
        });

        console.log('Get Friends Response:', JSON.stringify(response.data, null, 2));

        const data = response.data.output || response.data;
        
        // The response contains the USER'S row, with a "Friends" field containing emails
        // We need to extract these emails.
        let friendEmails = [];
        const rows = Array.isArray(data) ? data : [data];

        rows.forEach(row => {
            // Extract from "Friends" or "friends" column
            const friendsString = row.Friends || row.friends;
            if (friendsString && typeof friendsString === 'string') {
                // Split by comma and clean up
                const emails = friendsString.split(',').map(e => e.trim()).filter(e => e && e.includes('@'));
                friendEmails.push(...emails);
            }
        });

        // Deduplicate emails
        friendEmails = [...new Set(friendEmails)];
        console.log('Parsed Friend Emails:', friendEmails);

        if (friendEmails.length === 0) return [];

        // Now fetch details for EACH friend (Avatar, Name, Wishlist Count)
        // We use Promise.all to do this in parallel
        const friendsDetails = await Promise.all(friendEmails.map(async (email) => {
            try {
                // 1. Get User Data (Avatar, Name)
                const userInfo = await fetchUserInfo(email).catch(e => null);
                
                // 2. Get Wishlist (Count)
                const wishlist = await getUserWishlist(email).catch(e => []);

                // 3. Merge Info
                // Fallback name strategy: UserInfo -> Wishlist -> Email
                let name = email.split('@')[0];
                if (userInfo && userInfo.firstName) {
                    name = `${userInfo.firstName} ${userInfo.lastName || ''}`.trim();
                } else if (wishlist.length > 0 && wishlist[0].userName) {
                    name = wishlist[0].userName;
                }

                return {
                    id: email, // Use email as ID
                    email: email,
                    name: name,
                    image: userInfo ? userInfo.image : null, // From fetchUserInfo
                    itemCount: wishlist.length
                };
            } catch (e) {
                console.warn(`Failed to enrich friend ${email}`, e);
                return { id: email, email, name: email.split('@')[0] };
            }
        }));

        return friendsDetails;

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
