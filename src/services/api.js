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
const GET_USER_INFO_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/get_user_info';

export const fetchUserInfo = async (email) => {
    try {
        console.log('Fetching user info for:', email);
        const response = await axios.post(GET_USER_INFO_URL, { email });
        // Expecting response.data or response.data.output
        const data = response.data.output || response.data;
        
        // Map response to app user structure
        // Handle array or single object
        const userData = Array.isArray(data) ? data[0] : data;
        
        if (!userData) return null;

        return {
            firstName: userData.first_name || userData.firstName,
            lastName: userData.last_name || userData.lastName,
            email: userData.email,
            image: userData.profile_image || userData.image || userData.profile_image_url,
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

        // Expecting response to contain a list of emails or objects
        const data = response.data.output || response.data; 
        let friendsList = [];

        const processItem = (item) => {
            if (typeof item === 'string') {
                // Handle comma/newline separation
                item.split(/[,\n]+/).forEach(email => {
                    const clean = email.trim();
                    if (clean && clean.includes('@')) {
                        friendsList.push({ email: clean });
                    }
                });
            } else if (typeof item === 'object' && item !== null) {
                const email = item.friends || item.Friends || item.friend_email || item.email;
                const image = item.profile_image || item.image || item.profile_image_url || item.avatar;
                const name = item.name || item.friend_name;

                if (email && typeof email === 'string') {
                    // Recursively handle string if it contains commas
                    if (email.includes(',') || email.includes('\n')) {
                        processItem(email); 
                    } else {
                        friendsList.push({ 
                            email: email.trim(), 
                            image: image,
                            name: name
                        });
                    }
                }
            }
        };

        if (Array.isArray(data)) {
            data.forEach(processItem);
        } else {
            processItem(data);
        }

        // Deduplicate by email
        const uniqueFriends = new Map();
        friendsList.forEach(f => {
            if (f.email && !uniqueFriends.has(f.email)) {
                uniqueFriends.set(f.email, f);
            }
        });

        const uniqueList = Array.from(uniqueFriends.values());
        console.log('Parsed Friends:', uniqueList);

        if (uniqueList.length === 0) {
             console.warn('No friends found in response data');
             return [];
        }

        // Enrich with details from wishlist (parallel)
        const friendsWithDetails = await Promise.all(uniqueList.map(async (friend) => {
            try {
                const wishlist = await getUserWishlist(friend.email);
                
                // Try to find a name from the items if not provided
                const friendName = friend.name || (wishlist.length > 0 ? wishlist[0].userName : null);
                
                return {
                    id: friend.email,
                    name: friendName || friend.email.split('@')[0], 
                    email: friend.email,
                    image: friend.image, // Pass through the image from Get_Friends
                    itemCount: wishlist.length
                };
            } catch (e) {
                console.warn(`Failed to fetch details for ${friend.email}`, e);
                return {
                    id: friend.email,
                    name: friend.name || friend.email.split('@')[0],
                    email: friend.email,
                    image: friend.image
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
