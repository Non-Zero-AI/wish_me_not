import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@user_profile';
const ITEMS_KEY = '@wishlist_items';
const FRIENDS_KEY = '@friends_list';
const LOCAL_SETTINGS_KEY = '@local_settings';

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user', e);
  }
};

export const getUser = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(USER_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to fetch user', e);
    return null;
  }
};

export const clearUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Failed to clear user', e);
  }
};

export const saveFriends = async (friends) => {
  try {
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  } catch (e) {
    console.error('Failed to save friends', e);
  }
};

export const getFriends = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(FRIENDS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch friends', e);
    return [];
  }
};

export const addLocalFriend = async (friendEmail, friendName) => {
  try {
    const friends = await getFriends();
    if (!friends.some(f => f.email.toLowerCase() === friendEmail.trim().toLowerCase())) {
        const newFriend = {
            id: Date.now().toString(),
            email: friendEmail.trim(),
            name: friendName || friendEmail.split('@')[0]
        };
        const updatedFriends = [...friends, newFriend];
        await saveFriends(updatedFriends);
        return true;
    }
    return false; 
  } catch (e) {
    console.error('Failed to add local friend', e);
    return false;
  }
};

export const addItem = async (item) => {
  try {
    const existingItems = await getItems();
    // Add a unique ID to each item for easier deletion
    const newItem = { ...item, id: Date.now().toString() };
    const newItems = [newItem, ...existingItems];
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(newItems));
    return newItems;
  } catch (e) {
    console.error('Failed to add item', e);
    return [];
  }
};

export const getItems = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(ITEMS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch items', e);
    return [];
  }
};

export const deleteItem = async (itemId) => {
  try {
    const existingItems = await getItems();
    const newItems = existingItems.filter(item => item.id !== itemId);
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(newItems));
    return newItems;
  } catch (e) {
    console.error('Failed to delete item', e);
    return [];
  }
};

export const saveItems = async (items) => {
  try {
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items', e);
  }
};

export const getLocalSettings = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(LOCAL_SETTINGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : {};
  } catch (e) {
    console.error('Failed to fetch local settings', e);
    return {};
  }
};

export const saveLocalSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save local settings', e);
  }
};

export const clearLocalCache = async () => {
  try {
    await AsyncStorage.removeItem(ITEMS_KEY);
    await AsyncStorage.removeItem(FRIENDS_KEY);
  } catch (e) {
    console.error('Failed to clear local cache', e);
  }
};
