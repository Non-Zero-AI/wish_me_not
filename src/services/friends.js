import { supabase } from '../lib/supabase';
import { sendNotification } from './notifications';

/**
 * Send a friend request to a user by email
 */
export const sendFriendRequest = async (currentUser, targetEmail) => {
  try {
    // 1. Find the user by email
    const { data: targetUser, error: findError } = await supabase
      .from('profiles')
      .select('id, first_name')
      .eq('email', targetEmail)
      .single();

    if (findError || !targetUser) {
      throw new Error('User not found');
    }

    if (targetUser.id === currentUser.id) {
      throw new Error('You cannot add yourself');
    }

    // 2. Check if friendship already exists
    const { data: existing } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${currentUser.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('You are already friends');
      } else {
        throw new Error('Friend request already pending');
      }
    }

    // 3. Create Friend Request
    // Note: In our schema, 'friends' table stores the relationship.
    // user_id is the requester, friend_id is the recipient.
    const { error: insertError } = await supabase
      .from('friends')
      .insert({
        user_id: currentUser.id,
        friend_id: targetUser.id,
        status: 'pending'
      });

    if (insertError) throw insertError;

    // 4. Send Notification
    const senderName = `${currentUser.user_metadata?.first_name || 'Someone'} ${currentUser.user_metadata?.last_name || ''}`.trim();
    await sendNotification(
      targetUser.id,
      'New Friend Request',
      `${senderName} wants to be friends with you!`,
      { type: 'friend_request', senderId: currentUser.id }
    );

    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (currentUser, requesterId) => {
  try {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', requesterId)
      .eq('friend_id', currentUser.id);

    if (error) throw error;

    // Notify the requester
    await sendNotification(
      requesterId,
      'Friend Request Accepted',
      `Your friend request was accepted!`,
      { type: 'friend_accepted', friendId: currentUser.id }
    );

    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

/**
 * Decline/Cancel a friend request
 */
export const declineFriendRequest = async (currentUser, requesterId) => {
  try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', requesterId)
      .eq('friend_id', currentUser.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

/**
 * Get pending requests
 */
export const getFriendRequests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        user_id,
        created_at,
        profiles:user_id (id, first_name, last_name, email, avatar_url)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data.map(r => ({
        ...r.profiles,
        requestDate: r.created_at
    }));
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
};
