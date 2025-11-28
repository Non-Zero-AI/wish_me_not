import axios from 'axios';

// Production webhooks
const WEBHOOK_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Wish_Me_Not';
const GET_WISHLIST_URL = 'https://n8n.srv1023211.hstgr.cloud/webhook/Get_Product_Info';

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
            }));
        }

        return [];
    } catch (error) {
        console.error('Error fetching user wishlist:', error);
        throw error;
    }
};
