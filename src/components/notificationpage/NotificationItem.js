import React, { useState } from 'react';
import styles from './NotificationItem.module.css';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem = ({ notification, activeTab, onUpdate, currentUser }) => {
  // Track read status locally so we can update it instantly
  const [isRead, setIsRead] = useState(notification.read);
  const [showActions, setShowActions] = useState(false);

  // Format createdAt date to "time ago" format
  const timeAgo = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
    : '2h ago';

  // Toggle actions dropdown
  const toggleActions = () => {
    setShowActions(!showActions);
  };

  // Handle mark as read/unread
  const handleMarkReadUnread = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // If already read, we'll mark as unread; if unread, we'll mark as read
      const newReadStatus = !isRead;

      // Update local state immediately for UI refresh
      setIsRead(newReadStatus);

      const response = await fetch(`/api/notifications/${notification._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ read: newReadStatus })
      });

      if (response.ok) {
        // If marking as read, tell parent to remove this notification
        if (newReadStatus) {
          if (onUpdate) onUpdate('remove', notification._id);
        } else {
          // Just update notification status
          if (onUpdate) onUpdate('update');
        }
      } else {
        // If API request failed, revert the local state
        setIsRead(!newReadStatus);
      }
    } catch (error) {
      console.error('Error updating notification:', error);
      // Revert local state in case of error
      setIsRead(!isRead);
    }
  };

  // Handle Take Me button click
  const handleTakeMeClick = async (e) => {
    // Only mark as read if notification is currently unread
    if (!isRead) {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Update local state immediately
        setIsRead(true);

        const response = await fetch(`/api/notifications/${notification._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ read: true })
        });

        if (response.ok) {
          // Tell parent to update notification list
          if (onUpdate) onUpdate('remove', notification._id);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  // Handle delete notification
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notification._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Refresh notifications list
        if (onUpdate) onUpdate();
        setShowActions(false);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get color based on notification type, but return transparent if read
  const getBorderColor = () => {
    // If the notification is read, return transparent
    if (isRead) {
      return 'transparent';
    }

    // If a specific tab is active, use its color
    if (activeTab === 'unread') return '#ec4899'; // Pink
    if (activeTab === 'comments') return '#f97316'; // Orange
    if (activeTab === 'messages') return '#3b82f6'; // Blue
    if (activeTab === 'posts') return '#10b981'; // Green
    if (activeTab === 'contributions') return '#b91c1c'; // Brick Red 
    if (activeTab === 'likes') return '#3b82f6'; // Blue - Added for likes/votings tab

    // Otherwise use type-based colors
    switch (notification.type) {
      case 'reply': return '#f97316'; // Orange
      case 'message': return '#3b82f6'; // Blue
      case 'mention': return '#f43f5e'; // Red
      case 'like': return '#3b82f6'; // Blue
      case 'follow': return '#8b5cf6'; // Purple - Add color for follow
      case 'new_post': return '#10b981'; // Green
      case 'contribution': return '#b91c1c'; // Brick Red
      default: return 'transparent';
    }
  };

  const borderColor = getBorderColor();

  const borderStyle = {
    borderLeft: `5px solid ${borderColor}`
  };

  // Get appropriate action link based on notification type
  const getActionLink = () => {
    switch (notification.type) {
      case 'new_post':
        if (notification.onModel === 'CommunityPost') {
          return `/otheruserprofile/${encodeURIComponent(notification.senderUsername)}?id=${notification.sender}&tab=community`;
        }
        return `/discussion?id=${notification.relatedId}`;
      case 'reply':
        return `/discussion?id=${notification.relatedId}`;
      case 'follow':
        return `/otheruserprofile/${notification.senderUsername}`;
      case 'like':
        // For both post and comment votes, direct to the discussion page
        // For comment votes, the notification.relatedId is the comment ID
        // We need to extract the post ID from either:
        // 1. The notification.postId if it exists
        // 2. From the related comment's postId field (not available in frontend)

        // Check if the notification content is comment-related
        if (notification.content.includes('comment')) {
          // If the backend is properly updated to include postId, use it
          if (notification.postId) {
            return `/discussion?id=${notification.postId}`;
          }

          // Otherwise, try to fetch this information on the fly
          // This requires a special API route to look up a comment by ID
          // For now, redirect to a page where we'll handle the lookup

          // Instead of sending to home, send directly to the comment's post
          // Note: This relies on the backend storing the post ID correctly
          // with the comment

          // As a last resort, use the relatedId (comment ID) in a different way
          return `/api/redirect/comment/${notification.relatedId}`;
        }

        // For regular post votes, use the relatedId
        return `/discussion?id=${notification.relatedId}`;
      case 'message':
        return `/messages/${notification.sender}`;
      case 'contribution':
        if (notification.content.includes('approved your link contribution') ||
          notification.content.includes('declined your link contribution')) {
          return `/discussion?id=${notification.relatedId}`;
        } else {
          return `/currentprofile/${currentUser?.username || ''}?tab=contributions`;
        }
      default:
        return '/';
    }
  };

  return (
    <div
      className={`${styles.notificationItem} ${isRead ? '' : styles.unread}`}
      style={borderStyle}
    >
      <div className={styles.avatarContainer}>
        {/* This component only uses initials, but adding profile picture support */}
        {notification.senderProfilePicture && notification.senderProfilePicture !== '/profile-placeholder.jpg' ? (
          <Image
            src={notification.senderProfilePicture}
            alt={`${notification.senderUsername}'s profile`}
            width={40}
            height={40}
            className={styles.avatarImage}
            priority
            unoptimized
            key={notification.senderProfilePicture}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <span className={styles.avatarInitial}>
              {(notification.senderUsername || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.notificationHeader}>
          <span className={styles.username}>{notification.senderUsername}</span>
          <span className={styles.timestamp}>{timeAgo}</span>
        </div>

        <p className={styles.notificationText}>{notification.content}</p>

        <div className={styles.actionContainer}>
          {/* Show Take me button for all notification types including 'like' */}
          <div className={styles.takeAction}>
            <Link
              href={getActionLink()}
              className={styles.responseButton}
              onClick={handleTakeMeClick}
            >
              Take me
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.optionsContainer}>
        <button
          className={styles.optionsButton}
          onClick={toggleActions}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>

        {showActions && (
          <div className={styles.actionsDropdown}>
            <button
              className={styles.actionButton}
              onClick={handleMarkReadUnread}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Mark as {isRead ? 'unread' : 'read'}</span>
            </button>
            <button
              className={styles.actionButton}
              onClick={handleDelete}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;