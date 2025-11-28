import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@user_profile';
const ITEMS_KEY = '@wishlist_items';

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
