import React, { useState, useEffect } from 'react';
import styles from './NotificationSettings.module.css';

const NotificationSettings = () => {
  // Get settings from API and handle loading state
  const [settings, setSettings] = useState({
    activityOnPost: true,
    newFollowers: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/settings/notification', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSettings({
            activityOnPost: data.notificationSettings?.postComments ?? true,
            newFollowers: data.notificationSettings?.newFollowers ?? true
          });
        }
      } catch (error) {
        console.error('Error fetching notification settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // Toggle handler with API update
  const handleToggle = async (setting) => {
    setIsLoading(true);
    setMessage(null);

    const newValue = !settings[setting];

    // Update UI immediately for better UX
    setSettings({
      ...settings,
      [setting]: newValue
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      // Map component setting names to API setting names
      const settingMap = {
        activityOnPost: 'postComments',
        newFollowers: 'newFollowers'
      };

      const apiSetting = settingMap[setting];

      // Prepare the update payload
      const payload = {
        notificationSettings: {
          [apiSetting]: newValue
        }
      };

      const response = await fetch('/api/settings/notification', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      setMessage({ type: 'success', text: 'Setting updated successfully' });
    } catch (error) {
      console.error('Error updating notification setting:', error);
      setMessage({ type: 'error', text: 'Failed to update setting' });

      // Revert UI if the API call failed
      setSettings({
        ...settings,
        [setting]: !newValue
      });
    } finally {
      setIsLoading(false);

      // Clear success message after 3 seconds
      if (message?.type === 'success') {
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Activity Section */}
      <h2 className={styles.sectionTitle}>Activity</h2>
      <div className={styles.settingsSection}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Activity on your post</h3>
            <p className={styles.settingDescription}>
              All activity notifications for your posts, comments, votes, and contributions.
              When disabled, you will only receive notifications about new followers.
            </p>
            {message && (
              <p className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </p>
            )}
          </div>
          <div className={styles.settingAction}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.activityOnPost}
                onChange={() => handleToggle('activityOnPost')}
                disabled={isLoading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>New Followers</h3>
            <p className={styles.settingDescription}>When someone new follows you</p>
          </div>
          <div className={styles.settingAction}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.newFollowers}
                onChange={() => handleToggle('newFollowers')}
                disabled={isLoading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;