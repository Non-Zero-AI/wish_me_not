import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userId) {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  if (userId) {
    await savePushToken(userId, token);
  }

  return token;
}

async function savePushToken(userId, token) {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({ 
        user_id: userId, 
        token: token, 
        platform: Platform.OS,
        updated_at: new Date()
      }, { onConflict: 'token' });

    if (error) console.error('Error saving push token:', error);
  } catch (e) {
    console.error('Exception saving push token:', e);
  }
}

export async function sendNotification(recipientId, title, body, data = {}) {
  try {
    // 1. Save to database (for in-app history)
    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: data.type || 'general',
      title,
      body,
      data,
    });

    // 2. Send Push Notification
    // NOTE: In a real production app, this should be done via a Supabase Edge Function
    // triggering off the database insert.
    // For now, we will fetch the recipient's token and send it client-side (less secure, but works for MVP)
    
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipientId);

    if (tokens && tokens.length > 0) {
      const messages = tokens.map(t => ({
        to: t.token,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
