// src/lib/notifications.js
import dbConnect from '@/lib/mongoose';
import Notification from '@/models/Notification';

/**
 * Create a notification for a user
 */
export async function createNotification(notificationData) {
  try {
    await dbConnect();
    
    console.log('Creating notification:', JSON.stringify(notificationData, null, 2));
    
    const notification = new Notification({
      userId: notificationData.userId,
      type: notificationData.type,
      content: notificationData.content,
      sender: notificationData.sender,
      senderUsername: notificationData.senderUsername,
      relatedId: notificationData.relatedId,
      onModel: notificationData.onModel,
      thumbnail: notificationData.thumbnail
    });
    
    await notification.save();
    console.log('Notification created successfully with ID:', notification._id);
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
}

/**
 * Get notification counts for a user
 */
export async function getNotificationCounts(userId) {
  try {
    await dbConnect();
    
    const counts = {
      all: await Notification.countDocuments({ userId }),
      unread: await Notification.countDocuments({ userId, read: false }),
      comments: await Notification.countDocuments({ userId, type: 'reply' }),
      messages: await Notification.countDocuments({ userId, type: 'message' }),
      posts: await Notification.countDocuments({ userId, type: 'new_post' })
    };
    
    return counts;
  } catch (error) {
    console.error('Get notification counts error:', error);
    throw error;
  }
}