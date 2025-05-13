import React, { useState, useEffect } from 'react';
import styles from './PrivacySettings.module.css';

const PrivacySettings = () => {
  // Initial states for privacy settings
  const [settings, setSettings] = useState({
    showInSearch: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, success: false, error: null });

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');
        
        const response = await fetch('/api/settings/privacy', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load settings');
        }
        
        const data = await response.json();
        
        setSettings({
          showInSearch: data.privacySettings?.showInSearch ?? true
        });
      } catch (err) {
        console.error('Error fetching privacy settings:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Handle toggle and save to backend
  const handleToggle = async (setting) => {
    try {
      // Update local state immediately for responsive UI
      const newValue = !settings[setting];
      setSettings({
        ...settings,
        [setting]: newValue
      });
      
      // Indicate saving state
      setSaveStatus({ saving: true, success: false, error: null });
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');
      
      // Update setting in backend
      const response = await fetch('/api/settings/privacy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          privacySettings: {
            [setting]: newValue
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save setting');
      }
      
      // Show success feedback
      setSaveStatus({ saving: false, success: true, error: null });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, success: false }));
      }, 3000);
      
    } catch (err) {
      console.error('Error saving privacy setting:', err);
      
      // Revert local state if save failed
      setSettings({
        ...settings,
        [setting]: settings[setting]
      });
      
      // Show error feedback
      setSaveStatus({ saving: false, success: false, error: err.message });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, error: null }));
      }, 5000);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading settings...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Feedback Messages */}
      {saveStatus.saving && (
        <div className={styles.savingMessage}>Saving changes...</div>
      )}
      
      {saveStatus.success && (
        <div className={styles.successMessage}>Settings saved successfully!</div>
      )}
      
      {saveStatus.error && (
        <div className={styles.errorMessage}>Error: {saveStatus.error}</div>
      )}
      
      {/* Social Interactions Section */}
      <h2 className={styles.sectionTitle}>Social Interactions</h2>
      <div className={styles.settingsSection}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Show your account in search results</h3>
            <p className={styles.settingDescription}>When disabled, your profile won't appear when others search for you</p>
          </div>
          <div className={styles.settingAction}>
            <label className={styles.toggle}>
              <input 
                type="checkbox" 
                checked={settings.showInSearch}
                onChange={() => handleToggle('showInSearch')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;